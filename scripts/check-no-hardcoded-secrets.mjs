import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const fileList = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((file) => /^(src|supabase\/functions|scripts)\//.test(file))
  .filter((file) => !file.endsWith(".svg"));

const suspiciousPatterns = [
  /(?:api|access|secret|private|service)[_-]?(?:key|token|secret)\s*[:=]\s*["'][^"'\n]{10,}["']/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"'\n]+["']/,
  /Bearer\s+[A-Za-z0-9_\-.]{20,}/,
];

const allowedFilePatterns = [
  /scripts\/check-no-hardcoded-secrets\.mjs$/,
  /src\/security\/program\.ts$/,
];

const violations = [];

for (const file of fileList) {
  if (allowedFilePatterns.some((pattern) => pattern.test(file))) continue;
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(line)) {
        violations.push(`${file}:${index + 1}: ${line.trim().slice(0, 140)}`);
        break;
      }
    }
  });
}

if (violations.length > 0) {
  console.error("Potential hardcoded secrets detected:\n");
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("No hardcoded secrets detected.");
