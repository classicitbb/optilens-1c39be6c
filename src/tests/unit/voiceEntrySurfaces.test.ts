import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("voice entry surfaces", () => {
  it("accepts a successful Copilot transcript without a review checkbox while retaining the explicit send action", () => {
    const assistant = read("src/components/admin/copilot/AdminCopilotAssistant.tsx");

    expect(assistant).toContain("setTranscriptConfirmed(true);");
    expect(assistant).not.toContain("Review the transcript, then confirm before sending.");
    expect(assistant).not.toContain('inputMode === "text" || transcriptConfirmed');
    expect(assistant).toContain("disabled={!canSend}");
  });

  it("inserts transcripts into CRM task title and notes at the caret rather than replacing their existing text", () => {
    const dialog = read("src/components/admin/CrmActivityDialog.tsx");

    expect(dialog).toContain('ariaLabel="Dictate task title"');
    expect(dialog).toContain('ariaLabel="Dictate task notes"');
    expect(dialog).toContain("applyTitleDictation");
    expect(dialog).toContain("applyNotesDictation");
  });

  it("uses the shared transcription control in the Helpdesk create-ticket description", () => {
    const tickets = read("src/pages/admin/helpdesk/HelpdeskTicketsPage.tsx");

    expect(tickets).toContain('ariaLabel="Dictate ticket description"');
    expect(tickets).toContain("applyTicketDescriptionDictation");
    expect(tickets).toContain('from "@/components/admin/InlineDictationButton"');
  });
});
