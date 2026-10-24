import { Link } from "react-router";
import { FileText, ImageIcon } from "lucide-react";

import type { PageSearchHit } from "@/lib/publicSiteSearch";

/**
 * Shared bits for rendering site-wide page matches. All three prototypes search
 * the same generated prose index; only the surrounding layout differs.
 */

/** Wrap the matched span in <mark> without dangerouslySetInnerHTML. */
export const Highlighted = ({
  text,
  start,
  length,
}: {
  text: string;
  start: number;
  length: number;
}) => {
  if (start < 0 || length <= 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-primary/20 px-0.5 text-foreground">
        {text.slice(start, start + length)}
      </mark>
      {text.slice(start + length)}
    </>
  );
};

/** Compact single-line-ish row, used by the sidebar and explorer layouts. */
export const PageHitRow = ({ hit }: { hit: PageSearchHit }) => (
  <Link
    to={hit.path}
    className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
  >
    {hit.viaAltText ? (
      <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    ) : (
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    )}
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium leading-5 text-foreground group-hover:text-primary">
        {hit.title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
        <Highlighted text={hit.snippet} start={hit.matchStart} length={hit.matchLength} />
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
        <span className="font-mono">{hit.path}</span>
        {hit.viaAltText ? <span className="text-primary">matched image description</span> : null}
      </p>
    </div>
  </Link>
);
