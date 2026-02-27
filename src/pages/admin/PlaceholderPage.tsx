import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";
import BuildCustomPackageButton from "@/features/admin/catalog-publisher-v2/components/BuildCustomPackageButton";

const PlaceholderPage = () => {
  const { pathname } = useLocation();
  const name = pathname.split("/").pop() ?? "Module";
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  const isCrmPipeline = pathname === "/admin/crm/pipeline";
  const isLeadsAi = pathname === "/admin/leads/ai";

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Construction className="h-10 w-10" style={{ color: "hsl(215 15% 50%)" }} />
      <h2 className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>{title}</h2>
      <p className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>
        {isCrmPipeline ? "See you soon." : "Coming in a future phase."}
      </p>
      {(isCrmPipeline || isLeadsAi) ? (
        <BuildCustomPackageButton
          source={isLeadsAi ? "leads_ai" : "crm_opportunity"}
          context={isCrmPipeline ? { opportunityId: "pending-opportunity" } : undefined}
          className="h-8 text-xs"
        />
      ) : null}
    </div>
  );
};

export default PlaceholderPage;
