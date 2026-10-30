import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAtlasSpace, homeSpaceFor, pageInSpace } from "@/features/atlas/spaces";
import { resolveCapabilities } from "@/features/atlas/capabilities";
import { makePage } from "./fixtures";

const inserts: { table: string; payload: any }[] = [];
let session: { user: { id: string } } | null = { user: { id: "user-1" } };
vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    const chain: any = {
      select: () => chain,
      order: () => Promise.resolve({ data: [{ id: "x", title: "t", space: "personal", owner_id: "user-1", status: "draft", created_at: "", updated_at: "" }], error: null }),
      insert: (payload: any) => {
        inserts.push({ table, payload });
        return chain;
      },
      upsert: (payload: any) => {
        inserts.push({ table: `${table}:upsert`, payload });
        return Promise.resolve({ error: null });
      },
      single: () => Promise.resolve({ data: { id: "new-page" }, error: null }),
      then: (resolve: any) => resolve({ error: null }),
    };
    return chain;
  };
  return { supabase: { from: builder, auth: { getSession: () => Promise.resolve({ data: { session } }) } } };
});

import { createHelpArticlesSource } from "@/features/atlas/source/helpArticlesSource";

const personal = getAtlasSpace("personal")!;
const source = () => createHelpArticlesSource({ canViewContext: () => true });

describe("atlas personal space", () => {
  beforeEach(() => {
    inserts.length = 0;
    session = { user: { id: "user-1" } };
  });

  it("is registered, stores under its own space and is separate from the wiki", () => {
    expect(personal.scope.storeSpace).toBe("personal");
    expect(personal.allowCreate).toBe(true);
    expect(homeSpaceFor("personal")?.id).toBe("personal");
    expect(pageInSpace(personal, makePage({ spaceId: "personal" }))).toBe(true);
    expect(pageInSpace(getAtlasSpace("wiki")!, makePage({ spaceId: "personal" }))).toBe(false);
    expect(pageInSpace(getAtlasSpace("sops")!, makePage({ spaceId: "personal", status: "published" }))).toBe(false);
  });

  it("gives nobody a right the wiki view does not already give", () => {
    const none = { canViewFeature: () => false, canEditFeature: () => true, adminRole: { hasAccess: true, canEdit: true, isAdmin: true } };
    expect(resolveCapabilities(personal, none)).toEqual({ view: false, edit: false, publish: false, remove: false });
  });

  it("creates a personal page owned by the signed-in user, internal, with no contexts", async () => {
    const s = source();
    await s.listPages();
    await s.createPage({ spaceId: "personal", title: "Mine", slug: "mine" });
    const page = inserts.find((entry) => entry.table === "help_articles")!.payload;
    expect(page).toMatchObject({ space: "personal", owner_id: "user-1", visibility: "internal" });
    expect(inserts.some((entry) => entry.table === "help_article_contexts")).toBe(false);
  });

  it("refuses to create a personal page when the space column is unavailable or nobody is signed in", async () => {
    const fresh = source();
    await expect(fresh.createPage({ spaceId: "personal", title: "Mine", slug: "mine" })).rejects.toThrow(/not available/);
    await fresh.listPages();
    session = null;
    await expect(fresh.createPage({ spaceId: "personal", title: "Mine", slug: "mine" })).rejects.toThrow(/Sign in/);
    expect(inserts.some((entry) => entry.table === "help_articles")).toBe(false);
  });

  it("maps the owner onto the page and writes shares through help_article_shares", async () => {
    const s = source();
    const { pages } = await s.listPages();
    expect(pages[0]).toMatchObject({ spaceId: "personal", ownerId: "user-1" });
    await s.setPersonalShare("p1", "user-2", true);
    expect(inserts.find((entry) => entry.table === "help_article_shares:upsert")!.payload).toEqual({ article_id: "p1", user_id: "user-2", can_edit: true });
  });
});

describe("atlas personal pages migration (RLS)", () => {
  const sql = readFileSync("supabase/migrations/20261029120000_atlas_personal_pages.sql", "utf8");
  const policy = (name: string) => sql.split("CREATE POLICY").find((chunk) => chunk.trimStart().startsWith(`"${name}"`)) ?? "";

  it.each(["Admins can delete help_articles", "Anyone authenticated can read public articles", "Editors can insert help_articles", "Editors can update help_articles", "Role users can select help_articles"])(
    "narrows existing policy %s so it never matches personal rows",
    (name) => {
      expect(policy(name)).toContain("space IS DISTINCT FROM 'personal'");
    },
  );

  it("never touches non-personal access: no policy is dropped without being recreated", () => {
    const dropped = [...sql.matchAll(/DROP POLICY IF EXISTS "([^"]+)"/g)].map((match) => match[1]);
    for (const name of new Set(dropped)) expect(policy(name), name).not.toBe("");
  });

  it("only lets the owner create, and only as themselves, privately", () => {
    const create = policy("Personal pages: create own");
    expect(create).toContain("owner_id = auth.uid()");
    expect(create).toContain("visibility = 'internal'");
    expect(policy("Personal pages: delete own")).toContain("owner_id = auth.uid()");
  });

  it("limits who can read or edit to the owner or an explicit share", () => {
    expect(policy("Personal pages: read own or shared")).toMatch(/owner_id = auth.uid\(\) OR public.atlas_personal_can_read/);
    expect(policy("Personal pages: edit own or shared")).toMatch(/owner_id = auth.uid\(\) OR public.atlas_personal_can_edit/);
    expect(sql).toMatch(/s.user_id = auth.uid\(\) AND s.can_edit/);
  });

  it("hides history and contexts of personal pages from the broad policies", () => {
    expect(policy("Role users can select help_article_versions")).toContain("a.space = 'personal'");
    expect(policy("Staff can select internal help_article_contexts")).toContain("a.space = 'personal'");
  });

  it("freezes owner/space and blocks public share links for personal pages", () => {
    expect(sql).toContain("A personal page cannot change owner or space");
    expect(sql).toContain("Personal pages cannot have a public share link");
  });

  it("keeps shares owner-managed, to staff other than the owner, with no anon access", () => {
    const owner = policy("Shares: owner manages");
    expect(owner).toContain("atlas_personal_owner(article_id)");
    expect(owner).toContain("user_id <> auth.uid()");
    expect(sql).toContain("REVOKE ALL ON public.help_article_shares FROM PUBLIC, anon");
  });
});
