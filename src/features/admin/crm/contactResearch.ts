import { supabase } from "@/integrations/supabase/client";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";
import { canonicalToSearchText, toCanonicalDocument } from "@/lib/wikiCanonical";

export type ResearchSource = { title: string; url: string; snippet: string; emails: string[] };
export type ContactResearch = { contactId: string; retrievedAt: string; sources: ResearchSource[]; summary?: string; warnings?: string[]; skipped?: string; error?: string };

export async function fetchContactResearch(contactId: string): Promise<ContactResearch> {
  const { data, error } = await supabase.functions.invoke("crm-enrich-contacts", { body: { contactId, mode: "research" } });
  if (error) throw error;
  const result = data as ContactResearch;
  if (result?.error) throw new Error(result.error);
  if (result?.skipped === "daily_cap") throw new Error("The daily research limit has been reached. Try again tomorrow.");
  if (!Array.isArray(result?.sources)) throw new Error("Public web research is unavailable on this deployment.");
  return result;
}

/** Markdown block for the contact notes: the written profile first, then the cited links. */
export function formatResearchNote(research: ContactResearch): string {
  const date = new Date(research.retrievedAt).toISOString().slice(0, 10);
  const links = research.sources.map((source) => `- [${source.title.replace(/[\[\]]/g, "")}](${source.url})`);
  return [
    `## Market intel (${date})`,
    research.summary?.trim() || "No market intel was returned for this contact.",
    ...(links.length ? ["Sources", ...links] : []),
    "AI-assisted public search; verify before relying on it.",
  ].join("\n\n");
}

/** Appends the research under whatever the contact's notes already hold, keeping existing formatting. */
export function appendResearchToNotes(current: { notes?: string | null; notes_doc?: BlogCanonicalContent | null }, research: ContactResearch) {
  const existing = toCanonicalDocument(current.notes_doc ?? current.notes);
  const doc = { ...existing, blocks: [...existing.blocks, ...toCanonicalDocument(formatResearchNote(research)).blocks] };
  return { notes: canonicalToSearchText(doc), notes_doc: doc };
}
