import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { PublisherPrefillContext, PublisherSource } from "../types";

interface Props {
  source: PublisherSource;
  context?: PublisherPrefillContext;
  className?: string;
}

const BuildCustomPackageButton = ({ source, context, className }: Props) => {
  const navigate = useNavigate();

  return (
    <Button
      className={className}
      onClick={() => {
        navigate("/admin/sales/proposals", {
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
