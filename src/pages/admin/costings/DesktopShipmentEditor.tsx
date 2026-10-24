import { Monitor } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ShipmentDetailPage from "./ShipmentDetailPage";

/** Avoids mounting the editor and its queries below the approved desktop breakpoint. */
const DesktopShipmentEditor = () => {
  const isMobile = useIsMobile();
  if (isMobile) return <div className="flex min-h-[60vh] items-center justify-center p-6"><div className="max-w-sm rounded border bg-card p-5 text-center"><Monitor className="mx-auto mb-3 h-6 w-6 text-muted-foreground"/><h1 className="text-sm font-semibold">Desktop required</h1><p className="mt-1 text-xs text-muted-foreground">Shipment costing can be listed on mobile, but creating or editing a shipment requires a desktop screen.</p></div></div>;
  return <ShipmentDetailPage />;
};
export default DesktopShipmentEditor;
