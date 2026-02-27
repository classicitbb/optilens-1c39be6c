import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { PublisherPrefillContext } from "../types";

interface Props {
  source: "leads_ai" | "crm_opportunity" | "manual";
  context?: PublisherPrefillContext;
  className?: string;
}

const BuildCustomPackageButton = ({ source, context, className }: Props) => {
  const navigate = useNavigate();

  return (
    <Button
      className={className}
      onClick={() => {
        navigate("/admin/pricing/publisher", {
          state: {
            ...context,
            source,
          },
        });
      }}
    >
      Build Custom Package
    </Button>
  );
};

export default BuildCustomPackageButton;
