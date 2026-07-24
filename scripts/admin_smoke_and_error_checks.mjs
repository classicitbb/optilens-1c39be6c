#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const PORT = Number(process.env.SMOKE_PORT ?? 4173);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ROUTES = [
  "/admin",
  "/admin/pricing",
  "/admin/pricing/catalog",
  "/admin/pricing/rx-lenses",
  "/admin/pricing/stock-lenses",
  "/admin/pricing/supplies",
  "/admin/pricing/publisher",
  "/admin/pricing/publisher-old",
  "/admin/pricing/publisher/demo-id",
  "/admin/pricing/costings",
  "/admin/pricing/costings/new",
  "/admin/pricing/costings/demo-id",
  "/admin/pricing/costings/reports",
  "/admin/pricing/reference",
  "/admin/pricing/imports",
  "/admin/pricing/settings",
  "/admin/pricing/legacy",
  "/admin/sales",
  "/admin/sales/proposals",
  "/admin/sales/quotations",
  "/admin/sales/quotations/demo-id",
  "/admin/sales/quotations/demo-id/print-preview",
  "/admin/sales/web-orders",
  "/admin/sales/rx-orders",
  "/admin/contacts",
  "/admin/contacts/config/tags",
  "/admin/contacts/config/industries",
  "/admin/leads",
  "/admin/leads/finder",
  "/admin/leads/campaigns",
  "/admin/leads/reports",
  "/admin/leads/ai",
  "/admin/leads/settings",
  "/admin/leads/proposals",
  "/admin/leads/catalog-publisher",
  "/admin/crm",
  "/admin/crm/dashboard",
  "/admin/crm/pipeline",
  "/admin/crm/activities",
  "/admin/crm/proposals",
  "/admin/crm/catalog-publisher",
  "/admin/helpdesk",
  "/admin/helpdesk/tickets",
  "/admin/helpdesk/teams",
  "/admin/helpdesk/sla",
  "/admin/website",
  "/admin/website/content",
  "/admin/website/microsites",
  "/admin/website/portals",
  "/admin/website/store",
  "/admin/website/store/lens-assistant",
  "/admin/knowledge",
  "/admin/knowledge/wiki",
  "/admin/knowledge/help",
  "/admin/settings",
  "/admin/settings/company",
  "/admin/settings/users",
  "/admin/settings/roles",
  "/admin/settings/audit",
  "/admin/settings/integrations",
  "/admin/settings/runtime-errors",
  "/admin/catalog",
  "/admin/reference",
  "/admin/lenses",
  "/admin/supplies",
  "/admin/addons",
  "/admin/rx-lens-prices",
  "/admin/stock-lens-prices",
  "/admin/supplies-prices",
  "/admin/imports",
  "/admin/catalog-publisher",
  "/admin/catalogpub-old",
  "/admin/catalog-publisher/demo-id",
  "/admin/quotations",
  "/admin/costings/shipments",
  "/admin/costings/reports",
  "/admin/parameters",
  "/admin/users",
  "/admin/audit",
  "/admin/wiki",
  "/admin/content",
  "/admin/erp/contacts",
  "/admin/erp/config/contact-tags",
  "/admin/erp/config/industries",
  "/admin/erp/crm",
  "/admin/erp/helpdesk",
  "/admin/erp/web-orders",
  "/admin/erp/rx-orders",
  "/admin/erp/website",
  "/admin/history",
];

