import { BookOpen, Globe, ListChecks, type LucideIcon } from "lucide-react";
import type { AtlasPage, AtlasPropValue, AtlasStatus } from "./source/types";

/**
 * Spaces are data. Adding one (an imported space, a new database) means registering a definition
 * here or through `registerAtlasHost`; nothing else in Atlas switches on a space id.
 */

export type AtlasLayout = "tree" | "database";
export type AtlasView = "table" | "board" | "gallery";

/** What a user needs, expressed against the host app's permission system. */
export type CapabilityRule =
  | { kind: "feature"; feature: string; level: "view" | "edit" }
  | { kind: "adminRole"; level: "access" | "edit" | "admin" }
  | { kind: "none" };

export interface AtlasOption {
  value: string;
  label: string;
}

export type AtlasPropertyType = "text" | "textarea" | "number" | "select" | "toggle" | "contexts";

export interface AtlasPropertyDef {
  key: string;
  label: string;
  type: AtlasPropertyType;
  /** "field" properties are page fields (slug, summary, placement); "prop" properties live in `page.props`. */
  target: "field" | "prop";
  options?: AtlasOption[];
  /** Name of an option set the host (or the workspace, for sections/pages) supplies at render time. */
  optionsRef?: string;
  /** Show only while another property has this value. */
  visibleWhen?: { key: string; equals: string };
  /** Read-only once the page is published (URLs and slugs that other things depend on). */
  lockedWhenPublished?: boolean;
  placeholder?: string;
  help?: string;
  mono?: boolean;
  /** Shown as a table column in database views. */
  column?: boolean;
  /** Shown in the page settings / peek. Default true. */
  settings?: boolean;
}

export interface AtlasSavedView {
  id: string;
  label: string;
  description: string;
  /** Property key -> allowed values. */
  filter?: Record<string, AtlasPropValue[]>;
  /** Render a host-registered component instead of rows (an interim seam until an adapter lands). */
  embed?: string;
}

export interface AtlasScope {
  /** Value of the stored space this space reads. */
  storeSpace: string;
  statuses?: AtlasStatus[];
  /** Property key -> allowed values (a filtered view: pages must match). */
  where?: Record<string, AtlasPropValue[]>;
  /** Include pages switched off in the legacy `active` property (shown as drafts). */
  includeInactive?: boolean;
}

export interface AtlasSpaceDef {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  layout: AtlasLayout;
  scope: AtlasScope;
  views: AtlasView[];
  defaultView: AtlasView;
  savedViews: AtlasSavedView[];
  properties: AtlasPropertyDef[];
  /** New pages can be created here (a filtered view that hides drafts cannot hold new pages). */
  allowCreate: boolean;
  capability: { view: CapabilityRule; edit: CapabilityRule; publish: CapabilityRule; remove: CapabilityRule };
  /** Properties a new page starts with. */
  defaultProps?: Record<string, AtlasPropValue>;
  /** Extra starting properties when a new page already has certain values (for example by saved view). */
  derivedDefaults?: { when: Record<string, AtlasPropValue>; set: Record<string, AtlasPropValue> }[];
  /** Heading above a database view. Defaults to the label. */
  title?: string;
}

const STATUS_OPTIONS: AtlasOption[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];
export const ATLAS_STATUS_OPTIONS = STATUS_OPTIONS;

const wikiProperties: AtlasPropertyDef[] = [
  {
    key: "entryKind",
    label: "Entry type",
    type: "select",
    target: "field",
    options: [
      { value: "article", label: "Rendered page" },
      { value: "link", label: "Linked page" },
    ],
  },
  { key: "href", label: "Link target", type: "text", target: "field", visibleWhen: { key: "entryKind", equals: "link" }, placeholder: "/path/or/https://…" },
  { key: "slug", label: "Slug", type: "text", target: "field", mono: true, lockedWhenPublished: true, help: "Locked while published so existing links keep working." },
  { key: "summary", label: "Summary", type: "textarea", target: "field", placeholder: "Short description shown in search and lists." },
  { key: "sectionId", label: "Section", type: "select", target: "field", optionsRef: "sections" },
  { key: "parentId", label: "Parent page", type: "select", target: "field", optionsRef: "pages" },
  { key: "sortOrder", label: "Sort order", type: "number", target: "field" },
];

const websiteProperties: AtlasPropertyDef[] = [
  { key: "contentType", label: "Type", type: "select", target: "prop", optionsRef: "contentTypes", column: true },
  { key: "status", label: "Status", type: "select", target: "field", options: STATUS_OPTIONS, column: true, settings: false },
  { key: "visibility", label: "Visibility", type: "select", target: "prop", optionsRef: "visibility", column: true },
  { key: "pageSlug", label: "Page", type: "select", target: "prop", optionsRef: "lockedPages", visibleWhen: { key: "contentType", equals: "legal" }, lockedWhenPublished: true, help: "Which fixed page this entry fills. Locked while published." },
  { key: "category", label: "Category", type: "select", target: "prop", optionsRef: "categories", visibleWhen: { key: "contentType", equals: "knowledge" } },
  { key: "category", label: "Category", type: "text", target: "prop", placeholder: "Category group", visibleWhen: { key: "contentType", equals: "faq" } },
  { key: "description", label: "Description", type: "textarea", target: "prop", placeholder: "Short description shown in lists and previews" },
  { key: "slug", label: "Slug", type: "text", target: "field", mono: true, lockedWhenPublished: true, help: "Locked while published so existing links keep working." },
  { key: "active", label: "Active on site", type: "toggle", target: "prop", help: "Off hides the entry from the site without changing its status." },
  { key: "contexts", label: "Contexts", type: "contexts", target: "field", column: true, help: "Where this entry is offered as in-app help." },
  { key: "sortOrder", label: "Sort order", type: "number", target: "field" },
];

