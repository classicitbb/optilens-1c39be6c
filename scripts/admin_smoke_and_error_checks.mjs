#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const PORT = Number(process.env.SMOKE_PORT ?? 4173);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ROUTES = [
  "/auth",
  "/admin",
  "/admin/leads",
  "/admin/leads/finder",
  "/admin/crm/pipeline",
  "/admin/settings/runtime-errors",
  "/admin/pricing/publisher",
];


const REQUIRED_SNIPPETS = [
  {
    file: "src/App.tsx",
    snippets: ["<GlobalErrorLogger />", 'path="settings/runtime-errors"'],
  },
  {
    file: "src/pages/Auth.tsx",
    snippets: ["Welcome Back", "Sign In", "Sign in with Google"],
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
    snippets: ["Lead Finder", "Find 50 Leads"],
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
    try {
      const response = await fetch(url, { redirect: "follow" });
      const html = await response.text();
      const hasRoot = html.includes('<div id="root">');
      if (!response.ok || !hasRoot) {
        failures.push(`${route} (status=${response.status}, root=${hasRoot})`);
      } else {
        console.log(`✔ route smoke: ${route} -> ${response.status}`);
      }
    } catch (error) {
      failures.push(`${route} (${error instanceof Error ? error.message : String(error)})`);
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

async function main() {
  const devServer = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(PORT)], {
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