const REQUIRED_SNIPPETS = [
  {
    file: "src/App.tsx",
    snippets: ["<GlobalErrorLogger />", "<AdminRoutes />"],
  },
  {
    file: "src/routes/admin/AdminRoutes.tsx",
    snippets: ['path="settings/runtime-errors"', 'path="website/store/lens-assistant"'],
  },
  {
    file: "src/pages/Auth.tsx",
    snippets: ["Welcome back", "Sign In", "Forgot your password?"],
  },
  {
    file: "src/hooks/use-toast.ts",
    snippets: ["shouldCaptureAsErrorToast", "addRuntimeErrorLog"],
  },
  {
    file: "src/components/GlobalErrorLogger.tsx",
    snippets: ["window.addEventListener(\"error\"", "window.addEventListener(\"unhandledrejection\""],
  },
  {
    file: "src/pages/admin/leads/MyLeadsPage.tsx",
    snippets: ["My Leads", "Bulk Actions"],
  },
  {
    file: "src/pages/admin/leads/LeadFinderPage.tsx",
    snippets: ["Lead Finder", "Search & Score"],
  },
  {
    file: "src/pages/admin/crm/CrmPipelinePage.tsx",
    snippets: ["CRM Pipeline", "Manual Opportunity Intake"],
  },
  {
    file: "src/pages/admin/RuntimeErrorsPage.tsx",
    snippets: ["Runtime Error Log", "clearRuntimeErrorLog", "getRuntimeErrorLog"],
  },
  {
    file: "src/lib/runtimeErrorLog.ts",
    snippets: [
      'const STORAGE_KEY = "optilens.runtime_error_log"',
      "const MAX_ENTRIES = 100",
      "[runtime-error]",
      "console.error(",
    ],
  },
];

const IMPLEMENTED_ADMIN_ROUTE_SNIPPETS = [
  { path: "leads", snippet: 'path="leads" element={<MyLeadsPage />}' },
  { path: "leads/finder", snippet: 'path="leads/finder" element={<LeadFinderPage />}' },
  { path: "crm/pipeline", snippet: 'path="crm/pipeline" element={<CrmPipelinePage />}' },
  { path: "knowledge/wiki", snippet: 'path="knowledge/wiki" element={<AdminWikiPage />}' },
  { path: "website/content", snippet: 'path="website/content" element={<ContentManagerPage />}' },
  { path: "sales/proposals", snippet: 'path="sales/proposals" element={<CatalogPublisherV2Page />}' },
  { path: "settings/runtime-errors", snippet: 'path="settings/runtime-errors" element={<RuntimeErrorsPage />}' },
];

const LEGACY_REDIRECT_EXPECTATIONS = [
  { legacy: "pricing/publisher-old", canonical: "/admin/pricing/publisher", snippet: 'path="pricing/publisher-old" element={<Navigate to="/admin/pricing/publisher" replace />}' },
  { legacy: "catalog", canonical: "/admin/pricing/catalog", snippet: 'path="catalog" element={<Navigate to="/admin/pricing/catalog" replace />}' },
  { legacy: "imports", canonical: "/admin/pricing/imports", snippet: 'path="imports" element={<Navigate to="/admin/pricing/imports" replace />}' },
  { legacy: "users", canonical: "/admin/settings/users", snippet: 'path="users" element={<Navigate to="/admin/settings/users" replace />}' },
  { legacy: "erp/crm", canonical: "/admin/crm/dashboard", snippet: 'path="erp/crm" element={<Navigate to="/admin/crm/dashboard" replace />}' },
  { legacy: "catalog-publisher", canonical: "/admin/sales/proposals", snippet: 'path="catalog-publisher" element={<Navigate to="/admin/sales/proposals" replace />}' },
];

