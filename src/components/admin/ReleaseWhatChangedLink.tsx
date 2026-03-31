import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface ReleaseWhatChangedLinkProps {
  section: "pricing" | "quotes" | "store-orders" | "permissions";
  label?: string;
}

const SECTION_LABELS: Record<ReleaseWhatChangedLinkProps["section"], string> = {
  pricing: "Pricing",
  quotes: "Quotes",
  "store-orders": "Store & Orders",
  permissions: "Permissions",
};

export default function ReleaseWhatChangedLink({ section, label }: ReleaseWhatChangedLinkProps) {
  return (
    <Link to={`/admin/settings/releases#what-changed-${section}`} className="inline-flex">
      <Badge variant="outline" className="text-[11px] hover:bg-muted transition-colors">
        {label ?? `What changed? ${SECTION_LABELS[section]}`}
      </Badge>
    </Link>
  );
}
