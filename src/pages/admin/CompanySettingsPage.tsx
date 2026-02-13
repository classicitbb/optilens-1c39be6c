import { useState, useEffect } from "react";
import { useCompanySettings, CompanySettings } from "@/hooks/useCompanySettings";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PricingSettingsTab from "@/components/admin/PricingSettingsTab";

const FIELDS: { key: keyof Omit<CompanySettings, "id" | "updated_at">; label: string; hint: string }[] = [
  { key: "import_duty", label: "Import Duty", hint: "e.g. 0.20 = 20%" },
  { key: "frames_duty", label: "Frames Duty", hint: "e.g. 0.30 = 30%" },
  { key: "default_vat", label: "Default VAT %", hint: "e.g. 0.175 = 17.5%" },
  { key: "labour_percent", label: "Labour %", hint: "e.g. 0.10 = 10%" },
  { key: "profit_percent", label: "Profit %", hint: "e.g. 0.35 = 35%" },
  { key: "import_multiple", label: "Import Multiple", hint: "e.g. 2.55" },
  { key: "wholesale_stock_percentage", label: "Wholesale Stock %", hint: "e.g. 0.15 = 15%" },
];

const CompanySettingsPage = () => {
  const { data: settings, isLoading, updateMutation } = useCompanySettings();
  const { canEdit } = useAdminRole();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, number>>({});

  useEffect(() => {
    if (settings) {
      const vals: Record<string, number> = {};
      FIELDS.forEach((f) => (vals[f.key] = (settings as any)[f.key] ?? 0));
      setForm(vals);
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate(form as any, {
      onSuccess: () => toast({ title: "Settings saved" }),
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-foreground">Parameters</h1>
      <Tabs defaultValue="company" className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="company" className="text-xs">Company Info</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs">Pricing Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          {isLoading ? (
            <div className="flex items-center justify-center h-40"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <div className="space-y-4 max-w-lg pt-2">
              <p className="text-xs text-muted-foreground">
                Legacy cost-engine rates. These values are used by the existing landed-cost calculator for supplies.
              </p>
              <div className="space-y-3">
                {FIELDS.map((f) => (
                  <div key={f.key} className="grid grid-cols-[140px_1fr_1fr] items-center gap-2">
                    <Label className="text-xs font-medium">{f.label}</Label>
                    <Input
                      className="h-8 text-xs"
                      type="number"
                      step="0.001"
                      value={form[f.key] ?? 0}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: +e.target.value }))}
                      disabled={!canEdit}
                    />
                    <span className="text-[10px] text-muted-foreground">{f.hint}</span>
                  </div>
                ))}
              </div>
              {canEdit && (
                <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save Settings"}
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pricing">
          <div className="pt-2">
            <PricingSettingsTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanySettingsPage;
