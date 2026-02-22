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
import { Textarea } from "@/components/ui/textarea";
import PricingSettingsTab from "@/components/admin/PricingSettingsTab";
import AuditLogPage from "@/pages/admin/AuditLogPage";
import { Plus, Trash2, Search, Upload, ImageIcon, X, Building2, MapPin, FileText } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────
const CURRENCIES = ["BBD", "USD", "EUR", "GBP", "CAD"];
const CALENDARS = ["Business HRS", "24/7", "Mon–Fri", "Mon–Sat"];
const COUNTRIES = ["Barbados", "Trinidad & Tobago", "Jamaica", "Guyana", "St. Lucia", "Antigua & Barbuda", "United States", "United Kingdom", "Canada"];
const VALUE_TYPES = ["percent", "fixed", "multiplier", "per_kg", "per_item", "per_shipment"];

// ─── Compact Widget Section (styled like JsonGrid tags) ──────────────────────
const WidgetSection = ({ title, icon, children, collapsible }: { title: string; icon?: React.ReactNode; children: React.ReactNode; collapsible?: boolean }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-2 rounded-lg border border-border p-3 bg-card">
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left"
        onClick={() => collapsible && setOpen(!open)}
      >
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">{title}</h3>
        {collapsible && <span className="text-[10px] text-muted-foreground">{open ? "▾" : "▸"}</span>}
      </button>
      {open && <div className="space-y-2 pt-1">{children}</div>}
    </div>
  );
};

// ─── Compact inline field (tag-style) ────────────────────────────────────────
const TagField = ({ label, value, onChange, disabled, type = "text", placeholder, className = "" }: {
  label: string; value: string; onChange?: (v: string) => void; disabled?: boolean; type?: string; placeholder?: string; className?: string;
}) => (
  <div className={`flex items-center gap-1 rounded border border-border bg-muted/50 px-2 py-1 ${className}`}>
    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{label}</span>
    <Input
      className="h-6 text-[10px] min-w-[80px] border-0 bg-transparent p-0 focus-visible:ring-0"
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
    />
  </div>
);

const TagSelect = ({ label, value, onChange, disabled, options }: {
  label: string; value: string; onChange?: (v: string) => void; disabled?: boolean; options: string[];
}) => (
  <div className="flex items-center gap-1 rounded border border-border bg-muted/50 px-2 py-1">
    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{label}</span>
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent p-0 min-w-[70px] focus:ring-0"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
    </Select>
  </div>
);

// ─── Address Widget ──────────────────────────────────────────────────────────
type AddressFields = {
  country: string; state: string; county: string;
  line1: string; line2: string; city: string; postcode: string;
};

