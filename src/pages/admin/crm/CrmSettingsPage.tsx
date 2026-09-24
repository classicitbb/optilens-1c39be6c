import { useSearchParams } from "react-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContactTagsConfigPage from "@/pages/admin/erp/ContactTagsConfigPage";
import IndustriesConfigPage from "@/pages/admin/erp/IndustriesConfigPage";
import LeadSettingsPage from "@/pages/admin/leads/LeadSettingsPage";

// One CRM settings page (/admin/crm/settings?section=...) for what used to be
// Contacts → Tags/Industries config and Leads → Settings.
const SECTIONS = [
  { value: "tags", label: "Contact Tags", Page: ContactTagsConfigPage },
  { value: "industries", label: "Industries", Page: IndustriesConfigPage },
  { value: "leads", label: "Lead Providers", Page: LeadSettingsPage },
] as const;

type SectionValue = (typeof SECTIONS)[number]["value"];

const CrmSettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("section");
  const active = SECTIONS.find((s) => s.value === requested) ?? SECTIONS[0];

  return (
    <div className="space-y-4">
      <Tabs value={active.value} onValueChange={(value) => setSearchParams({ section: value as SectionValue }, { replace: true })}>
        <TabsList className="h-8">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.value} value={s.value} className="text-xs">
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <active.Page />
    </div>
  );
};

export default CrmSettingsPage;
