import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { FileText, Send, Sparkles, WifiOff } from "lucide-react";
import WikiArticleRenderer from "@/components/admin/WikiArticleRenderer";
import type { BlogBlockNode } from "@/components/blog/BlogPostRenderer";
import { cn } from "@/lib/utils";
import { getAtlasHost, type IrisEvidence } from "../host";
import type { AtlasHit } from "../source/types";
import { IRIS_ACTIONS, actionById, type IrisAction, type IrisApply } from "./irisActions";
import { textToBlocks, toInlineText } from "./irisBlocks";

export interface IrisRequest {
  prompt?: string;
  selection?: string;
  range?: { from: number; to: number };
  /** Changes on every request so the same request can be made twice. */
  nonce: number;
}

export interface IrisProposal {
  apply: IrisApply;
  blocks: BlogBlockNode[];
  /** Plain text, for inline replacement of a selection. */
  inline: string;
  range?: { from: number; to: number };
  /** First line of a reply, used as the title of a drafted entry. */
  heading: string;
  actionId?: string;
}

interface Turn {
  id: number;
  question: string;
  actionId?: string;
  selection?: string;
  range?: { from: number; to: number };
  status: "loading" | "done" | "error";
  text: string;
  sources: { id: string; title: string; path: string }[];
  proposal?: { state: "open" | "accepted" | "discarded"; value: IrisProposal };
}

interface IrisPanelProps {
  request: IrisRequest | null;
  page: { id: string; title: string; text: string } | null;
  /** Searches every space the user can read (the same source as the palette). */
  search: (query: string) => Promise<AtlasHit[]>;
  /** Plain text of a page by id, for hits to carry real evidence. */
  pageText: (id: string) => string;
  pagePath: (hit: AtlasHit) => string;
  route: string;
  canEdit: boolean;
  /** Apply an accepted proposal. Returns false when it could not be applied. */
  onAccept: (proposal: IrisProposal) => boolean;
  onDraftEntry: (proposal: IrisProposal) => Promise<void>;
  onDraftPage: (title: string) => Promise<void>;
}

const MAX_PAGE_CHARS = 6000;

const useOnline = () => {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
};

const Chip = ({ children, onRemove }: { children: string; onRemove?: () => void }) => (
  <span className="inline-flex max-w-full items-center gap-1 rounded-[4px] bg-ws-side-hover px-1.5 py-0.5 text-[12px] text-ws-ink-2">
    <span className="truncate">{children}</span>
    {onRemove ? (
      <button type="button" aria-label={`Remove ${children}`} onClick={onRemove} className="text-ws-ink-3 hover:text-ws-ink">
        ×
      </button>
    ) : null}
  </span>
);

/**
 * The Iris panel. It asks the host's assistant (the existing companion assistant) and shows the
 * reply as a proposal: nothing reaches the page until the user accepts it, and offline the page
 * stays fully editable.
 */
