import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const policyPath = resolve(process.cwd(), "security/http-header-policy.json");

const normalizeDirectiveValue = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return values.join(" ");
};

export const readHeaderPolicy = () => JSON.parse(readFileSync(policyPath, "utf8"));

export const buildCspFromDirectives = (directives) =>
  Object.entries(directives)
    .map(([directive, values]) => {
      const normalized = normalizeDirectiveValue(values);
      return normalized ? `${directive} ${normalized}` : directive;
    })
    .join("; ");

export const buildSecurityHeaders = (mode = "enforce") => {
  const policy = readHeaderPolicy();

  if (!policy.csp?.[mode]) {
    throw new Error(`Unknown CSP mode: ${mode}`);
  }

  const headers = { ...policy.headers };
  const csp = buildCspFromDirectives(policy.csp[mode].directives);

  if (mode === "reportOnly") {
    headers["Content-Security-Policy-Report-Only"] = policy.csp.reportOnly.reportUri
      ? `${csp}; report-uri ${policy.csp.reportOnly.reportUri}`
      : csp;
  } else {
    headers["Content-Security-Policy"] = csp;
  }

  return headers;
};
