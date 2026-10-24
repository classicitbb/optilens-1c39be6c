import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { slugifyHelpValue } from "@/lib/helpCenter";
import { getAtlasHost, optionSet } from "../host";
import type { AtlasOption, AtlasPropertyDef } from "../spaces";
import type { DraftForm } from "../hooks/usePageEditor";

const NONE = "__none";

interface PropertiesFormProps {
  properties: AtlasPropertyDef[];
  draft: DraftForm;
  onChange: (next: DraftForm) => void;
  published: boolean;
  disabled?: boolean;
  /** Option sets only the workspace can supply (sections, parent pages). */
  dynamicOptions: Record<string, AtlasOption[]>;
}

const readValue = (draft: DraftForm, def: AtlasPropertyDef): unknown =>
  def.target === "field" ? (draft as unknown as Record<string, unknown>)[def.key] : draft.props[def.key];

const writeValue = (draft: DraftForm, def: AtlasPropertyDef, value: unknown): DraftForm => {
  if (def.target === "field") {
    const next = { ...draft, [def.key]: value } as DraftForm;
    // Slugs are normalised as they are typed so a stored slug is always URL-safe.
    if (def.key === "slug") next.slug = slugifyHelpValue(String(value ?? ""));
    return next;
  }
  return { ...draft, props: { ...draft.props, [def.key]: value as DraftForm["props"][string] } };
};

const optionsFor = (def: AtlasPropertyDef, dynamicOptions: Record<string, AtlasOption[]>): AtlasOption[] =>
  def.options ?? (def.optionsRef ? (dynamicOptions[def.optionsRef] ?? optionSet(def.optionsRef)) : []);

export const propertyVisible = (def: AtlasPropertyDef, draft: DraftForm): boolean => {
  if (def.settings === false) return false;
  if (!def.visibleWhen) return true;
  const current = def.visibleWhen.key in draft ? (draft as unknown as Record<string, unknown>)[def.visibleWhen.key] : draft.props[def.visibleWhen.key];
  return current === def.visibleWhen.equals;
};

/** Renders a space's property schema. The same form serves page settings and the database peek. */
const PropertiesForm = ({ properties, draft, onChange, published, disabled, dynamicOptions }: PropertiesFormProps) => (
  <>
    {properties
      .filter((def) => propertyVisible(def, draft))
      .map((def) => {
        const locked = Boolean(disabled) || (def.lockedWhenPublished === true && published);
        const value = readValue(draft, def);
        const id = `atlas-prop-${def.key}-${def.type}`;
        return (
          <div key={`${def.key}-${def.type}`} className="space-y-1">
            <label htmlFor={id} className="ws-label block text-ws-ink-3">
              {def.label}
            </label>
            {def.type === "text" ? (
              <Input
                id={id}
                value={String(value ?? "")}
                disabled={locked}
                placeholder={def.placeholder}
                onChange={(event) => onChange(writeValue(draft, def, event.target.value))}
                className={`h-9 ${def.mono ? "ws-mono" : ""}`}
              />
            ) : null}
            {def.type === "textarea" ? (
              <Textarea
                id={id}
                value={String(value ?? "")}
                disabled={locked}
                placeholder={def.placeholder}
                onChange={(event) => onChange(writeValue(draft, def, event.target.value))}
                className="min-h-20"
              />
            ) : null}
            {def.type === "number" ? (
              <Input
                id={id}
                type="number"
                value={String(value ?? "0")}
                disabled={locked}
                onChange={(event) => onChange(writeValue(draft, def, event.target.value))}
                className="h-9"
              />
            ) : null}
            {def.type === "select" ? (
              <Select
                value={value === "" || value === null || value === undefined ? NONE : String(value)}
                disabled={locked}
                onValueChange={(next) => onChange(writeValue(draft, def, next === NONE ? (def.key === "parentId" ? "none" : "") : next))}
              >
                <SelectTrigger id={id} className="h-9">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {def.optionsRef === "sections" || def.optionsRef === "pages" ? (
                    <SelectItem value={def.key === "parentId" ? "none" : NONE}>{def.key === "parentId" ? "Top level" : "No section"}</SelectItem>
                  ) : null}
                  {optionsFor(def, dynamicOptions).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {def.type === "toggle" ? (
              <div className="flex items-center gap-2">
                <Switch id={id} checked={value !== false} disabled={locked} onCheckedChange={(next) => onChange(writeValue(draft, def, next))} />
                <span className="text-[13px] text-ws-ink-2">{value !== false ? "On" : "Off"}</span>
              </div>
            ) : null}
            {def.type === "contexts" ? (
              <ContextsField value={draft.contexts} disabled={locked} onChange={(contexts) => onChange({ ...draft, contexts })} />
            ) : null}
            {def.help && !(def.lockedWhenPublished && !published) ? <p className="text-[12px] text-ws-ink-3">{def.help}</p> : null}
          </div>
        );
      })}
  </>
);

const ContextsField = ({ value, onChange, disabled }: { value: string[]; onChange: (next: string[]) => void; disabled?: boolean }) => {
  const options = getAtlasHost().contextOptions ?? [];
  const label = (slug: string) => options.find((option) => option.value === slug)?.label ?? slug;
  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="h-8 rounded-[6px] border border-ws-line px-3 text-[13px] hover:bg-[var(--ws-hover)] disabled:opacity-50"
          >
            Assign to pages
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-80 w-72 overflow-y-auto p-2">
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-start gap-2 rounded-[4px] px-2 py-1.5 hover:bg-[var(--ws-hover)]">
              <Checkbox
                checked={value.includes(option.value)}
                onCheckedChange={(checked) =>
                  onChange(checked ? [...new Set([...value, option.value])] : value.filter((slug) => slug !== option.value))
                }
              />
              <span>
                <span className="block text-[13px] font-medium">{option.label}</span>
                {option.path ? <span className="ws-mono block text-[11px] text-ws-ink-3">{option.path}</span> : null}
              </span>
            </label>
          ))}
        </PopoverContent>
      </Popover>
      <div className="flex flex-wrap gap-1">
        {value.length > 0 ? (
          value.map((slug) => (
            <span key={slug} className="rounded-[4px] bg-[var(--ws-hover)] px-1.5 py-0.5 text-[12px]">
              {label(slug)}
            </span>
          ))
        ) : (
          <span className="text-[12px] text-ws-ink-3">No assignments</span>
        )}
      </div>
    </div>
  );
};

export default PropertiesForm;