const ruleFeature = (feature: string, level: "view" | "edit"): CapabilityRule => ({ kind: "feature", feature, level });

export const BUILT_IN_SPACES: AtlasSpaceDef[] = [
  {
    id: "wiki",
    label: "Wiki",
    description: "Pages your team writes and keeps current.",
    icon: BookOpen,
    layout: "tree",
    scope: { storeSpace: "wiki" },
    views: [],
    defaultView: "table",
    savedViews: [],
    properties: wikiProperties,
    allowCreate: true,
    capability: {
      view: ruleFeature("wiki", "view"),
      edit: ruleFeature("wiki", "edit"),
      publish: ruleFeature("wiki", "edit"),
      remove: { kind: "none" },
    },
  },
  {
    id: "sops",
    label: "SOPs",
    description: "The published procedures, read-only until you choose to edit.",
    icon: ListChecks,
    layout: "tree",
    // A filtered view over the wiki: nothing is stored under "sops".
    scope: { storeSpace: "wiki", statuses: ["published"], where: { visibility: ["internal"], active: [true] } },
    views: [],
    defaultView: "table",
    savedViews: [],
    properties: wikiProperties,
    allowCreate: false,
    capability: {
      view: ruleFeature("wiki", "view"),
      edit: ruleFeature("wiki", "edit"),
      publish: ruleFeature("wiki", "edit"),
      remove: { kind: "none" },
    },
  },
  {
    id: "website",
    label: "Website",
    description: "Public and customer-facing articles, FAQs and legal pages.",
    icon: Globe,
    layout: "database",
    scope: { storeSpace: "website", includeInactive: true },
    views: ["table", "board", "gallery"],
    defaultView: "table",
    savedViews: [
      { id: "all", label: "All articles", description: "Every website entry" },
      { id: "knowledge", label: "Knowledge Base", description: "Public-facing articles for the knowledge base", filter: { contentType: ["knowledge"] } },
      { id: "faq", label: "FAQ", description: "Frequently asked questions", filter: { contentType: ["faq"] } },
      { id: "legal", label: "Legal", description: "Policies, terms and other legal pages", filter: { contentType: ["legal"] } },
      { id: "blog", label: "Blog", description: "Editorial posts (managed with the blog editor until it joins Atlas)", embed: "blog-posts" },
    ],
    properties: websiteProperties,
    allowCreate: true,
    capability: {
      view: { kind: "adminRole", level: "access" },
      edit: { kind: "adminRole", level: "edit" },
      publish: { kind: "adminRole", level: "edit" },
      remove: { kind: "adminRole", level: "admin" },
    },
    title: "Website content",
    defaultProps: { contentType: "knowledge", visibility: "public", active: true, category: "General" },
    derivedDefaults: [
      { when: { contentType: "faq" }, set: { category: "FAQ" } },
      { when: { contentType: "legal" }, set: { pageSlug: "copyright", category: "" } },
    ],
  },
];

const registry = new Map<string, AtlasSpaceDef>(BUILT_IN_SPACES.map((space) => [space.id, space]));

export const registerAtlasSpace = (space: AtlasSpaceDef) => {
  registry.set(space.id, space);
};
export const listAtlasSpaces = (): AtlasSpaceDef[] => [...registry.values()];
export const getAtlasSpace = (id: string | undefined | null): AtlasSpaceDef | undefined => (id ? registry.get(id) : undefined);

/** Does this page belong in the space? Pure, so spaces can be tested without a backend. */
export const pageInSpace = (space: AtlasSpaceDef, page: AtlasPage): boolean => {
  const { scope } = space;
  if (page.spaceId !== scope.storeSpace) return false;
  if (scope.statuses && !scope.statuses.includes(page.status)) return false;
  if (!scope.includeInactive && page.props.active === false) return false;
  for (const [key, allowed] of Object.entries(scope.where ?? {})) {
    if (!allowed.includes(page.props[key] as AtlasPropValue)) return false;
  }
  return true;
};

/** Does the page match a saved view's filter? */
export const pageInSavedView = (view: AtlasSavedView | undefined, page: AtlasPage): boolean => {
  if (!view?.filter) return true;
  return Object.entries(view.filter).every(([key, allowed]) => allowed.includes(page.props[key] as AtlasPropValue));
};

/** The space a stored page opens in: the first space that stores it and does not filter by status. */
export const homeSpaceFor = (storeSpace: string): AtlasSpaceDef | undefined =>
  listAtlasSpaces().find((space) => space.scope.storeSpace === storeSpace && !space.scope.statuses) ??
  listAtlasSpaces().find((space) => space.scope.storeSpace === storeSpace);

/** Properties a new page in this space starts with, given the saved view it is created from. */
export const defaultPropsFor = (space: AtlasSpaceDef, view?: AtlasSavedView): Record<string, AtlasPropValue> => {
  const props: Record<string, AtlasPropValue> = { ...space.defaultProps };
  for (const [key, allowed] of Object.entries(view?.filter ?? {})) {
    if (allowed.length === 1) props[key] = allowed[0];
  }
  for (const rule of space.derivedDefaults ?? []) {
    if (Object.entries(rule.when).every(([key, value]) => props[key] === value)) Object.assign(props, rule.set);
  }
  return props;
};
