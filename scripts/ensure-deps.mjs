import fs from "node:fs";

const missing = [];

if (!fs.existsSync("package-lock.json")) {
  missing.push("package-lock.json (run npm install at repository root)");
}

try {
  await import("nodemailer");
} catch {
  missing.push("nodemailer package (run npm install at repository root)");
}

if (missing.length > 0) {
  console.error("[setup] Missing local dependencies before dev startup:");
  for (const item of missing) console.error(`  - ${item}`);
  console.error("[setup] Fix: npm install");
  process.exit(1);
}
