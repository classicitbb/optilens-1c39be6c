const DEFAULT_ENV = "development";

export type CorsPolicy = {
  allowHeaders: string;
  allowMethods: string;
  allowedOrigins: Set<string>;
};

function parseOriginList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function getEnvironment(): string {
  const explicit = (
    Deno.env.get("CORS_ENV") ??
    Deno.env.get("APP_ENV") ??
    Deno.env.get("SUPABASE_ENV") ??
    Deno.env.get("NODE_ENV")
  )?.toLowerCase();

  if (explicit) return explicit;

  // Auto-detect: Supabase cloud sets SUPABASE_URL to a non-localhost URL.
  // When running in cloud (not local dev), treat as production so the real
  // site domains are included in the CORS allowlist automatically.
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (supabaseUrl && !supabaseUrl.includes("localhost") && !supabaseUrl.includes("127.0.0.1")) {
    return "production";
  }

  return DEFAULT_ENV;
}

function getDefaultOriginsForEnv(environment: string): string[] {
  // These domains are always allowed regardless of environment —
  // the live site must never be blocked by a misconfigured env var.
  const alwaysAllowed = [
    "https://classicvisions.net",
    "https://www.classicvisions.net",
    "https://admin.classicvisions.net",
    "https://classicvisions.lovable.app",
    "https://optilens.lovable.app",
    "https://d568bffd-cdad-4066-b271-1e09c9a376d6.lovableproject.com",
    "https://id-preview--d568bffd-cdad-4066-b271-1e09c9a376d6.lovable.app",
    // The public portal is served locally on these exact origins during
    // authenticated, real-browser verification against cloud functions.
    "http://localhost:8081",
    "http://127.0.0.1:8081",
  ];

  if (environment === "staging") {
    return [
      ...alwaysAllowed,
      "https://staging.optilens.lovable.app",
      "https://staging.classicvisions.net",
    ];
  }

  if (environment !== "production" && environment !== "prod") {
    // Development: also allow localhost
    return [
      ...alwaysAllowed,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
    ];
  }

  return alwaysAllowed;
}

function getAllowedOrigins(): Set<string> {
  const envName = getEnvironment();
  const shared = parseOriginList(Deno.env.get("CORS_ALLOW_ORIGINS"));
  const envSpecific = parseOriginList(
    envName === "production" || envName === "prod"
      ? Deno.env.get("CORS_ALLOW_ORIGINS_PROD")
      : envName === "staging"
      ? Deno.env.get("CORS_ALLOW_ORIGINS_STAGING")
      : Deno.env.get("CORS_ALLOW_ORIGINS_DEV"),
  );

  const origins = [...getDefaultOriginsForEnv(envName), ...shared, ...envSpecific];
  return new Set(origins);
}

export function createCorsPolicy(overrides?: Partial<Pick<CorsPolicy, "allowHeaders" | "allowMethods">>): CorsPolicy {
  return {
    allowHeaders:
      overrides?.allowHeaders ??
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    allowMethods: overrides?.allowMethods ?? "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    allowedOrigins: getAllowedOrigins(),
  };
}

export function getCorsHeaders(req: Request, policy: CorsPolicy): Record<string, string> {
  const requestOrigin = req.headers.get("origin");
  const isAllowedOrigin = !!requestOrigin && policy.allowedOrigins.has(requestOrigin);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": policy.allowHeaders,
    "Access-Control-Allow-Methods": policy.allowMethods,
    Vary: "Origin",
  };

  if (isAllowedOrigin && requestOrigin) {
    headers["Access-Control-Allow-Origin"] = requestOrigin;
  }

  return headers;
}

export function rejectDisallowedOrigin(req: Request, policy: CorsPolicy): Response | null {
  const requestOrigin = req.headers.get("origin");

  if (!requestOrigin) {
    return null;
  }

  if (!policy.allowedOrigins.has(requestOrigin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers": policy.allowHeaders,
        "Access-Control-Allow-Methods": policy.allowMethods,
        Vary: "Origin",
      },
    });
  }

  return null;
}

export function handleCorsPreflight(req: Request, policy: CorsPolicy): Response | null {
  if (req.method !== "OPTIONS") {
    return null;
  }

  const rejectedOrigin = rejectDisallowedOrigin(req, policy);
  if (rejectedOrigin) {
    return rejectedOrigin;
  }

  return new Response(null, {
    headers: getCorsHeaders(req, policy),
  });
}
