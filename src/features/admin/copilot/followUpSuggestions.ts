import type { CopilotAction, CopilotRun, CopilotState } from "./api";

export type CopilotSuggestion = {
  id: string;
  label: string;
  /** Text dropped into the composer. Sending stays an explicit user action. */
  prompt: string;
};

const MAX_SUGGESTIONS = 3;

const firstName = (action: CopilotAction) =>
  action.payload.customerName ?? action.payload.contactLabel ?? action.title;

const runSuggestions = (run: CopilotRun): CopilotSuggestion[] => {
  const out: CopilotSuggestion[] = [];
  if (run.status === "partial" || run.status === "failed") {
    out.push({ id: "explain-failure", label: "What failed, and why?", prompt: "Explain which steps of that run failed and why." });
  }
  const followUps = run.summary.followUpsNeeded ?? 0;
  if (followUps > 0) {
    out.push({
      id: "draft-followups",
      label: `Draft follow-ups for the ${followUps} that need one`,
      prompt: `Draft follow-up tasks for the ${followUps} accounts from that run that still need one.`,
    });
  }
  const lapsed = run.summary.lapsedBuyers ?? 0;
  if (lapsed > 0) {
    out.push({
      id: "lapsed-buyers",
      label: `Show the ${lapsed} lapsed buyers`,
      prompt: `List the ${lapsed} lapsed buyers from that scan with the evidence behind each one.`,
    });
  }
  if (run.summary.missingContactDetails) {
    out.push({
      id: "missing-contacts",
      label: "Which contact details are missing?",
      prompt: "Break down which accounts are missing contact details and what is missing on each.",
    });
  }
  return out;
};

/**
 * Deterministic next-step chips derived from the state Iris just returned.
 * These only ever pre-fill the composer — approvals and other Level 4 effects
 * stay behind their own explicit action cards.
 */
export const suggestFollowUps = (state: CopilotState | null): CopilotSuggestion[] => {
  if (!state || !state.messages.length) return [];
  const out: CopilotSuggestion[] = [];

  const pending = state.actions.filter((action) => action.status === "pending_approval");
  if (pending.length) {
    out.push({
      id: "explain-pending",
      label: pending.length === 1 ? "Explain the evidence behind this" : `Explain the evidence behind these ${pending.length}`,
      prompt: pending.length === 1
        ? `Walk me through the evidence behind "${pending[0].title}", and label anything that is inference rather than fact.`
        : "Walk me through the evidence behind each pending action, and label anything that is inference rather than fact.",
    });
  }

  const blocked = state.actions.filter((action) => action.status === "failed" || action.status === "blocked");
  if (blocked.length) {
    out.push({
      id: "explain-blocked",
      label: "Why are some actions stuck?",
      prompt: `Explain why ${blocked.map(firstName).join(", ")} could not be completed, and what would unblock them.`,
    });
  }

  const run = state.selectedRunId ? state.runs.find((item) => item.id === state.selectedRunId) ?? null : null;
  if (run) out.push(...runSuggestions(run));

  const completed = state.actions.filter((action) => action.status === "completed");
  if (completed.length && !pending.length) {
    out.push({
      id: "what-next",
      label: "What should I do next?",
      prompt: "Given what you just completed, what is the most useful next step on this account?",
    });
  }

  const seen = new Set<string>();
  return out.filter((suggestion) => !seen.has(suggestion.id) && seen.add(suggestion.id)).slice(0, MAX_SUGGESTIONS);
};
