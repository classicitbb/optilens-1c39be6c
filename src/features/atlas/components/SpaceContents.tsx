import { FileText, Link2 } from "lucide-react";
import type { TreeNode } from "../pageTree";
import type { AtlasPageMeta } from "../hooks/useAtlasPrefs";

interface SpaceContentsProps {
  title: string;
  description?: string;
  nodes: TreeNode[];
  pageMeta: Record<string, AtlasPageMeta>;
  onOpen: (node: TreeNode) => void;
  /** Shown under the list, e.g. a New page button. */
  footer?: React.ReactNode;
}

const bySort = (a: TreeNode, b: TreeNode) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);

/** A space's or section's pages as a numbered table of contents, nested the way the sidebar nests them. */
const SpaceContents = ({ title, description, nodes, pageMeta, onOpen, footer }: SpaceContentsProps) => {
  const renderList = (list: TreeNode[], prefix: string) => (
    <ol className="space-y-px">
      {[...list].sort(bySort).map((node, index) => {
        const number = `${prefix}${index + 1}`;
        if (node.kind === "section") {
          return (
            <li key={node.id} className="pt-4 first:pt-0">
              <p className="px-2 pb-1 text-[14px] font-semibold text-ws-ink">
                <span className="mr-2 text-ws-ink-3">{number}.</span>
                {node.title}
              </p>
              {node.children.length > 0 ? (
                <div className="pl-5">{renderList(node.children, `${number}.`)}</div>
              ) : (
                <p className="px-2 pl-7 text-[14px] text-ws-ink-3">Empty section</p>
              )}
            </li>
          );
        }
        const icon = pageMeta[node.id]?.icon;
        return (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => onOpen(node)}
              className="flex h-[30px] w-full items-center gap-2 rounded-[6px] px-2 text-left text-[15px] text-ws-ink hover:bg-[var(--ws-hover)]"
            >
              <span className="w-8 shrink-0 text-[13px] text-ws-ink-3">{number}</span>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[16px] leading-none text-ws-ink-2">
                {icon ? icon : node.kind === "link" ? <Link2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1 truncate underline decoration-ws-ink/20 underline-offset-[3px]">{node.title || "Untitled"}</span>
              {node.status === "draft" ? <span className="shrink-0 text-[12px] text-ws-ink-3">Draft</span> : null}
            </button>
            {node.children.length > 0 ? <div className="pl-10">{renderList(node.children, `${number}.`)}</div> : null}
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 pb-24 pt-16 sm:px-24">
      <h1 className="ws-page-title text-ws-ink">{title}</h1>
      {description ? <p className="ws-body mt-2 text-ws-ink-2">{description}</p> : null}
      <p className="mt-8 border-b border-ws-line pb-2 text-[14px] font-medium text-ws-ink-3">Contents</p>
      <nav aria-label="Table of contents" className="mt-3">
        {nodes.length > 0 ? renderList(nodes, "") : <p className="px-2 text-[14px] text-ws-ink-3">No pages yet.</p>}
      </nav>
      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
};

export default SpaceContents;
