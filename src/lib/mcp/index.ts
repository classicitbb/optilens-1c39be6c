import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import searchProductsTool from "./tools/search-products";
import listMyOrdersTool from "./tools/list-my-orders";

// Build the OAuth issuer from the project ref so it stays the direct
// `supabase.co` host that JWKS discovery advertises. `VITE_SUPABASE_PROJECT_ID`
// is inlined by Vite at build time, keeping this entry import-safe (no runtime
// env read, no throw at module top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "classic-visions-mcp",
  title: "Classic Visions",
  version: "0.1.0",
  instructions:
    "Tools for the Classic Visions optical platform. Callers act as their signed-in user; RLS restricts what each tool can read or write.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, searchProductsTool, listMyOrdersTool],
});
