import fs from "node:fs";

const warnings = [];
const missing = [];

if (!fs.existsSync("package-lock.json")) {
  warnings.push("package-lock.json is missing. Run `npm install` to generate it for stable workspace resolution.");
}

try {
  await import("nodemailer");
} catch {
  missing.push("nodemailer package (run npm install at repository root)");
}

for (const warning of warnings) {
  console.warn(`[setup] ${warning}`);
}

if (missing.length > 0) {
  console.error("[setup] Missing local dependencies before dev startup:");
  for (const item of missing) console.error(`  - ${item}`);
  console.error("[setup] Fix: npm install");
  process.exit(1);
}
