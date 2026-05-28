#!/usr/bin/env node

const argBaseUrl = process.argv.find((arg) => arg.startsWith("--base-url="));
const baseUrl = (argBaseUrl ? argBaseUrl.split("=")[1] : "http://localhost:3000").replace(/\/+$/, "");

const failures = [];
const warnings = [];
const checks = [];

function recordCheck(name, ok, detail) {
  checks.push({ name, ok, detail });
  const prefix = ok ? "PASS" : "FAIL";
  // eslint-disable-next-line no-console
  console.log(`[${prefix}] ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) failures.push({ name, detail });
}

class Session {
  constructor() {
    this.cookies = new Map();
  }

  cookieHeader() {
    if (!this.cookies.size) return "";
    return Array.from(this.cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }

  mergeSetCookie(headers) {
    const raw = typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie")
        ? [headers.get("set-cookie")]
        : [];

    for (const item of raw) {
      const first = String(item ?? "").split(";")[0]?.trim();
      if (!first || !first.includes("=")) continue;
      const idx = first.indexOf("=");
      const key = first.slice(0, idx);
      const value = first.slice(idx + 1);
      this.cookies.set(key, value);
    }
  }

  async request(path, init = {}) {
    const headers = new Headers(init.headers ?? {});
    const cookie = this.cookieHeader();
    if (cookie) headers.set("cookie", cookie);

    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      redirect: "manual",
    });
    this.mergeSetCookie(res.headers);
    return res;
  }
}

async function asJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function expectStatus(path, expectedStatuses, init = {}, label = path) {
  const res = await fetch(`${baseUrl}${path}`, { ...init, redirect: "manual" });
  const ok = expectedStatuses.includes(res.status);
  recordCheck(label, ok, `status=${res.status}`);
  return res;
}

async function expectSessionStatus(session, path, expectedStatuses, init = {}, label = path) {
  const res = await session.request(path, init);
  const ok = expectedStatuses.includes(res.status);
  recordCheck(label, ok, `status=${res.status}`);
  return res;
}

async function loginDemo(email) {
  const session = new Session();
  const res = await session.request("/api/auth/demo-login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return { session, res, payload: await asJsonSafe(res) };
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(`Running seeded MVP UAT against ${baseUrl}`);

  await expectStatus("/", [200], {}, "public home");
  await expectStatus("/auth/login", [200], {}, "auth login");
  await expectStatus("/student-sign-up", [200], {}, "student signup page");
  await expectStatus("/register-organization", [200], {}, "organization register page");
  await expectStatus("/does-not-exist", [404], {}, "custom 404");

  await expectStatus("/app/student", [302, 303, 307, 308], {}, "protected student redirect");
  await expectStatus("/hq/dashboard", [302, 303, 307, 308], {}, "protected HQ redirect");
  await expectStatus("/api/org/raftech/exports/closeout", [401], {}, "unauth export blocked");

  const signupEmail = `mvp-uat-${Date.now()}@example.com`;
  const signupRes = await fetch(`${baseUrl}/api/auth/student-signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fullName: "MVP UAT Student", email: signupEmail }),
    redirect: "manual",
  });
  const signupPayload = await asJsonSafe(signupRes);
  recordCheck(
    "student signup API",
    signupRes.status === 200 && signupPayload?.ok === true,
    `status=${signupRes.status}`,
  );

  const contactRes = await fetch(`${baseUrl}/api/public/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "MVP UAT",
      email: `mvp-contact-${Date.now()}@example.com`,
      message: "Seeded UAT contact flow check.",
      phone: "0826478408",
      topic: "MVP UAT",
      intent: "demo",
      source: "mvp-seeded-uat",
    }),
    redirect: "manual",
  });
  const contactPayload = await asJsonSafe(contactRes);
  recordCheck(
    "public contact API",
    contactRes.status === 200 && contactPayload?.ok === true && Boolean(contactPayload?.ticketId),
    `status=${contactRes.status}`,
  );

  const demoProbe = await loginDemo("student@demo.com");
  if (demoProbe.res.status === 404) {
    warnings.push("Demo login disabled; role-based seeded checks were skipped.");
    recordCheck("demo login availability", true, "disabled (expected for hardened prod-like mode)");
  } else {
    recordCheck(
      "demo login availability",
      demoProbe.res.status === 200 && demoProbe.payload?.ok === true,
      `status=${demoProbe.res.status}`,
    );

    const studentSession = demoProbe.session;
    await expectSessionStatus(studentSession, "/app/student", [200], {}, "student dashboard");
    await expectSessionStatus(
      studentSession,
      "/api/org/raftech/notifications",
      [403],
      { method: "POST", body: new URLSearchParams() },
      "student blocked from coordinator notifications API",
    );

    const marker = `UAT logbook marker ${Date.now()} seeded`;
    const logbookRes = await studentSession.request("/api/logbook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgSlug: "raftech",
        weekStart: new Date().toISOString().slice(0, 10),
        summary: marker,
      }),
    });
    const logbookPayload = await asJsonSafe(logbookRes);
    const logbookEntryId = logbookPayload?.entryId;
    recordCheck(
      "student logbook submit",
      logbookRes.status === 200 && logbookPayload?.ok === true && Boolean(logbookEntryId),
      `status=${logbookRes.status}`,
    );

    const coordinatorLogin = await loginDemo("coordinator@demo.com");
    recordCheck(
      "coordinator login",
      coordinatorLogin.res.status === 200 && coordinatorLogin.payload?.ok === true,
      `status=${coordinatorLogin.res.status}`,
    );
    const coordinatorSession = coordinatorLogin.session;

    const logbooksPage = await coordinatorSession.request("/org/raftech/app/logbooks");
    const logbooksHtml = await logbooksPage.text();
    recordCheck(
      "coordinator logbook page includes submitted entry",
      logbooksPage.status === 200 && logbooksHtml.includes(marker),
      `status=${logbooksPage.status}`,
    );

    if (logbookEntryId) {
      await expectSessionStatus(
        coordinatorSession,
        `/api/org/raftech/logbooks/${logbookEntryId}/approval`,
        [302, 303, 307, 308],
        {
          method: "POST",
          body: new URLSearchParams({ status: "APPROVED", comment: "UAT approval" }),
        },
        "coordinator can approve tenant-bound logbook",
      );

      await expectSessionStatus(
        coordinatorSession,
        `/api/org/demo-training-provider/logbooks/${logbookEntryId}/approval`,
        [403, 404],
        {
          method: "POST",
          body: new URLSearchParams({ status: "APPROVED", comment: "Cross-tenant attempt" }),
        },
        "cross-tenant logbook approval blocked",
      );
    }

    const hqLogin = await loginDemo("admin@internflow.com");
    recordCheck(
      "hq admin login",
      hqLogin.res.status === 200 && hqLogin.payload?.ok === true,
      `status=${hqLogin.res.status}`,
    );
    await expectSessionStatus(hqLogin.session, "/hq/dashboard", [200], {}, "hq dashboard");
  }

  // eslint-disable-next-line no-console
  console.log(`\nSummary: ${checks.filter((c) => c.ok).length}/${checks.length} checks passed.`);
  if (warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.log("Warnings:");
    for (const warning of warnings) {
      // eslint-disable-next-line no-console
      console.log(` - ${warning}`);
    }
  }

  if (failures.length > 0) {
    // eslint-disable-next-line no-console
    console.log("Failures:");
    for (const failure of failures) {
      // eslint-disable-next-line no-console
      console.log(` - ${failure.name}${failure.detail ? ` :: ${failure.detail}` : ""}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Seeded MVP UAT failed to run:", error);
  process.exit(1);
});
