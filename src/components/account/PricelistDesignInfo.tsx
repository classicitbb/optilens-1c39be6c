import { Link } from "react-router";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { designEducation } from "./pricelistEducation";

export function PricelistDesignInfo({ categoryKey, name }: { categoryKey: string; name: string }) {
  const info = designEducation[categoryKey];
  if (!info) return <>{name}</>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`About ${name}`} className="inline-flex min-h-11 items-center gap-2 text-left underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {name}<Info className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent aria-label={`${name} lens traits`} collisionPadding={16} className="w-[min(22rem,calc(100vw-2rem))] space-y-3 text-sm">
        <h4 className="font-semibold">{name}</h4>
        <p className="leading-relaxed text-muted-foreground">{info.summary}</p>
        {info.traits.length > 0 && <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">{info.traits.map((trait) => <li key={trait}>{trait}</li>)}</ul>}
        <Link to={info.href} className="inline-flex min-h-11 items-center text-xs font-medium text-primary underline">Read the lens guide</Link>
      </PopoverContent>
    </Popover>
  );
}
