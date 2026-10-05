/**
 * The one place Atlas names itself. Everything user-visible that is a brand or a workspace name
 * (window title, sidebar header, install manifest, default copy) reads from here, so a rebrand or a
 * business pivot is a change to this file and the `--ws-*` tokens, not a code search.
 *
 * Business-specific data (permission feature names, option lists, the company name) is not defined
 * here: the host app supplies it through `registerAtlasHost` (see `host.ts`).
 */
export const ATLAS_CONFIG = {
  /** Product name shown in the window title, sidebar and install prompt. */
  productName: "Atlas",
  /** Short name used under an installed icon. */
  shortName: "Atlas",
  description: "Write, organise, publish and find everything your team knows, in one workspace.",
  /** Route root, also the install scope. No trailing slash. */
  basePath: "/atlas",
  /** Used until the host supplies a workspace name. */
  fallbackWorkspaceName: "Workspace",
  /** Theme/background colours for the install manifest (mirror `--ws-accent` / `--ws-bg`). */
  manifest: {
    themeColor: "#3FB3C4",
    backgroundColor: "#0F1B2D",
    icons: [
      { src: "/atlas-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/atlas-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/atlas-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  /** Launcher shortcuts (also written into the manifest). `space` must exist in the space registry. */
  shortcuts: [
    { name: "New page", spaceId: "wiki", query: "?new=1" },
    { name: "Search", spaceId: "wiki", query: "?search=1" },
  ],
  /** Default space when the URL names none. */
  defaultSpaceId: "wiki",
} as const;

export const atlasPath = (...segments: (string | null | undefined)[]): string =>
  [ATLAS_CONFIG.basePath, ...segments.filter((segment): segment is string => Boolean(segment))].join("/");