const IrisPanel = ({ request, page, search, pageText, pagePath, route, canEdit, onAccept, onDraftEntry, onDraftPage }: IrisPanelProps) => {
  const online = useOnline();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [includePage, setIncludePage] = useState(true);
  const [selection, setSelection] = useState<{ text: string; range?: { from: number; to: number } } | null>(null);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const nextId = useRef(1);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;
  const handled = useRef<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const provider = getAtlasHost().iris;

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [turns]);

  const patch = useCallback((id: number, change: Partial<Turn> | ((turn: Turn) => Partial<Turn>)) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, ...(typeof change === "function" ? change(turn) : change) } : turn)));
  }, []);

  const run = useCallback(
    async (turnId: number, question: string, action: IrisAction | undefined, sel: { text: string; range?: { from: number; to: number } } | null, history: Turn[]) => {
      if (!provider) {
        patch(turnId, { status: "error", text: "Iris isn't connected in this workspace." });
        return;
      }
      try {
        // Related pages: the two most distinctive words of the title, since every term must match.
        const relatedQuery = (page?.title ?? question).split(/s+/).filter((word) => word.length > 3).sort((x, y) => y.length - x.length).slice(0, 2).join(" ");
        const hits = await search(action?.local ? relatedQuery || question : question).catch(() => [] as AtlasHit[]);
        const related = hits.filter((hit) => hit.pageId !== page?.id).slice(0, 4);
        setResultCount(related.length);
        const sources = related.map((hit) => ({ id: hit.pageId, title: hit.title, path: pagePath(hit) }));
        if (action?.local) {
          patch(turnId, { status: "done", text: related.length > 0 ? "These pages look related:" : "No related pages found.", sources });
          return;
        }
        const evidence: IrisEvidence[] = [];
        if (page && includePage) evidence.push({ id: page.id, title: page.title, path: route, text: page.text.slice(0, MAX_PAGE_CHARS) });
        if (sel?.text) evidence.push({ id: "selection", title: "Selected text", path: route, text: sel.text.slice(0, 3000) });
        for (const hit of related) {
          evidence.push({ id: hit.pageId, title: hit.title, path: pagePath(hit), text: (pageText(hit.pageId) || hit.snippet).slice(0, 1800) });
        }
        const answer = await provider.ask({
          question,
          evidence,
          route,
          conversation: history
            .filter((turn) => turn.status === "done")
            .slice(-4)
            .flatMap((turn) => [
              { role: "user" as const, text: turn.question },
              { role: "assistant" as const, text: turn.text },
            ]),
          onDelta: (partial) => patch(turnId, { text: partial }),
        });
        if (!answer) {
          patch(turnId, { status: "error", text: "Iris couldn't answer just now. Your page is unchanged." });
          return;
        }
        const cited = answer.citations.length > 0 ? answer.citations.filter((c) => c.id !== "selection" && c.id !== page?.id) : sources;
        const apply = action?.apply ?? "append";
        const blocks = textToBlocks(answer.text);
        patch(turnId, {
          status: "done",
          text: answer.text,
          sources: cited.length > 0 ? cited : sources,
          proposal:
            apply === "none" || !canEdit
              ? undefined
              : {
                  state: "open",
                  value: {
                    apply,
                    blocks,
                    inline: toInlineText(answer.text),
                    range: sel?.range,
                    heading: answer.text.split("\n").find((line) => line.trim())?.replace(/^#+\s*/, "").trim() ?? "",
                    actionId: action?.id,
                  },
                },
        });
      } catch {
        patch(turnId, { status: "error", text: "Iris couldn't answer just now. Your page is unchanged." });
      }
    },
    [canEdit, includePage, page, pagePath, pageText, patch, provider, route, search],
  );

  const ask = useCallback(
    (question: string, actionId?: string, sel: typeof selection = selection) => {
      const trimmed = question.trim();
      if (!trimmed) return;
      const action = actionId ? actionById(actionId) : undefined;
      const id = nextId.current++;
      const turn: Turn = { id, question: trimmed, actionId, selection: sel?.text, range: sel?.range, status: "loading", text: "", sources: [] };
      const history = turnsRef.current;
      setTurns((current) => [...current, turn]);
      setInput("");
      void run(id, trimmed, action, sel, history);
    },
    [run, selection],
  );

  const runAction = (action: IrisAction) => {
    const sel = action.scope === "selection" ? selection : null;
    if (action.scope === "selection" && !sel) return;
    ask(action.prompt({ title: page?.title ?? "this page", selection: sel?.text }), action.id, sel);
  };

  const retry = (turn: Turn) => {
    const action = turn.actionId ? actionById(turn.actionId) : undefined;
    const sel = turn.selection ? { text: turn.selection, range: turn.range } : null;
    setTurns((current) => current.map((item) => (item.id === turn.id ? { ...item, status: "loading", text: "", proposal: undefined } : item)));
    void run(turn.id, turn.question, action, sel, turns.filter((item) => item.id < turn.id));
  };

  // A request from the editor (selection, "/" menu, space on an empty line) or ⌘J.
  useEffect(() => {
    if (!request || handled.current === request.nonce) return;
    handled.current = request.nonce;
    if (request.selection) setSelection({ text: request.selection, range: request.range });
    if (!request.prompt) return;
    if (request.prompt === "Summarize this page") {
      const action = actionById("summarize");
      if (action && page) ask(action.prompt({ title: page.title }), action.id, null);
    } else {
      setInput(request.prompt.replace(/…$/, " "));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const accept = (turn: Turn) => {
    if (!turn.proposal) return;
    const value = turn.proposal.value;
    const done = () => patch(turn.id, { proposal: { state: "accepted", value } });
    if (value.apply === "draft") {
      void onDraftEntry(value).then(done);
      return;
    }
    if (onAccept(value)) done();
  };

  const noSources = (turn: Turn) => turn.status === "done" && !turn.actionId && turn.sources.length === 0 && !page;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {turns.length === 0 ? (
          <div className="px-1 py-4 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-ws-accent" />
            <p className="mt-2 text-[14px] font-semibold text-ws-ink">Ask Iris</p>
            <p className="mt-1 text-[13px] leading-5 text-ws-ink-3">Iris reads this page and your search results. Its replies are proposals: nothing changes until you accept.</p>
          </div>
        ) : null}

        {turns.map((turn) => (
          <div key={turn.id} className="space-y-2">
            <div className="ml-6 rounded-[8px] bg-[var(--ws-hover)] px-3 py-2 text-[14px] text-ws-ink">{turn.actionId ? (actionById(turn.actionId)?.label ?? turn.question) : turn.question}</div>
            <div className="mr-2 rounded-[8px] bg-ws-accent-tint px-3 py-2 text-[14px] text-ws-ink">
              {turn.status === "loading" && !turn.text ? <span className="text-ws-ink-3">Thinking…</span> : null}
              {turn.status === "error" ? (
                <div role="alert">
                  <p>{turn.text}</p>
                  <button type="button" onClick={() => retry(turn)} disabled={!online} className="mt-1 text-[13px] text-ws-accent hover:underline disabled:opacity-40">
                    Try again
                  </button>
                </div>
              ) : turn.text ? (
                <WikiArticleRenderer bodyJson={{ blocks: turn.proposal?.value.blocks ?? textToBlocks(turn.text) }} className="ws-prose text-[14px]" emptyMessage="" />
              ) : null}
              {turn.sources.length > 0 && turn.status === "done" ? (
                <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Sources">
                  {turn.sources.map((source) => (
                    <Link key={source.id} to={source.path} className="inline-flex max-w-full items-center gap-1 rounded-[4px] bg-ws-paper px-1.5 py-0.5 text-[12px] text-ws-accent hover:underline">
                      <FileText className="h-3 w-3 shrink-0" /> <span className="truncate">{source.title}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {noSources(turn) ? (
              <div className="rounded-[8px] border border-ws-line px-3 py-2 text-[13px] text-ws-ink-2">
                Nothing in Atlas covers this yet.
                {canEdit ? (
                  <button type="button" onClick={() => void onDraftPage(turn.question)} className="ml-1 text-ws-accent hover:underline">
                    Start a draft page for it
                  </button>
                ) : null}
              </div>
            ) : null}

            {turn.status === "done" && turn.proposal?.state === "open" ? (
              <div className="rounded-[8px] border border-ws-accent">
                <div className="rounded-t-[7px] bg-ws-accent-tint px-3 py-1.5 text-[12px] font-semibold text-ws-ink">
                  {turn.proposal.value.apply === "replace"
                    ? "Proposed replacement for your selection"
                    : turn.proposal.value.apply === "draft"
                      ? "Proposed draft entry"
                      : "Proposed addition to this page"}
                </div>
                <div className="max-h-60 overflow-y-auto px-3 py-2">
                  <WikiArticleRenderer bodyJson={{ blocks: turn.proposal.value.blocks }} className="ws-prose text-[14px]" emptyMessage="" />
                </div>
                <div className="flex gap-2 border-t border-ws-line px-3 py-2">
                  <button
                    type="button"
                    onClick={() => accept(turn)}
                    className="rounded-[6px] bg-ws-accent px-3 py-1 text-[13px] font-semibold text-[hsl(var(--ws-accent-fg))]"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => patch(turn.id, { proposal: { state: "discarded", value: turn.proposal!.value } })}
                    className="rounded-[6px] px-3 py-1 text-[13px] hover:bg-[var(--ws-hover)]"
                  >
                    Discard
                  </button>
                  <button type="button" onClick={() => retry(turn)} disabled={!online} className="rounded-[6px] px-3 py-1 text-[13px] hover:bg-[var(--ws-hover)] disabled:opacity-40">
                    Try again
                  </button>
                </div>
              </div>
            ) : null}
            {turn.proposal?.state === "accepted" ? <p className="px-1 text-[12px] text-ws-ink-3">Accepted: added to the page draft.</p> : null}
            {turn.proposal?.state === "discarded" ? <p className="px-1 text-[12px] text-ws-ink-3">Discarded. Nothing was changed.</p> : null}
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-ws-line px-3 py-3">
        {!online ? (
          <p role="status" className="flex items-center gap-1.5 text-[12px] text-ws-ink-3">
            <WifiOff className="h-3.5 w-3.5" /> You're offline. Iris is paused; the page is still editable and nothing is lost.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1" aria-label="Context">
          {page && includePage ? <Chip onRemove={() => setIncludePage(false)}>{`Page: ${page.title || "Untitled"}`}</Chip> : null}
          {page && !includePage ? (
            <button type="button" onClick={() => setIncludePage(true)} className="text-[12px] text-ws-accent hover:underline">
              Add page as context
            </button>
          ) : null}
          {selection ? <Chip onRemove={() => setSelection(null)}>{`Selection: ${selection.text.length} characters`}</Chip> : null}
          {resultCount !== null ? <Chip>{`Search results: ${resultCount}`}</Chip> : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {IRIS_ACTIONS.filter((action) => (action.scope === "page" ? Boolean(page) : Boolean(selection))).map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={!online && !action.local}
              onClick={() => runAction(action)}
              className={cn("rounded-[6px] border border-ws-line px-2 py-1 text-[12px] text-ws-ink-2 hover:bg-[var(--ws-hover)] disabled:opacity-40", action.scope === "selection" && "border-ws-accent")}
            >
              {action.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask(input);
              }
            }}
            rows={2}
            aria-label="Ask Iris"
            placeholder="Ask about this page or anything in Atlas…"
            className="ws-bare-input min-h-[44px] flex-1 resize-none rounded-[6px] border border-ws-line bg-transparent px-2 py-1.5 text-[14px] outline-none focus:border-ws-accent"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!online || !input.trim() || !provider}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-ws-accent text-[hsl(var(--ws-accent-fg))] disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default IrisPanel;
