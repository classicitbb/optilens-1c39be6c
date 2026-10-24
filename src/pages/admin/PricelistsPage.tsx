import { Tags } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import PricelistVersionsSection from "@/components/admin/PricelistVersionsSection";

const PricelistsPage = () => (
  <div className="space-y-4">
    <AdminPageHeader icon={Tags} title="Pricelists" />
    <PricelistVersionsSection />
  </div>
);

export default PricelistsPage;
