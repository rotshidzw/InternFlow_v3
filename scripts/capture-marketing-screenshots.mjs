#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const viewport = { width: 1600, height: 1000 };
const outputDir = path.join(process.cwd(), "apps", "web", "public", "marketing", "screenshots");
const manifestPath = path.join(outputDir, "manifest.json");

const roleAccounts = {
  public: null,
  student: "student@demo.com",
  coordinator: "coordinator@demo.com",
  provider: "provider@demo.com",
  hq: "admin@internflow.com",
};

const captures = [
  {
    file: "homepage-landing.png",
    portal: "Public homepage / landing page",
    role: "public",
    route: "/",
    waitFor: "section#product",
  },
  {
    file: "student-dashboard.png",
    portal: "Student portal/dashboard",
    role: "student",
    route: "/app/student",
    waitFor: "text=Student Dashboard",
  },
  {
    file: "student-support-discussions.png",
    portal: "Student support/discussions page",
    role: "student",
    route: "/app/whatsapp-sim",
    waitFor: "text=Discussion thread",
  },
  {
    file: "provider-tenant-dashboard.png",
    portal: "Provider / tenant dashboard",
    role: "coordinator",
    route: "/org/futureskills-institute/app/dashboard",
    waitFor: "text=Programme Operations Home",
  },
  {
    file: "coordinator-dashboard.png",
    portal: "Coordinator dashboard / operational home",
    role: "coordinator",
    route: "/org/futureskills-institute/coordinator",
    waitFor: "text=Learner directory",
  },
  {
    file: "learners-management.png",
    portal: "Learners management page",
    role: "coordinator",
    route: "/org/futureskills-institute/app/learners",
    waitFor: "text=Learner directory",
  },
  {
    file: "applicants-management.png",
    portal: "Applicants management page",
    role: "coordinator",
    route: "/org/futureskills-institute/app/applicants",
    waitFor: "text=Applicants pipeline",
  },
  {
    file: "documents-evidence.png",
    portal: "Documents / evidence management page",
    role: "coordinator",
    route: "/org/futureskills-institute/app/documents",
    waitFor: "text=Document Vault + Review Workflow",
  },
  {
    file: "registers-attendance.png",
    portal: "Registers / attendance area",
    role: "coordinator",
    route: "/org/futureskills-institute/app/registers",
    waitFor: "text=Attendance & Registers",
  },
  {
    file: "logbooks-operations.png",
    portal: "Logbooks area",
    role: "coordinator",
    route: "/org/futureskills-institute/app/logbooks",
    waitFor: "text=Logbooks",
  },
  {
    file: "stipend-finance.png",
    portal: "Stipends / finance-related area",
    role: "coordinator",
    route: "/org/futureskills-institute/app/stipends",
    waitFor: "text=Stipends",
  },
  {
    file: "certificates-followup.png",
    portal: "Certificates / follow-up area",
    role: "coordinator",
    route: "/org/futureskills-institute/app/certificates",
    waitFor: "text=Certificate",
  },
  {
    file: "followup-outcomes.png",
    portal: "Follow-up outcomes area",
    role: "coordinator",
    route: "/org/futureskills-institute/app/follow-ups",
    waitFor: "text=Follow-up",
  },
  {
    file: "messages-inbox.png",
    portal: "Messaging / communication view",
    role: "coordinator",
    route: "/org/futureskills-institute/app/learner-chat",
    waitFor: "text=Coordinator learner chat",
  },
  {
    file: "provider-admin-workspace.png",
    portal: "Provider admin workspace",
    role: "coordinator",
    route: "/org/futureskills-institute/provider-admin",
    waitFor: "text=Delivery management workspace",
  },
  {
    file: "hq-dashboard.png",
    portal: "HQ / internal dashboard",
    role: "hq",
    route: "/hq/dashboard",
    waitFor: "text=Platform command center",
  },
  {
    file: "hq-approvals.png",
    portal: "HQ / approvals page",
    role: "hq",
    route: "/hq/approvals",
    waitFor: "text=Approvals",
  },
  {
    file: "hq-support-inbox.png",
    portal: "HQ support / inbox",
    role: "hq",
    route: "/hq/support",
    waitFor: "text=Support",
  },
];

async function ensureOutputDir() {
  await fs.mkdir(outputDir, { recursive: true });
}

async function createRoleSession(browser, role) {
  const context = await browser.newContext({
    viewport,
    colorScheme: "dark",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const email = roleAccounts[role];

  if (!email) return { context, page, role, email: null, loginRedirect: null };

  const res = await context.request.post(`${baseUrl}/api/auth/demo-login`, {
    data: { email },
  });
  const payload = await res.json().catch(() => null);

  if (res.status() !== 200 || payload?.ok !== true) {
    throw new Error(
      `Demo login failed for role "${role}" (${email}). status=${res.status()}`,
    );
  }

  if (typeof payload.redirectTo === "string" && payload.redirectTo.length > 0) {
    await page.goto(`${baseUrl}${payload.redirectTo}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  }

  if (role === "coordinator") {
    await page.goto(`${baseUrl}/workspaces/open/futureskills-institute`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  }

  if (role === "provider") {
    await page.goto(`${baseUrl}/workspaces/open/demo-training-provider`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  }

  return {
    context,
    page,
    role,
    email,
    loginRedirect: payload.redirectTo ?? null,
  };
}

async function main() {
  await ensureOutputDir();

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });

  const sessions = new Map();
  const manifest = [];
  const failures = [];
  const attemptedRoles = [...new Set(captures.map((item) => item.role))];

  try {
    for (const role of attemptedRoles) {
      try {
        const session = await createRoleSession(browser, role);
        sessions.set(role, session);
      } catch (error) {
        failures.push({
          file: null,
          portal: `Role bootstrap: ${role}`,
          route: null,
          role,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    for (const item of captures) {
      const session = sessions.get(item.role);
      if (!session) {
        failures.push({
          file: item.file,
          portal: item.portal,
          route: item.route,
          role: item.role,
          error: `Session unavailable for role "${item.role}"`,
        });
        continue;
      }

      const route = item.route.startsWith("http") ? item.route : `${baseUrl}${item.route}`;
      const outputPath = path.join(outputDir, item.file);

      try {
        await session.page.goto(route, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        if (item.waitFor) {
          await session.page.waitForSelector(item.waitFor, { timeout: 30_000 });
        }
        await session.page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
        await session.page.waitForTimeout(700);
        await session.page.screenshot({ path: outputPath, fullPage: false });

        manifest.push({
          file: item.file,
          portal: item.portal,
          role: item.role,
          email: session.email,
          route: item.route,
          url: route,
          capturedAt: new Date().toISOString(),
        });
      } catch (error) {
        failures.push({
          file: item.file,
          portal: item.portal,
          route: item.route,
          role: item.role,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    for (const session of sessions.values()) {
      await session.context.close().catch(() => {});
    }
    await browser.close().catch(() => {});
  }

  const manifestPayload = {
    baseUrl,
    viewport,
    generatedAt: new Date().toISOString(),
    screenshots: manifest,
    failures,
  };

  await fs.writeFile(manifestPath, JSON.stringify(manifestPayload, null, 2), "utf8");

  if (failures.length > 0) {
    console.log(`[capture] Completed with ${failures.length} failure(s).`);
  } else {
    console.log("[capture] Completed successfully.");
  }
  console.log(`[capture] Saved ${manifest.length} screenshot(s) to ${outputDir}`);
  console.log(`[capture] Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error("[capture] Fatal error:", error);
  process.exit(1);
});
