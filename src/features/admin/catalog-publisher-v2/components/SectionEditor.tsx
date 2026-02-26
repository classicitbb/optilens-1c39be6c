import { Textarea } from "@/components/ui/textarea";
import type { ProposalSection } from "../types";

interface Props {
  section: ProposalSection;
  onChange: (value: string) => void;
}

const SectionEditor = ({ section, onChange }: Props) => {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold">{section.title}</p>
      <Textarea value={section.body} onChange={(e) => onChange(e.target.value)} className="min-h-[76px] text-xs" />
    </div>
  );
};

export default SectionEditor;
