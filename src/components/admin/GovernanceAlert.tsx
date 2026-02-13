import { AlertTriangle } from "lucide-react";

interface Props {
  reasons: string[];
}

const GovernanceAlert = ({ reasons }: Props) => {
  if (reasons.length === 0) return null;
  return (
    <div
      className="flex items-start gap-2 rounded p-2.5 text-xs"
      style={{ background: "hsl(0 80% 96%)", border: "1px solid hsl(0 60% 85%)", color: "hsl(0 60% 35%)" }}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-[11px] mb-0.5">Save Blocked</p>
        <ul className="list-disc list-inside space-y-0.5">
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default GovernanceAlert;