const AddressWidget = ({
  prefix, label, form, setForm, usePhysical, onToggleUsePhysical, physicalAddr, canEdit,
}: {
  prefix: "bill" | "ship"; label: string; form: Record<string, any>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  usePhysical: boolean; onToggleUsePhysical: (v: boolean) => void;
  physicalAddr: AddressFields; canEdit: boolean;
}) => {
  const get = (k: string) => usePhysical ? physicalAddr[k as keyof AddressFields] ?? "" : form[`${prefix}_${k}`] ?? "";
  const set = (k: string, v: string) => { if (!usePhysical) setForm((p) => ({ ...p, [`${prefix}_${k}`]: v })); };
  const locked = !canEdit || usePhysical;

  return (
    <WidgetSection title={label} icon={<MapPin className="h-3 w-3 text-muted-foreground" />} collapsible>
      <div className="flex items-center gap-2 mb-1">
        <Checkbox
          id={`${prefix}_use_physical`}
          checked={usePhysical}
          onCheckedChange={(v) => canEdit && onToggleUsePhysical(!!v)}
          disabled={!canEdit}
        />
        <Label htmlFor={`${prefix}_use_physical`} className="text-[10px] cursor-pointer">Use Physical Address</Label>
        {usePhysical && <Badge variant="secondary" className="text-[10px]">Mirroring</Badge>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <TagSelect label="Country" value={get("country")} onChange={(v) => set("country", v)} disabled={locked} options={COUNTRIES} />
        <TagField label="State" value={get("state")} onChange={(v) => set("state", v)} disabled={locked} />
        <TagField label="County" value={get("county")} onChange={(v) => set("county", v)} disabled={locked} />
        <TagField label="Line 1" value={get("line1")} onChange={(v) => set("line1", v)} disabled={locked} />
        <TagField label="Line 2" value={get("line2")} onChange={(v) => set("line2", v)} disabled={locked} />
        <TagField label="City" value={get("city")} onChange={(v) => set("city", v)} disabled={locked} />
        <TagField label="Postcode" value={get("postcode")} onChange={(v) => set("postcode", v)} disabled={locked} />
      </div>
    </WidgetSection>
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
        Legacy cost-engine rates used by the historical landed-cost calculator for supplies.
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

// ─── Company Variables Widget (embedded in Pricing Settings) ─────────────────
export const CompanyVariablesWidget = ({
  form, setForm, canEdit, onLogoUpload, uploading, fileInputRef,
}: {
  form: Record<string, any>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  canEdit: boolean;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) => {
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const physicalAddr: AddressFields = {
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
        ...p, bill_use_physical: true,
        bill_country: p.physical_country, bill_state: p.physical_state, bill_county: p.physical_county,
        bill_line1: p.physical_line1, bill_line2: p.physical_line2, bill_city: p.physical_city, bill_postcode: p.physical_postcode,
      }));
    }
  };

  const handleToggleShipPhysical = (v: boolean) => {
    set("ship_use_physical", v);
    if (v) {
      setForm((p) => ({
        ...p, ship_use_physical: true,
        ship_country: p.physical_country, ship_state: p.physical_state, ship_county: p.physical_county,
        ship_line1: p.physical_line1, ship_line2: p.physical_line2, ship_city: p.physical_city, ship_postcode: p.physical_postcode,
      }));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {/* Identity */}
      <WidgetSection title="Company Identity" icon={<Building2 className="h-3 w-3 text-muted-foreground" />}>
        <div className="flex flex-wrap gap-1.5">
          <TagField label="Name" value={form.company_name ?? ""} onChange={(v) => set("company_name", v)} disabled={!canEdit} className="flex-1 min-w-[180px]" />
          <TagField label="Contact" value={form.primary_contact ?? ""} onChange={(v) => set("primary_contact", v)} disabled={!canEdit} />
          <TagField label="Email" value={form.email ?? ""} onChange={(v) => set("email", v)} disabled={!canEdit} type="email" />
          <TagField label="Tel" value={form.tel ?? ""} onChange={(v) => set("tel", v)} disabled={!canEdit} />
          <TagField label="Fax" value={form.fax ?? ""} onChange={(v) => set("fax", v)} disabled={!canEdit} />
          <TagField label="TIN" value={form.tax_tin ?? ""} onChange={(v) => set("tax_tin", v)} disabled={!canEdit} />
          <TagSelect label="Currency" value={form.base_currency ?? "BBD"} onChange={(v) => set("base_currency", v)} disabled={!canEdit} options={CURRENCIES} />
          <TagSelect label="Calendar" value={form.business_calendar ?? "Business HRS"} onChange={(v) => set("business_calendar", v)} disabled={!canEdit} options={CALENDARS} />
          <TagField label="Slogan" value={form.slogan ?? ""} onChange={(v) => set("slogan", v)} disabled={!canEdit} className="flex-1 min-w-[200px]" />
        </div>
      </WidgetSection>

      {/* Logo */}
      <WidgetSection title="Logo" icon={<ImageIcon className="h-3 w-3 text-muted-foreground" />}>
        <div className="flex items-center gap-3">
          {form.logo_url ? (
            <img
              src={form.logo_url}
              alt="Company logo"
              className="h-12 w-auto object-contain border border-border p-1 bg-background"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="h-12 w-12 flex items-center justify-center border border-dashed border-border bg-muted/30">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            {form.logo_file_name && <p className="text-[10px] font-medium text-foreground">{form.logo_file_name}</p>}
            {canEdit && (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 mt-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-3 w-3" />
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              </>
            )}
          </div>
        </div>
      </WidgetSection>

      {/* Physical Address */}
      <WidgetSection title="Physical Address" icon={<MapPin className="h-3 w-3 text-muted-foreground" />} collapsible>
        <div className="flex flex-wrap gap-1.5">
          <TagSelect label="Country" value={form.physical_country ?? "Barbados"} onChange={(v) => set("physical_country", v)} disabled={!canEdit} options={COUNTRIES} />
          <TagField label="State" value={form.physical_state ?? ""} onChange={(v) => set("physical_state", v)} disabled={!canEdit} />
          <TagField label="County" value={form.physical_county ?? ""} onChange={(v) => set("physical_county", v)} disabled={!canEdit} />
          <TagField label="Line 1" value={form.physical_line1 ?? ""} onChange={(v) => set("physical_line1", v)} disabled={!canEdit} />
          <TagField label="Line 2" value={form.physical_line2 ?? ""} onChange={(v) => set("physical_line2", v)} disabled={!canEdit} />
          <TagField label="City" value={form.physical_city ?? ""} onChange={(v) => set("physical_city", v)} disabled={!canEdit} />
          <TagField label="Postcode" value={form.physical_postcode ?? ""} onChange={(v) => set("physical_postcode", v)} disabled={!canEdit} />
        </div>
      </WidgetSection>

      {/* Bill-To */}
      <AddressWidget
        prefix="bill" label="Bill-To Address" form={form} setForm={setForm}
        usePhysical={!!form.bill_use_physical} onToggleUsePhysical={handleToggleBillPhysical}
        physicalAddr={physicalAddr} canEdit={canEdit}
      />

      {/* Ship-To */}
      <AddressWidget
        prefix="ship" label="Ship-To Address" form={form} setForm={setForm}
        usePhysical={!!form.ship_use_physical} onToggleUsePhysical={handleToggleShipPhysical}
        physicalAddr={physicalAddr} canEdit={canEdit}
      />

      {/* PDF Export Header/Footer */}
      <WidgetSection title="PDF Export Header & Footer" icon={<FileText className="h-3 w-3 text-muted-foreground" />}>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-medium text-muted-foreground">Header (appears on all PDF exports)</Label>
            <Textarea
              className="text-xs min-h-[60px] font-mono"
              placeholder="<b>Company Name</b> — Your tagline here"
              value={form.pdf_header_html ?? ""}
              onChange={(e) => set("pdf_header_html", e.target.value)}
              disabled={!canEdit}
            />
            <p className="text-[9px] text-muted-foreground">Supports basic HTML: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;br&gt;, &lt;span style="..."&gt;</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-medium text-muted-foreground">Footer (appears on all PDF exports)</Label>
            <Textarea
              className="text-xs min-h-[60px] font-mono"
              placeholder="All prices subject to change · &lt;i&gt;Thank you for your business&lt;/i&gt;"
              value={form.pdf_footer_html ?? ""}
              onChange={(e) => set("pdf_footer_html", e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>
      </WidgetSection>
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
          <div className="pt-2">
            <CompanyVariablesWidget
              form={form}
              setForm={setForm}
              canEdit={canEdit}
              onLogoUpload={handleLogoUpload}
              uploading={uploading}
              fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
            />

            {canEdit && (
              <div className="pt-4">
                <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save Company Variables"}
                </Button>
              </div>
            )}
          </div>
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