/**
 * Quick actions for the Iris panel. Each one is a prompt plus a rule for how an accepted reply is
 * applied. Iris never writes: a reply is only ever offered as a proposal.
 */
export type IrisApply = "append" | "replace" | "insertAfter" | "draft" | "none";

export interface IrisAction {
  id: string;
  label: string;
  scope: "page" | "selection";
  apply: IrisApply;
  /** Needs no model call: answered from Atlas search alone. */
  local?: boolean;
  prompt: (input: { title: string; selection?: string }) => string;
}

const ONLY = "Reply with only the content itself: no greeting, no preamble, no closing remark.";

export const IRIS_ACTIONS: IrisAction[] = [
  {
    id: "summarize",
    label: "Summarize",
    scope: "page",
    apply: "append",
    prompt: ({ title }) => `Summarize the page “${title}” in a short paragraph followed by up to five bullet points. ${ONLY}`,
  },
  {
    id: "checklist",
    label: "Turn steps into checklist",
    scope: "page",
    apply: "append",
    prompt: ({ title }) =>
      `Turn the steps described on the page “${title}” into a checklist. Write each step as a line starting with "- [ ] ". ${ONLY}`,
  },
  {
    id: "related",
    label: "Find related pages",
    scope: "page",
    apply: "none",
    local: true,
    prompt: ({ title }) => title,
  },
  {
    id: "faq",
    label: "Draft FAQ entry",
    scope: "page",
    apply: "draft",
    prompt: ({ title }) =>
      `Write one FAQ entry for customers based on the page “${title}”. Put the question on the first line, then a blank line, then the answer in plain language. ${ONLY}`,
  },
  {
    id: "improve",
    label: "Improve writing",
    scope: "selection",
    apply: "replace",
    prompt: ({ selection }) => `Rewrite this text so it is clearer and better written, keeping its meaning and facts exactly. ${ONLY}\n\n${selection}`,
  },
  {
    id: "shorter",
    label: "Make shorter",
    scope: "selection",
    apply: "replace",
    prompt: ({ selection }) => `Make this text shorter without losing any fact or step. ${ONLY}\n\n${selection}`,
  },
  {
    id: "selection-checklist",
    label: "Turn into checklist",
    scope: "selection",
    apply: "insertAfter",
    prompt: ({ selection }) => `Turn this text into a checklist. Write each item as a line starting with "- [ ] ". ${ONLY}\n\n${selection}`,
  },
  {
    id: "explain",
    label: "Explain",
    scope: "selection",
    apply: "insertAfter",
    prompt: ({ selection }) => `Explain this text simply, as if to a new team member. Use only what the text and the page say. ${ONLY}\n\n${selection}`,
  },
];

export const actionById = (id: string): IrisAction | undefined => IRIS_ACTIONS.find((action) => action.id === id);
