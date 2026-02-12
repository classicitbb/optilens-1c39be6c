import { useParams, Navigate } from "react-router-dom";
import ReferenceDataTable from "@/components/admin/ReferenceDataTable";

const ENTITIES: Record<string, { table: string; label: string }> = {
  suppliers: { table: "suppliers", label: "Suppliers" },
  brands: { table: "brands", label: "Brands" },
  materials: { table: "materials", label: "Materials" },
  mftypes: { table: "mftypes", label: "MF Types" },
  lenstypes: { table: "lenstypes", label: "Lens Types" },
  "lens-options": { table: "lens_options", label: "Lens Options" },
};

const ReferenceDataPage = () => {
  const { entity } = useParams<{ entity: string }>();
  const config = entity ? ENTITIES[entity] : undefined;

  if (!config) return <Navigate to="/admin/reference/suppliers" replace />;

  return <ReferenceDataTable key={config.table} table={config.table} entityLabel={config.label} />;
};

export default ReferenceDataPage;
