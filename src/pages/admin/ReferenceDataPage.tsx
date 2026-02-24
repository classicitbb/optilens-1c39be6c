import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ReferenceDataTable from "@/components/admin/ReferenceDataTable";

const ENTITIES = [
  { key: "suppliers", table: "suppliers", label: "Suppliers" },
  { key: "brands", table: "brands", label: "Brands" },
  { key: "materials", table: "materials", label: "Materials" },
  { key: "mftypes", table: "mftypes", label: "MF Types" },
  { key: "lenstypes", table: "lenstypes", label: "Lens Types" },
  { key: "lens_options", table: "lens_options", label: "Lens Options" },
  { key: "finishtypes", table: "finishtypes", label: "Finish Types" },
];

const ReferenceDataPage = () => {
  const [activeTab, setActiveTab] = useState(ENTITIES[0].key);
  const active = ENTITIES.find((e) => e.key === activeTab)!;
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/admin/catalog")} className="p-1 rounded hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" style={{ color: "hsl(215 30% 40%)" }} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
          Reference Data
        </h1>
      </div>

      <div className="flex gap-0 border-b" style={{ borderColor: "hsl(215 15% 85%)" }}>
        {ENTITIES.map((e) => (
          <button
            key={e.key}
            onClick={() => setActiveTab(e.key)}
            className="px-4 py-2 text-sm font-medium transition-colors relative"
            style={{
              color: activeTab === e.key ? "hsl(215 30% 15%)" : "hsl(215 15% 50%)",
            }}
          >
            {e.label}
            {activeTab === e.key && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "hsl(215 65% 50%)" }}
              />
            )}
          </button>
        ))}
      </div>

      <ReferenceDataTable key={active.table} table={active.table} entityLabel={active.label} />
    </div>
  );
};

export default ReferenceDataPage;