const DEV_SERVER_ERROR_PATTERNS = [
  /pre-transform error/i,
  /syntax error/i,
  /failed to resolve import/i,
  /error when starting dev server/i,
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(BASE_URL, { redirect: "follow" });
      if (response.ok) return;
    } catch {
      // keep polling
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for dev server at ${BASE_URL}`);
}

async function checkRoutes() {
  const failures = [];

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route}`;
    let lastFailure = "request failed";

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, { redirect: "follow" });
        const html = await response.text();
        const hasRoot = html.includes('<div id="root">');
        if (response.ok && hasRoot) {
          console.log(`✔ route smoke: ${route} -> ${response.status}`);
          lastFailure = "";
          break;
        }
        lastFailure = `status=${response.status}, root=${hasRoot}`;
      } catch (error) {
        lastFailure = error instanceof Error ? error.message : String(error);
      }

      if (attempt < 3) {
        await sleep(250 * attempt);
      }
    }

    if (lastFailure) {
      failures.push(`${route} (${lastFailure})`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Route smoke failures:\n- ${failures.join("\n- ")}`);
  }
}

async function checkRuntimeErrorFormatContract() {
  const source = await readFile("src/lib/runtimeErrorLog.ts", "utf8");
  const requiredSequence = "[runtime-error] ${nextEntry.timestamp} | ${nextEntry.source} | ${nextEntry.title} | ${nextEntry.detail ?? \"\"} | ${nextEntry.route ?? \"\"}";

  if (!source.includes(requiredSequence)) {
    throw new Error("Runtime error log format changed: expected one-line '[runtime-error] <timestamp> | <source> | <title> | <detail> | <route>' contract.");
  }

  console.log("✔ runtime format contract: src/lib/runtimeErrorLog.ts");
}

async function checkRuntimeLoggingWiring() {
  const failures = [];

  for (const { file, snippets } of REQUIRED_SNIPPETS) {
    const source = await readFile(file, "utf8");
    for (const snippet of snippets) {
      if (!source.includes(snippet)) {
        failures.push(`${file} missing snippet: ${snippet}`);
      }
    }
    console.log(`✔ wiring check: ${file}`);
  }

  if (failures.length > 0) {
    throw new Error(`Runtime logging wiring failures:\n- ${failures.join("\n- ")}`);
  }
}

async function checkImplementedRoutesAreNotPlaceholder() {
  const appSource = await readFile("src/routes/admin/AdminRoutes.tsx", "utf8");
  const failures = [];

  for (const { path, snippet } of IMPLEMENTED_ADMIN_ROUTE_SNIPPETS) {
    if (!appSource.includes(snippet)) {
      failures.push(`expected implemented route '${path}' to map to concrete page component`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Implemented route mapping failures:\n- ${failures.join("\n- ")}`);
  }

  console.log("✔ implemented admin routes are concrete (no PlaceholderPage mapping)");
}

async function checkLegacyRedirects() {
  const appSource = await readFile("src/routes/admin/AdminRoutes.tsx", "utf8");
  const failures = [];

  for (const { legacy, canonical, snippet } of LEGACY_REDIRECT_EXPECTATIONS) {
    if (!appSource.includes(snippet)) {
      failures.push(`legacy route '${legacy}' should redirect to '${canonical}'`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Legacy redirect failures:\n- ${failures.join("\n- ")}`);
  }

  console.log("✔ legacy redirects map to canonical routes");
}

async function checkRoleScopedRouteAccessWiring() {
  const appSource = await readFile("src/routes/admin/AdminRoutes.tsx", "utf8");

  const runtimeErrorsSnippet = 'path="settings/runtime-errors" element={<RuntimeErrorsPage />}';
  if (!appSource.includes(runtimeErrorsSnippet)) {
    throw new Error("Runtime errors route wiring changed: expected '/admin/settings/runtime-errors' to remain directly accessible under AdminProtectedRoute.");
  }

  const integrationsSnippet = 'path="settings/integrations" element={<AdminOnlyRoute><IntegrationsPage /></AdminOnlyRoute>}';
  if (!appSource.includes(integrationsSnippet)) {
    throw new Error("Integrations route wiring changed: expected '/admin/settings/integrations' to remain wrapped in AdminOnlyRoute.");
  }

  console.log("✔ runtime-errors and integrations role-based route wiring verified");
}

async function main() {
  const devServer = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CI: "1" },
  });

  const devServerDiagnostics = [];

  const captureDevOutput = (chunk) => {
    const text = chunk.toString();
    for (const pattern of DEV_SERVER_ERROR_PATTERNS) {
      if (pattern.test(text)) {
        devServerDiagnostics.push(text.trim());
        break;
      }
    }
    return text;
  };

  devServer.stdout.on("data", (chunk) => {
    const text = captureDevOutput(chunk);
    process.stdout.write(`[dev] ${text}`);
  });
  devServer.stderr.on("data", (chunk) => {
    const text = captureDevOutput(chunk);
    process.stderr.write(`[dev] ${text}`);
  });

  try {
    await waitForServer();
    await checkRoutes();
    await checkRuntimeLoggingWiring();
    await checkRuntimeErrorFormatContract();
    await checkImplementedRoutesAreNotPlaceholder();
    await checkLegacyRedirects();
    await checkRoleScopedRouteAccessWiring();

    if (devServerDiagnostics.length > 0) {
      throw new Error(`Dev server reported transform/startup errors:\n- ${devServerDiagnostics.join("\n- ")}`);
    }

    console.log("\nSmoke harness passed.");
  } finally {
    devServer.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error("\nSmoke harness failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
