#!/usr/bin/env node
// Extracts the real prose of every PUBLIC page into a search index, so site
// search matches the words actually on the page rather than a hand-maintained
// keyword list that drifts.
//
//   npm run search:index          regenerate
//   npm run qa:search-index       fail if the committed file is stale (CI)
//
// Input:  src/routes/public/PublicRoutes.tsx (route path -> page component)
//         plus each page component's own source file.
// Output: src/lib/generated/publicContentIndex.ts
//
// Admin, ops, portal and copilot surfaces are never walked - this file only
// ever reads what PublicRoutes.tsx reaches.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const repoRoot = process.cwd();
const checkOnly = process.argv.includes("--check");
const routesFile = path.join(repoRoot, "src", "routes", "public", "PublicRoutes.tsx");
const outputPath = path.join(repoRoot, "src", "lib", "generated", "publicContentIndex.ts");

/** Routes that render no indexable prose of their own. */
const SKIP_PATHS = new Set([
  "/assistant/window", // assistant chrome, no content
  "/repo-health", // internal diagnostics
  "/connect/:slug", // per-record card, content is DB-driven
]);

/** Never index anything under these prefixes, whatever the router says. */
const FORBIDDEN_PREFIXES = ["/admin", "/ops", "/copilot", "/portal", "/profile", "/dev"];

/**
 * JSX attributes whose values are structural, not content. Everything else
 * (alt, title, description, label, placeholder, aria-label, ...) is indexed.
 */
const STRUCTURAL_ATTRS = new Set([
  "className", "class", "to", "href", "src", "id", "key", "style", "type", "name",
  "canonicalPath", "path", "value", "htmlFor", "target", "rel", "role", "variant",
  "size", "side", "align", "color", "fill", "viewBox", "d", "xmlns", "slug",
]);

/** Object keys that carry copy. Anything else in an object literal is skipped. */
const CONTENT_KEYS = new Set([
  "title", "description", "body", "intro", "summary", "eyebrow", "label", "text",
  "heading", "subtitle", "caption", "alt", "question", "answer", "detail", "blurb",
  "name", "content", "quote", "note", "tagline", "excerpt", "placeholder",
]);

const read = (file) => readFileSync(file, "utf8");

const parse = (file) =>
  ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

/* -------------------------------------------------------------------------- */
/*  Route map: path -> page source file                                        */
/* -------------------------------------------------------------------------- */

/** `const Foo = lazyWithRetry(() => import("@/pages/Foo"))` and plain imports. */
const resolve = (specifier) => {
  if (!specifier.startsWith("@/")) return null;
  const base = path.join(repoRoot, "src", specifier.slice(2));
  for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
};

const collectComponentSources = (source) => {
  const byName = new Map();

  const visit = (node) => {
    if (ts.isImportDeclaration(node) && node.importClause?.name) {
      const file = resolve(node.moduleSpecifier.text);
      if (file) byName.set(node.importClause.name.text, file);
    }

    if (ts.isVariableDeclaration(node) && node.name && ts.isIdentifier(node.name) && node.initializer) {
      // Find the import("...") buried inside lazyWithRetry(() => import("..."))
      let specifier = null;
      const findImport = (n) => {
        if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
          const arg = n.arguments[0];
          if (arg && ts.isStringLiteral(arg)) specifier = arg.text;
        }
        ts.forEachChild(n, findImport);
      };
      findImport(node.initializer);
      const file = specifier && resolve(specifier);
      if (file) byName.set(node.name.text, file);
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return byName;
};

/** `<Route path="x" element={<Page />} />` -> { path, componentName }. */
const collectRoutes = (source) => {
  const routes = [];

  const visit = (node) => {
    const isRoute =
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      node.tagName.text === "Route";

    if (isRoute) {
      let routePath = null;
      let isIndex = false;
      let component = null;

      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) continue;
        const attrName = attr.name.text;

        if (attrName === "index") isIndex = true;

        if (attrName === "path" && attr.initializer && ts.isStringLiteral(attr.initializer)) {
          routePath = attr.initializer.text;
        }

        if (attrName === "element" && attr.initializer && ts.isJsxExpression(attr.initializer)) {
          // Take the innermost JSX identifier, so <ProtectedRoute><Page/></ProtectedRoute>
          // still resolves to Page.
          const names = [];
          const walk = (n) => {
            if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && ts.isIdentifier(n.tagName)) {
              names.push(n.tagName.text);
            }
            ts.forEachChild(n, walk);
          };
          walk(attr.initializer);
          component = names.filter((n) => n !== "ProtectedRoute" && n !== "Navigate").pop() ?? null;
        }
      }

      if (isIndex) routePath = "";
      if (routePath !== null && component) routes.push({ routePath, component });
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return routes;
};

