#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";

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

function monthKey(value) {
  return value.toISOString().slice(0, 7);
}

function parseEnvFile(raw) {
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      }),
  );
}

function loadAuthSessionSecret() {
  if (process.env.AUTH_SESSION_SECRET) return process.env.AUTH_SESSION_SECRET;
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;

  const root = process.cwd();
  for (const fileName of [".env.local", ".env.production", ".env"]) {
    const fullPath = path.join(root, fileName);
    if (!fs.existsSync(fullPath)) continue;
    const parsed = parseEnvFile(fs.readFileSync(fullPath, "utf8"));
    if (parsed.AUTH_SESSION_SECRET) return parsed.AUTH_SESSION_SECRET;
    if (parsed.NEXTAUTH_SECRET) return parsed.NEXTAUTH_SECRET;
  }
  return null;
}

function signSessionToken(email, secret) {
  const now = Date.now();
  const payload = {
    v: 1,
    email: email.toLowerCase(),
    iat: now,
    exp: now + 7 * 24 * 60 * 60 * 1000,
  };

  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function extractAllMatches(input, regex) {
  const values = [];
  let match = regex.exec(input);
  while (match) {
    values.push(match[1]);
    match = regex.exec(input);
  }
  return values;
}

class Session {
  constructor() {
    this.cookies = new Map();
  }

  setCookie(key, value) {
    this.cookies.set(key, value);
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

  async request(pathname, init = {}) {
    const headers = new Headers(init.headers ?? {});
    const cookie = this.cookieHeader();
    if (cookie) headers.set("cookie", cookie);

    const res = await fetch(`${baseUrl}${pathname}`, {
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

async function expectStatus(pathname, expectedStatuses, init = {}, label = pathname) {
  const res = await fetch(`${baseUrl}${pathname}`, { ...init, redirect: "manual" });
  const ok = expectedStatuses.includes(res.status);
  recordCheck(label, ok, `status=${res.status}`);
  return res;
}

async function expectSessionStatus(session, pathname, expectedStatuses, init = {}, label = pathname) {
  const res = await session.request(pathname, init);
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

function createSignedSession(email, secret) {
  const session = new Session();
  session.setCookie("if_user", email.toLowerCase());
  session.setCookie("if_session", signSessionToken(email, secret));
  return session;
}

async function runRoleChecks(studentSession, coordinatorSession, hqSession) {
  await expectSessionStatus(studentSession, "/app/student", [200], {}, "student dashboard");
  await expectSessionStatus(
    studentSession,
    "/api/org/futureskills-institute/notifications",
    [403],
    { method: "POST", body: new URLSearchParams() },
    "student blocked from coordinator notifications API",
  );
  await expectSessionStatus(
    studentSession,
    "/api/org/futureskills-institute/exports/foundation",
    [403],
    {},
    "student blocked from export foundation API",
  );

  const marker = `UAT logbook marker ${Date.now()} seeded`;
  const logbookRes = await studentSession.request("/api/logbook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      orgSlug: "futureskills-institute",
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

  const logbooksPage = await coordinatorSession.request("/org/futureskills-institute/app/logbooks");
  const logbooksHtml = await logbooksPage.text();
  recordCheck(
    "coordinator logbook page includes submitted entry",
    logbooksPage.status === 200 && logbooksHtml.includes(marker),
    `status=${logbooksPage.status}`,
  );

  if (logbookEntryId) {
    await expectSessionStatus(
      coordinatorSession,
      `/api/org/futureskills-institute/logbooks/${logbookEntryId}/approval`,
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

  const stipendPage = await coordinatorSession.request("/org/futureskills-institute/app/stipends");
  const stipendHtml = await stipendPage.text();
  recordCheck("stipends page loads for coordinator", stipendPage.status === 200, `status=${stipendPage.status}`);

  const stipendEnrollmentMatch = stipendHtml.match(/action="\/api\/enrollments\/([^/"]+)\/stipend"/i);
  const stipendEnrollmentId = stipendEnrollmentMatch?.[1] ?? null;
  recordCheck(
    "stipend enrollment target discovered",
    Boolean(stipendEnrollmentId),
    stipendEnrollmentId ? `enrollmentId=${stipendEnrollmentId}` : "missing enrollment action",
  );

  const currentMonth = monthKey(new Date());
  if (stipendEnrollmentId) {
    await expectSessionStatus(
      coordinatorSession,
      `/api/enrollments/${stipendEnrollmentId}/stipend`,
      [302, 303, 307, 308],
      {
        method: "POST",
        body: new URLSearchParams({
          month: currentMonth,
          eligible: "true",
          paymentStatus: "PAID",
          stipendAmount: "1200",
          exceptionReason: "",
        }),
      },
      "stipend payment state update",
    );

    const stipendCsv = await coordinatorSession.request("/api/org/futureskills-institute/exports/stipend.csv");
    const stipendCsvBody = await stipendCsv.text();
    recordCheck(
      "stipend export reflects updated month",
      stipendCsv.status === 200 && stipendCsvBody.includes(currentMonth),
      `status=${stipendCsv.status}`,
    );

    await expectSessionStatus(
      coordinatorSession,
      `/api/enrollments/${stipendEnrollmentId}/status`,
      [200, 302, 303, 307, 308],
      { method: "POST", body: new URLSearchParams({ status: "COMPLETED" }) },
      "enrollment transitioned to COMPLETED",
    );

    const followUpsRes = await coordinatorSession.request("/api/org/futureskills-institute/follow-ups");
    const followUpsPayload = await asJsonSafe(followUpsRes);
    const followUpRecords = Array.isArray(followUpsPayload?.records)
      ? followUpsPayload.records
      : [];
    recordCheck(
      "follow-up records available",
      followUpsRes.status === 200 && followUpRecords.length > 0,
      `status=${followUpsRes.status}; records=${followUpRecords.length}`,
    );

    const followUpTarget =
      followUpRecords.find((record) => record.enrollmentId === stipendEnrollmentId) ??
      followUpRecords[0] ??
      null;
    recordCheck(
      "follow-up target selected",
      Boolean(followUpTarget?.id),
      followUpTarget?.id ? `recordId=${followUpTarget.id}` : "no follow-up target",
    );

    if (followUpTarget?.id) {
      await expectSessionStatus(
        coordinatorSession,
        "/api/org/futureskills-institute/follow-ups",
        [302, 303, 307, 308],
        {
          method: "POST",
          body: new URLSearchParams({
            recordId: followUpTarget.id,
            status: "COMPLETED",
            outcome: "EMPLOYED",
            outcomeNotes: "Seeded UAT completion",
          }),
        },
        "follow-up completion update",
      );

      const followUpsVerifyRes = await coordinatorSession.request("/api/org/futureskills-institute/follow-ups");
      const followUpsVerifyPayload = await asJsonSafe(followUpsVerifyRes);
      const updatedRecord = Array.isArray(followUpsVerifyPayload?.records)
        ? followUpsVerifyPayload.records.find((record) => record.id === followUpTarget.id)
        : null;
      recordCheck(
        "follow-up completion persisted",
        followUpsVerifyRes.status === 200 &&
          updatedRecord?.status === "COMPLETED" &&
          updatedRecord?.outcome === "EMPLOYED",
        `status=${followUpsVerifyRes.status}`,
      );

      if (followUpTarget.programId) {
        await expectSessionStatus(
          coordinatorSession,
          "/api/org/futureskills-institute/certificates/policy",
          [302, 303, 307, 308],
          {
            method: "POST",
            body: new URLSearchParams({
              programId: String(followUpTarget.programId),
              releaseRule: "AFTER_3_MONTHS",
            }),
          },
          "certificate delayed-release policy update",
        );
      }

      const certIssueRes = await coordinatorSession.request(
        "/api/org/futureskills-institute/certificates/issue?response=json",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            enrollmentId: stipendEnrollmentId,
            managerName: "MVP UAT Manager",
            signature: "MVP UAT Manager",
            tenantName: "FutureSkills Institute",
          }),
        },
      );
      const certIssuePayload = await asJsonSafe(certIssueRes);
      const certDocumentId = certIssuePayload?.documentId ?? null;
      recordCheck(
        "certificate issue API",
        certIssueRes.status === 200 && certIssuePayload?.ok === true && Boolean(certIssuePayload?.certificateId),
        `status=${certIssueRes.status}`,
      );

      if (certDocumentId) {
        const certDownload = await coordinatorSession.request(
          `/api/org/futureskills-institute/certificates/${certDocumentId}/download`,
        );
        recordCheck(
          "certificate download by coordinator",
          certDownload.status === 200 &&
            (certDownload.headers.get("content-type") ?? "").includes("application/pdf"),
          `status=${certDownload.status}`,
        );
      }
    }
  }

  const foundationRes = await coordinatorSession.request("/api/org/futureskills-institute/exports/foundation");
  const foundationPayload = await asJsonSafe(foundationRes);
  const programmeIds = Array.isArray(foundationPayload?.programmes)
    ? foundationPayload.programmes.map((programme) => programme.id)
    : [];
  recordCheck(
    "export foundation summary",
    foundationRes.status === 200 &&
      foundationPayload?.ok === true &&
      Number(foundationPayload?.summary?.programmes ?? 0) > 0,
    `status=${foundationRes.status}`,
  );

  const exportsPage = await coordinatorSession.request("/org/futureskills-institute/app/reports/exports");
  const exportsHtml = await exportsPage.text();
  recordCheck("exports page loads", exportsPage.status === 200, `status=${exportsPage.status}`);

  const optionValues = extractAllMatches(exportsHtml, /<option[^>]*value="([^"]+)"/gi);
  const templateId =
    optionValues.find((value) => value && !programmeIds.includes(value)) ?? null;
  const programmeId = programmeIds[0] ?? null;

  recordCheck(
    "closeout generation inputs discovered",
    Boolean(programmeId && templateId),
    `programmeId=${programmeId ?? "n/a"}; templateId=${templateId ?? "n/a"}`,
  );

  if (programmeId && templateId) {
    const createCloseoutRes = await coordinatorSession.request("/api/org/futureskills-institute/exports/closeout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ programmeId, exportTemplateId: templateId }),
    });
    const closeoutPayload = await asJsonSafe(createCloseoutRes);
    const queuedJobId = closeoutPayload?.jobId ?? null;
    recordCheck(
      "closeout export generation request",
      createCloseoutRes.status === 200 && closeoutPayload?.ok === true && Boolean(queuedJobId),
      `status=${createCloseoutRes.status}`,
    );

    if (queuedJobId) {
      const closeoutStatusRes = await coordinatorSession.request(
        `/api/org/futureskills-institute/exports/closeout?jobId=${queuedJobId}`,
      );
      const closeoutStatusPayload = await asJsonSafe(closeoutStatusRes);
      const jobStatus = closeoutStatusPayload?.job?.status;
      recordCheck(
        "closeout export job status available",
        closeoutStatusRes.status === 200 &&
          ["QUEUED", "RUNNING", "DONE", "FAILED"].includes(String(jobStatus)),
        `status=${closeoutStatusRes.status}; jobStatus=${jobStatus ?? "n/a"}`,
      );
    }

    await expectSessionStatus(
      studentSession,
      "/api/org/futureskills-institute/exports/closeout",
      [403],
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ programmeId, exportTemplateId: templateId }),
      },
      "student blocked from closeout export generation",
    );
  }

  await expectSessionStatus(hqSession, "/hq/dashboard", [200], {}, "hq dashboard");
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(`Running seeded MVP UAT against ${baseUrl}`);

  await expectStatus("/", [200], {}, "public home");
  await expectStatus("/auth", [200, 302, 303, 307, 308], {}, "auth entry");
  await expectStatus("/auth/login", [200], {}, "auth login");
  await expectStatus("/student-sign-up", [200], {}, "student signup page");
  await expectStatus("/register-organization", [200], {}, "organization register page");
  await expectStatus("/does-not-exist", [404], {}, "custom 404");

  await expectStatus("/app/student", [302, 303, 307, 308], {}, "protected student redirect");
  await expectStatus("/hq/dashboard", [302, 303, 307, 308], {}, "protected HQ redirect");
  await expectStatus("/api/org/futureskills-institute/exports/closeout", [401], {}, "unauth export blocked");

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
  let studentSession = null;
  let coordinatorSession = null;
  let hqSession = null;

  if (demoProbe.res.status === 200 && demoProbe.payload?.ok === true) {
    recordCheck("demo login availability", true, "enabled");
    studentSession = demoProbe.session;

    const coordinatorLogin = await loginDemo("coordinator@demo.com");
    recordCheck(
      "coordinator login",
      coordinatorLogin.res.status === 200 && coordinatorLogin.payload?.ok === true,
      `status=${coordinatorLogin.res.status}`,
    );
    coordinatorSession = coordinatorLogin.session;

    const hqLogin = await loginDemo("admin@internflow.com");
    recordCheck(
      "hq admin login",
      hqLogin.res.status === 200 && hqLogin.payload?.ok === true,
      `status=${hqLogin.res.status}`,
    );
    hqSession = hqLogin.session;
  } else {
    const secret = loadAuthSessionSecret();
    if (!secret) {
      recordCheck(
        "seeded auth bootstrap fallback",
        false,
        "Demo login disabled and AUTH_SESSION_SECRET/NEXTAUTH_SECRET unavailable for signed-session fallback.",
      );
    } else {
      warnings.push(
        "Demo login disabled; using signed-session seeded fallback for role workflow checks.",
      );
      recordCheck("seeded auth bootstrap fallback", true, "signed session cookies");
      studentSession = createSignedSession("student@demo.com", secret);
      coordinatorSession = createSignedSession("coordinator@demo.com", secret);
      hqSession = createSignedSession("admin@internflow.com", secret);
    }
  }

  if (studentSession && coordinatorSession && hqSession) {
    await runRoleChecks(studentSession, coordinatorSession, hqSession);
  } else {
    warnings.push("Role-based deep checks were skipped because session bootstrap failed.");
  }

  // eslint-disable-next-line no-console
  console.log(`\nSummary: ${checks.filter((check) => check.ok).length}/${checks.length} checks passed.`);
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
