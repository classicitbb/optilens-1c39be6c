export type AuthMode = "signin" | "signup";
export type AuthAudience = "professional" | "patient";
export type AuthIntent = "products" | "knowledge" | "support" | "ordering";
export type AuthStep = "welcome" | "details" | "intent" | "success";

export type AuthFlowState = {
  mode: AuthMode;
  audience: AuthAudience | null;
  intent: AuthIntent | null;
  step: AuthStep | null;
  redirect: string;
};

type AuthFlowInput = Partial<AuthFlowState>;

const DEFAULT_REDIRECT = "/";

const AUTH_ROUTE = "/auth";

export const getSafeAuthRedirect = (candidate?: string | null) => {
  if (!candidate) return DEFAULT_REDIRECT;

  // Decode percent-encoding to catch bypass attempts like /%2F%2Fevil.com
  let decoded: string;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    return DEFAULT_REDIRECT;
  }

  // Block protocol-relative URLs and any non-path-rooted strings
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return DEFAULT_REDIRECT;

  // Block unicode fraction-slash lookalikes that could become host separators
  if (/[⁄∕⧸]/.test(decoded)) return DEFAULT_REDIRECT;

  return candidate;
};

export const parseAuthMode = (value?: string | null): AuthMode =>
  value === "signup" ? "signup" : "signin";

export const parseAuthAudience = (value?: string | null): AuthAudience | null =>
  value === "professional" || value === "patient" ? value : null;

export const parseAuthIntent = (value?: string | null): AuthIntent | null =>
  value === "products" || value === "knowledge" || value === "support" || value === "ordering" ? value : null;

export const parseAuthStep = (value?: string | null): AuthStep | null =>
  value === "welcome" || value === "details" || value === "intent" || value === "success" ? value : null;

export const getDefaultAuthStep = ({ mode, audience }: { mode: AuthMode; audience: AuthAudience | null }): AuthStep =>
  mode === "signin" ? "details" : audience ? "details" : "welcome";

export const readAuthFlowState = (searchParams: URLSearchParams): AuthFlowState => {
  const mode = parseAuthMode(searchParams.get("mode"));
  const audience = parseAuthAudience(searchParams.get("audience"));
  const intent = parseAuthIntent(searchParams.get("intent"));
  const step = parseAuthStep(searchParams.get("step"));
  const redirect = getSafeAuthRedirect(searchParams.get("redirect"));

  return {
    mode,
    audience,
    intent,
    step,
    redirect,
  };
};

export const createAuthHref = (input: AuthFlowInput = {}) => {
  const params = new URLSearchParams();
  const mode = input.mode ?? "signin";
  const audience = input.audience ?? null;
  const intent = input.intent ?? null;
  const step = input.step ?? null;
  const redirect = getSafeAuthRedirect(input.redirect);

  params.set("mode", mode);

  if (audience) params.set("audience", audience);
  if (intent) params.set("intent", intent);
  if (step) params.set("step", step);
  if (redirect !== DEFAULT_REDIRECT) params.set("redirect", redirect);

  const query = params.toString();
  return query ? `${AUTH_ROUTE}?${query}` : AUTH_ROUTE;
};