/* -------------------------------------------------------------------------- */
/*  Prose extraction                                                           */
/* -------------------------------------------------------------------------- */

const TAILWIND_HINT = /(^|\s)(flex|grid|hidden|absolute|relative|w-|h-|p[xytblr]?-|m[xytblr]?-|text-|bg-|border|rounded|gap-|space-|shadow|max-|min-|z-|top-|left-|right-|bottom-|inline|block|items-|justify-|overflow|tracking-|leading-|font-|opacity|transition|hover:|sm:|md:|lg:|xl:|dark:)/;

/** Content, or code that merely looks like a string? */
const looksLikeProse = (raw) => {
  const value = raw.trim();
  if (value.length < 4 || value.length > 2000) return false;
  if (!/[a-zA-Z]/.test(value)) return false;
  if (/^[#.\/@]/.test(value)) return false; // selectors, paths, module specifiers
  if (/^https?:\/\//.test(value)) return false;
  if (/^[a-z0-9]+([-_/][a-z0-9]+)+$/.test(value)) return false; // slugs, kebab ids
  if (!value.includes(" ") && value.length < 12) return false; // lone tokens
  if (TAILWIND_HINT.test(value) && !/[.!?,]/.test(value)) return false;
  return true;
};

/**
 * Chrome and primitives that appear on every page. Following these would stamp
 * the same nav/footer copy onto all 60+ entries and drown the real content.
 */
const isChromeImport = (specifier) =>
  specifier.startsWith("@/components/ui/") ||
  specifier.startsWith("@/components/assistant/") ||
  /\/(Header|Footer|Seo|ScrollToTop|CookieConsentBanner)$/.test(specifier);

/** Local content components worth following (page wrappers, section blocks). */
const isFollowableImport = (specifier) =>
  (specifier.startsWith("@/components/") || specifier.startsWith("@/pages/") || specifier.startsWith("@/data/")) &&
  !isChromeImport(specifier);

const collectFollowableFiles = (source, resolve) => {
  const files = [];
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      // `import type {...}` carries no runtime copy.
      const typeOnly = node.importClause?.isTypeOnly;
      if (!typeOnly && isFollowableImport(specifier)) {
        const file = resolve(specifier);
        if (file) files.push(file);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return files;
};

const extractFromFile = (file, phrases, alts, headings) => {
  const source = parse(file);

  const push = (bucket, raw) => {
    const value = raw.replace(/\s+/g, " ").trim();
    if (looksLikeProse(value)) bucket.push(value);
  };

  const visit = (node) => {
    // Literal text between JSX tags: <p>Real sentence here.</p>
    if (ts.isJsxText(node)) push(phrases, node.text);

    // JSX attributes: alt / title / description / placeholder / aria-label ...
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const attrName = node.name.text;
      const init = node.initializer;
      const literal =
        init && ts.isStringLiteral(init)
          ? init.text
          : init && ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression)
            ? init.expression.text
            : null;

      if (literal !== null && !STRUCTURAL_ATTRS.has(attrName)) {
        push(attrName === "alt" ? alts : phrases, literal);
      }
    }

    // Object literals passed as props: { title: "...", body: "..." }
    if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))) {
      const key = node.name.text;
      const init = node.initializer;
      if (CONTENT_KEYS.has(key)) {
        if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
          push(key === "alt" ? alts : key === "title" || key === "heading" ? headings : phrases, init.text);
        }
        // ["a", "b"] under a content key (e.g. keywords-adjacent lists)
        if (ts.isArrayLiteralExpression(init)) {
          for (const el of init.elements) {
            if (ts.isStringLiteral(el)) push(phrases, el.text);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
};

/**
 * Many pages are thin dispatchers or wrappers (Index renders HomeVersionA;
 * PatientTopicPage receives its copy as props). Walk the page plus its local
 * content imports, bounded by depth and the chrome denylist, so the prose that
 * actually renders on the route ends up in the index.
 */
const FOLLOW_DEPTH = 2;

const extractFromPage = (file, resolve) => {
  const phrases = [];
  const alts = [];
  const headings = [];
  const visited = new Set();

  const walk = (target, depth) => {
    if (visited.has(target) || depth > FOLLOW_DEPTH) return;
    visited.add(target);

    extractFromFile(target, phrases, alts, headings);

    if (depth === FOLLOW_DEPTH) return;
    for (const next of collectFollowableFiles(parse(target), resolve)) {
      walk(next, depth + 1);
    }
  };

  walk(file, 0);

  const dedupe = (list) => [...new Set(list)];
  return { phrases: dedupe(phrases), alts: dedupe(alts), headings: dedupe(headings) };
};

/* -------------------------------------------------------------------------- */
/*  Build                                                                      */
/* -------------------------------------------------------------------------- */

const routesSource = parse(routesFile);
const componentSources = collectComponentSources(routesSource);
const routes = collectRoutes(routesSource);

const entries = [];
const seen = new Set();

for (const { routePath, component } of routes) {
  const fullPath = `/${routePath}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/";

  if (SKIP_PATHS.has(fullPath)) continue;
  if (FORBIDDEN_PREFIXES.some((prefix) => fullPath.startsWith(prefix))) continue;
  if (fullPath.includes(":")) continue; // dynamic routes have no static prose
  if (fullPath.includes("*")) continue; // catch-all 404
  if (seen.has(fullPath)) continue;

  const file = componentSources.get(component);
  if (!file) continue;

  seen.add(fullPath);

  const { phrases, alts, headings } = extractFromPage(file, resolve);
  if (phrases.length === 0 && alts.length === 0 && headings.length === 0) continue;

  entries.push({
    path: fullPath,
    source: path.relative(repoRoot, file).replace(/\\/g, "/"),
    headings,
    alts,
    // Joined into one haystack: search matches substrings, and one string per
    // page is far cheaper to scan than thousands of array elements.
    text: [...headings, ...phrases, ...alts].join(" · "),
  });
}

entries.sort((a, b) => a.path.localeCompare(b.path));

const banner = `// AUTO-GENERATED by scripts/generate_public_content_index.mjs - DO NOT EDIT.
// Regenerate with: npm run search:index
//
// Prose, headings and image alt text lifted from every public page component.
// Admin, ops, portal and profile surfaces are excluded by construction.
`;

const file = `${banner}
export interface PublicContentEntry {
  /** Route this content belongs to. */
  path: string;
  /** Page component the text was extracted from. */
  source: string;
  headings: string[];
  alts: string[];
  /** Headings + prose + alt text, joined, lowercased at search time. */
  text: string;
}

export const PUBLIC_CONTENT_INDEX: PublicContentEntry[] = ${JSON.stringify(entries, null, 2)};

export const PUBLIC_CONTENT_PAGE_COUNT = ${entries.length};
`;

const previous = existsSync(outputPath) ? read(outputPath) : "";

if (checkOnly) {
  if (previous !== file) {
    console.error(
      "publicContentIndex.ts is stale. Run `npm run search:index` and commit the result.",
    );
    process.exit(1);
  }
  console.log(`publicContentIndex.ts is up to date (${entries.length} pages).`);
} else {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, file, "utf8");
  const chars = entries.reduce((total, entry) => total + entry.text.length, 0);
  console.log(
    `Indexed ${entries.length} public pages, ${chars.toLocaleString()} chars of prose ` +
      `(${entries.reduce((t, e) => t + e.alts.length, 0)} alt strings).`,
  );
}
