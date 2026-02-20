import { useState, useEffect, useRef } from "react";
import { useCompanySettings, CompanySettings, useLegacyRates, LegacyRate } from "@/hooks/useCompanySettings";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PricingSettingsTab from "@/components/admin/PricingSettingsTab";
import AuditLogPage from "@/pages/admin/AuditLogPage";
import { Plus, Trash2, Search, Upload, ImageIcon } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────
const CURRENCIES = ["BBD", "USD", "EUR", "GBP", "CAD"];
const CALENDARS = ["Business HRS", "24/7", "Mon–Fri", "Mon–Sat"];
const COUNTRIES = ["Barbados", "Trinidad & Tobago", "Jamaica", "Guyana", "St. Lucia", "Antigua & Barbuda", "United States", "United Kingdom", "Canada"];
const VALUE_TYPES = ["percent", "fixed", "multiplier", "per_kg", "per_item", "per_shipment"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
    <Separator />
    {children}
  </div>
);

const Field = ({
  label, value, onChange, disabled, type = "text", placeholder,
}: {
  label: string; value: string; onChange?: (v: string) => void; disabled?: boolean; type?: string; placeholder?: string;
}) => (
  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
    <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
    <Input
      className="h-8 text-xs"
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
    />
  </div>
);

const ReadonlyField = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
    <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
    <span className="text-xs text-foreground">{value}</span>
  </div>
);

const SelectField = ({
  label, value, onChange, disabled, options,
}: {
  label: string; value: string; onChange?: (v: string) => void; disabled?: boolean; options: string[];
}) => (
  <div className="grid grid-cols-[140px_1fr] items-center gap-2">
    <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

// ─── Address Block ────────────────────────────────────────────────────────────
type AddressFields = {
  country: string; state: string; county: string;
  line1: string; line2: string; city: string; postcode: string;
};

const AddressBlock = ({
  prefix, label, form, setForm, usePhysical, onToggleUsePhysical, physicalAddr, canEdit,
}: {
  prefix: "bill" | "ship";
  label: string;
  form: Record<string, any>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  usePhysical: boolean;
  onToggleUsePhysical: (v: boolean) => void;
  physicalAddr: AddressFields;
  canEdit: boolean;
}) => {
  const get = (k: string) => {
    if (usePhysical) return physicalAddr[k as keyof AddressFields] ?? "";
    return form[`${prefix}_${k}`] ?? "";
  };
  const set = (k: string, v: string) => {
    if (!usePhysical) setForm((p) => ({ ...p, [`${prefix}_${k}`]: v }));
  };
  const locked = !canEdit || usePhysical;

  return (
    <Section title={label}>
      <div className="flex items-center gap-2 mb-1">
        <Checkbox
          id={`${prefix}_use_physical`}
          checked={usePhysical}
          onCheckedChange={(v) => canEdit && onToggleUsePhysical(!!v)}
          disabled={!canEdit}
        />
        <Label htmlFor={`${prefix}_use_physical`} className="text-xs cursor-pointer">Use Physical Address</Label>
        {usePhysical && <Badge variant="secondary" className="text-[10px]">Mirroring Physical</Badge>}
      </div>
      <div className="space-y-2 mt-2">
        <SelectField label="Country" value={get("country")} onChange={(v) => set("country", v)} disabled={locked} options={COUNTRIES} />
        <Field label="State / Province" value={get("state")} onChange={(v) => set("state", v)} disabled={locked} />
        <Field label="County" value={get("county")} onChange={(v) => set("county", v)} disabled={locked} />
        <Field label="Address Line 1" value={get("line1")} onChange={(v) => set("line1", v)} disabled={locked} />
        <Field label="Address Line 2" value={get("line2")} onChange={(v) => set("line2", v)} disabled={locked} />
        <Field label="City / Town" value={get("city")} onChange={(v) => set("city", v)} disabled={locked} />
        <Field label="Post Code" value={get("postcode")} onChange={(v) => set("postcode", v)} disabled={locked} />
      </div>
    </Section>
  );
};

// ─── Legacy Rates Tab ─────────────────────────────────────────────────────────
const LegacyRatesTab = ({ canEdit }: { canEdit: boolean }) => {
  const { data: rates = [], isLoading, upsertMutation, deleteMutation } = useLegacyRates();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editRows, setEditRows] = useState<Record<string, LegacyRate>>({});
  const [newRow, setNewRow] = useState<Partial<LegacyRate> | null>(null);

  const filtered = rates.filter(
    (r) =>
      r.rate_code.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (r: LegacyRate) => setEditRows((p) => ({ ...p, [r.id]: { ...r } }));
  const cancelEdit = (id: string) => setEditRows((p) => { const c = { ...p }; delete c[id]; return c; });
  const setEditField = (id: string, k: keyof LegacyRate, v: any) =>
    setEditRows((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));

  const saveRow = (id: string) => {
    upsertMutation.mutate(editRows[id], {
      onSuccess: () => { toast({ title: "Rate saved" }); cancelEdit(id); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const saveNew = () => {
    if (!newRow?.rate_code || !newRow?.value_type) {
      toast({ title: "Rate code and value type are required", variant: "destructive" }); return;
    }
    upsertMutation.mutate(newRow, {
      onSuccess: () => { toast({ title: "Rate added" }); setNewRow(null); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const toggleActive = (r: LegacyRate) => {
    upsertMutation.mutate({ id: r.id, is_active: !r.is_active });
  };

  const deleteRow = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: "Rate deleted" }),
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-40"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  const thCls = "px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";
  const tdCls = "px-2 py-1 text-xs";

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input className="h-8 text-xs pl-7" placeholder="Search rate code or description…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canEdit && (
          <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setNewRow({ rate_code: "", description: "", value_type: "percent", value: 0, is_active: true })}>
            <Plus className="h-3 w-3" /> Add Rate
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Legacy cost-engine rates used by the historical landed-cost calculator for supplies. These feed any system component that has not yet migrated to the new pricing engine.
      </p>

      <div className="rounded-lg border border-border overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 border-b border-border">
            <tr>
              <th className={thCls}>Rate Code</th>
              <th className={thCls}>Description</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Value</th>
              <th className={thCls}>Currency</th>
              <th className={thCls}>Eff. Date</th>
              <th className={thCls}>Active</th>
              {canEdit && <th className={thCls}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {/* New row */}
            {newRow && (
              <tr className="border-b border-border bg-primary/5">
                <td className={tdCls}><Input className="h-7 text-xs" placeholder="RATE_CODE" value={newRow.rate_code ?? ""} onChange={(e) => setNewRow((p) => ({ ...p, rate_code: e.target.value.toUpperCase() }))} /></td>
                <td className={tdCls}><Input className="h-7 text-xs" placeholder="Description" value={newRow.description ?? ""} onChange={(e) => setNewRow((p) => ({ ...p, description: e.target.value }))} /></td>
                <td className={tdCls}>
                  <Select value={newRow.value_type ?? "percent"} onValueChange={(v) => setNewRow((p) => ({ ...p, value_type: v }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{VALUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className={tdCls}><Input className="h-7 text-xs w-20" type="number" step="0.01" value={newRow.value ?? 0} onChange={(e) => setNewRow((p) => ({ ...p, value: +e.target.value }))} /></td>
                <td className={tdCls}><Input className="h-7 text-xs w-16" placeholder="BBD" value={newRow.currency ?? ""} onChange={(e) => setNewRow((p) => ({ ...p, currency: e.target.value || null }))} /></td>
                <td className={tdCls}><Input className="h-7 text-xs w-28" type="date" value={newRow.effective_date ?? ""} onChange={(e) => setNewRow((p) => ({ ...p, effective_date: e.target.value || null }))} /></td>
                <td className={tdCls}><Switch checked={newRow.is_active ?? true} onCheckedChange={(v) => setNewRow((p) => ({ ...p, is_active: v }))} /></td>
                <td className={tdCls}>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-[10px] px-2" onClick={saveNew}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setNewRow(null)}>Cancel</Button>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const editing = !!editRows[r.id];
              const row = editing ? editRows[r.id] : r;
              return (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className={tdCls}>
                    {editing
                      ? <Input className="h-7 text-xs" value={row.rate_code} onChange={(e) => setEditField(r.id, "rate_code", e.target.value.toUpperCase())} />
                      : <span className="font-mono font-medium">{r.rate_code}</span>}
                  </td>
                  <td className={tdCls}>
                    {editing
                      ? <Input className="h-7 text-xs" value={row.description} onChange={(e) => setEditField(r.id, "description", e.target.value)} />
                      : r.description}
                  </td>
                  <td className={tdCls}>
                    {editing
                      ? <Select value={row.value_type} onValueChange={(v) => setEditField(r.id, "value_type", v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{VALUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      : <Badge variant="outline" className="text-[10px]">{r.value_type}</Badge>}
                  </td>
                  <td className={tdCls}>
                    {editing
                      ? <Input className="h-7 text-xs w-20" type="number" step="0.01" value={row.value} onChange={(e) => setEditField(r.id, "value", +e.target.value)} />
                      : r.value}
                  </td>
                  <td className={tdCls}>
                    {editing
                      ? <Input className="h-7 text-xs w-16" value={row.currency ?? ""} onChange={(e) => setEditField(r.id, "currency", e.target.value || null)} />
                      : r.currency ?? "—"}
                  </td>
                  <td className={tdCls}>
                    {editing
                      ? <Input className="h-7 text-xs w-28" type="date" value={row.effective_date ?? ""} onChange={(e) => setEditField(r.id, "effective_date", e.target.value || null)} />
                      : r.effective_date ?? "—"}
                  </td>
                  <td className={tdCls}>
                    <Switch checked={row.is_active} onCheckedChange={() => canEdit && toggleActive(r)} disabled={!canEdit} />
                  </td>
                  {canEdit && (
                    <td className={tdCls}>
                      {editing ? (
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => saveRow(r.id)} disabled={upsertMutation.isPending}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => cancelEdit(r.id)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => startEdit(r)}>Edit</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-destructive hover:text-destructive" onClick={() => deleteRow(r.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && !newRow && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">No legacy rates found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CompanySettingsPage = () => {
  const { data: settings, isLoading, updateMutation } = useCompanySettings();
  const { canEdit } = useAdminRole();
  const { toast } = useToast();
  const { logChange } = useAuditLog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const physicalAddr = {
    country: form.physical_country ?? "",
    state: form.physical_state ?? "",
    county: form.physical_county ?? "",
    line1: form.physical_line1 ?? "",
    line2: form.physical_line2 ?? "",
    city: form.physical_city ?? "",
    postcode: form.physical_postcode ?? "",
  };

  const handleToggleBillPhysical = (v: boolean) => {
    set("bill_use_physical", v);
    if (v) {
      setForm((p) => ({
        ...p,
        bill_use_physical: true,
        bill_country: p.physical_country,
        bill_state: p.physical_state,
        bill_county: p.physical_county,
        bill_line1: p.physical_line1,
        bill_line2: p.physical_line2,
        bill_city: p.physical_city,
        bill_postcode: p.physical_postcode,
      }));
    }
  };

  const handleToggleShipPhysical = (v: boolean) => {
    set("ship_use_physical", v);
    if (v) {
      setForm((p) => ({
        ...p,
        ship_use_physical: true,
        ship_country: p.physical_country,
        ship_state: p.physical_state,
        ship_county: p.physical_county,
        ship_line1: p.physical_line1,
        ship_line2: p.physical_line2,
        ship_city: p.physical_city,
        ship_postcode: p.physical_postcode,
      }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `company-logo/logo.${ext}`;
      const { error: upErr } = await supabase.storage.from("data-files").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("data-files").getPublicUrl(path);
      const logoUrl = urlData?.publicUrl ?? "";
      setForm((p) => ({ ...p, logo_file_name: file.name, logo_url: logoUrl }));
      toast({ title: "Logo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRe.test(form.email)) {
      toast({ title: "Invalid email address", variant: "destructive" }); return;
    }
    const { id, updated_at, ...updates } = form;
    updateMutation.mutate(updates, {
      onSuccess: () => {
        toast({ title: "Settings saved" });
        logChange({ table_name: "company_settings", record_id: settings?.id ?? "", action: "update", old_data: settings as any, new_data: { ...updates, name: "Company Settings" } });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <h1 className="text-lg font-semibold text-foreground">Settings</h1>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="company" className="text-xs">Company Variables</TabsTrigger>
          <TabsTrigger value="legacy" className="text-xs">Legacy Rates</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs">Pricing Settings</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit Log</TabsTrigger>
        </TabsList>

        {/* ── Company Variables ── */}
        <TabsContent value="company">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pt-2 max-w-5xl">

            {/* General */}
            <Section title="General">
              <Field label="Company Name" value={form.company_name ?? ""} onChange={(v) => set("company_name", v)} disabled={!canEdit} />
              <Field label="Primary Contact" value={form.primary_contact ?? ""} onChange={(v) => set("primary_contact", v)} disabled={!canEdit} />
              <Field label="Email" value={form.email ?? ""} onChange={(v) => set("email", v)} disabled={!canEdit} type="email" />
              <Field label="Tel" value={form.tel ?? ""} onChange={(v) => set("tel", v)} disabled={!canEdit} />
              <Field label="Fax" value={form.fax ?? ""} onChange={(v) => set("fax", v)} disabled={!canEdit} />
              <Field label="Tax Number / TIN" value={form.tax_tin ?? ""} onChange={(v) => set("tax_tin", v)} disabled={!canEdit} />
              <SelectField label="Base Currency" value={form.base_currency ?? "BBD"} onChange={(v) => set("base_currency", v)} disabled={!canEdit} options={CURRENCIES} />
              <SelectField label="Business Calendar" value={form.business_calendar ?? "Business HRS"} onChange={(v) => set("business_calendar", v)} disabled={!canEdit} options={CALENDARS} />
            </Section>

            {/* Physical Address */}
            <Section title="Physical Address">
              <SelectField label="Country" value={form.physical_country ?? "Barbados"} onChange={(v) => set("physical_country", v)} disabled={!canEdit} options={COUNTRIES} />
              <Field label="State / Province" value={form.physical_state ?? ""} onChange={(v) => set("physical_state", v)} disabled={!canEdit} />
              <Field label="County" value={form.physical_county ?? ""} onChange={(v) => set("physical_county", v)} disabled={!canEdit} />
              <Field label="Address Line 1" value={form.physical_line1 ?? ""} onChange={(v) => set("physical_line1", v)} disabled={!canEdit} />
              <Field label="Address Line 2" value={form.physical_line2 ?? ""} onChange={(v) => set("physical_line2", v)} disabled={!canEdit} />
              <Field label="City / Town" value={form.physical_city ?? ""} onChange={(v) => set("physical_city", v)} disabled={!canEdit} />
              <Field label="Post Code" value={form.physical_postcode ?? ""} onChange={(v) => set("physical_postcode", v)} disabled={!canEdit} />
            </Section>

            {/* Bill-To Address */}
            <AddressBlock
              prefix="bill"
              label="Bill-To Address"
              form={form}
              setForm={setForm}
              usePhysical={!!form.bill_use_physical}
              onToggleUsePhysical={handleToggleBillPhysical}
              physicalAddr={physicalAddr}
              canEdit={canEdit}
            />

            {/* Ship-To Address */}
            <AddressBlock
              prefix="ship"
              label="Ship-To Address"
              form={form}
              setForm={setForm}
              usePhysical={!!form.ship_use_physical}
              onToggleUsePhysical={handleToggleShipPhysical}
              physicalAddr={physicalAddr}
              canEdit={canEdit}
            />

            {/* Theme (read-only) */}
            <Section title="Theme">
              <p className="text-[10px] text-muted-foreground mb-1">Application theme colors are set globally and cannot be changed here.</p>
              <ReadonlyField label="Primary Color" value="Navy" />
              <ReadonlyField label="Secondary Color" value="Gray" />
            </Section>

            {/* Slogan */}
            <Section title="Slogan">
              <Field label="Slogan" value={form.slogan ?? ""} onChange={(v) => set("slogan", v)} disabled={!canEdit} placeholder="Helping people see better" />
            </Section>

            {/* Logo */}
            <Section title="Logo">
              {form.logo_url && (
                <div className="flex items-center gap-3 mb-2">
                  <img src={form.logo_url} alt="Company logo" className="h-14 object-contain border border-border rounded p-1 bg-background" />
                  <div className="text-[10px] text-muted-foreground">
                    <p className="font-medium text-foreground">{form.logo_file_name}</p>
                    <p>Stored URL: {form.logo_url}</p>
                  </div>
                </div>
              )}
              {!form.logo_url && (
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-xs">No logo uploaded</span>
                </div>
              )}
              {canEdit && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="h-3 w-3" />
                    {uploading ? "Uploading…" : "Upload Logo"}
                  </Button>
                </>
              )}
            </Section>

          </div>

          {/* Save button */}
          {canEdit && (
            <div className="pt-4 max-w-5xl">
              <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save Company Variables"}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Legacy Rates ── */}
        <TabsContent value="legacy">
          <LegacyRatesTab canEdit={canEdit} />
        </TabsContent>

        {/* ── Pricing Settings ── */}
        <TabsContent value="pricing">
          <div className="pt-2">
            <PricingSettingsTab />
          </div>
        </TabsContent>

        {/* ── Audit Log ── */}
        <TabsContent value="audit">
          <div className="pt-2">
            <AuditLogPage embedded />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanySettingsPage;
