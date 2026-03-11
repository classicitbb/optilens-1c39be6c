import { useState, useEffect, useRef } from "react";
import { useCompanySettings, CompanySettings } from "@/hooks/useCompanySettings";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { Upload, ImageIcon, Building2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

const CURRENCIES = ["BBD", "USD", "EUR", "GBP", "CAD"];
const CALENDARS = ["Business HRS", "24/7", "Mon–Fri", "Mon–Sat"];

const COUNTRY_DATA: Record<string, {states: string[];cities: string[];}> = {
  "Barbados": { states: ["Christ Church", "St. Andrew", "St. George", "St. James", "St. John", "St. Joseph", "St. Lucy", "St. Michael", "St. Peter", "St. Philip", "St. Thomas"], cities: ["Bridgetown", "Speightstown", "Holetown", "Oistins", "Bathsheba", "Crane"] },
  "Trinidad & Tobago": { states: ["Arima", "Chaguanas", "Couva-Tabaquite-Talparo", "Diego Martin", "Mayaro-Rio Claro", "Penal-Debe", "Point Fortin", "Port of Spain", "Princes Town", "San Fernando", "San Juan-Laventille", "Sangre Grande", "Siparia", "Tobago", "Tunapuna-Piarco"], cities: ["Port of Spain", "San Fernando", "Chaguanas", "Arima", "Point Fortin", "Scarborough"] },
  "Jamaica": { states: ["Clarendon", "Hanover", "Kingston", "Manchester", "Portland", "St. Andrew", "St. Ann", "St. Catherine", "St. Elizabeth", "St. James", "St. Mary", "St. Thomas", "Trelawny", "Westmoreland"], cities: ["Kingston", "Montego Bay", "Spanish Town", "Portmore", "Mandeville", "May Pen", "Old Harbour"] },
  "Guyana": { states: ["Barima-Waini", "Cuyuni-Mazaruni", "Demerara-Mahaica", "East Berbice-Corentyne", "Essequibo Islands-West Demerara", "Mahaica-Berbice", "Pomeroon-Supenaam", "Potaro-Siparuni", "Upper Demerara-Berbice", "Upper Takutu-Upper Essequibo"], cities: ["Georgetown", "Linden", "New Amsterdam", "Anna Regina", "Bartica", "Corriverton"] },
  "St. Lucia": { states: ["Anse la Raye", "Canaries", "Castries", "Choiseul", "Dennery", "Gros Islet", "Laborie", "Micoud", "Soufrière", "Vieux Fort"], cities: ["Castries", "Vieux Fort", "Soufrière", "Gros Islet", "Micoud", "Dennery"] },
  "Grenada": { states: ["St. Andrew", "St. David", "St. George", "St. John", "St. Mark", "St. Patrick", "Carriacou and Petite Martinique"], cities: ["St. George's", "Gouyave", "Grenville", "Sauteurs", "Victoria", "Hillsborough"] },
  "Antigua & Barbuda": { states: ["St. George", "St. John", "St. Mary", "St. Paul", "St. Peter", "St. Philip", "Barbuda", "Redonda"], cities: ["St. John's", "All Saints", "Liberta", "Potter's Village", "Bolans", "Codrington"] },
  "Dominica": { states: ["St. Andrew", "St. David", "St. George", "St. John", "St. Joseph", "St. Luke", "St. Mark", "St. Patrick", "St. Paul", "St. Peter"], cities: ["Roseau", "Portsmouth", "Marigot", "Berekua", "Mahaut", "St. Joseph"] },
  "St. Vincent": { states: ["Charlotte", "Grenadines", "St. Andrew", "St. David", "St. George", "St. Patrick"], cities: ["Kingstown", "Georgetown", "Barrouallie", "Chateaubelair", "Layou", "Calliaqua"] },
  "Bahamas": { states: ["New Providence", "Grand Bahama", "Abaco", "Andros", "Eleuthera", "Exuma", "Long Island", "Cat Island", "Bimini", "Inagua"], cities: ["Nassau", "Freeport", "West End", "Coopers Town", "Marsh Harbour", "George Town"] },
  "Cayman": { states: ["Grand Cayman", "Cayman Brac", "Little Cayman"], cities: ["George Town", "West Bay", "Bodden Town", "North Side", "East End", "Stake Bay"] },
  "Turks and Caicos": { states: ["Grand Turk", "Salt Cay", "South Caicos", "Middle Caicos", "North Caicos", "Providenciales"], cities: ["Cockburn Town", "Providenciales", "Balfour Town", "Kew", "Bottle Creek", "Conch Bar"] },
  "United States": { states: ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"], cities: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Miami"] },
  "United Kingdom": { states: ["England", "Scotland", "Wales", "Northern Ireland"], cities: ["London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Edinburgh", "Leeds", "Bristol", "Cardiff", "Belfast"] },
  "Canada": { states: ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan"], cities: ["Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Halifax"] }
};
const COUNTRIES = Object.keys(COUNTRY_DATA);

// ─── Reusable field components ───────────────────────────────────────────────
const Field = ({ label, children }: {label: string;children: React.ReactNode;}) =>
<div className="space-y-1">
    <Label className="text-xs font-medium">{label}</Label>
    {children}
  </div>;


const Section = ({ title, children }: {title: string;children: React.ReactNode;}) =>
<div className="space-y-3 rounded-lg border border-[hsl(var(--admin-table-border))] p-4 bg-[hsl(var(--admin-card))]">
    <h3 className="text-sm font-semibold text-[hsl(var(--admin-content-fg))]">{title}</h3>
    {children}
  </div>;


// ─── Address Card ────────────────────────────────────────────────────────────
type AddressFields = {country: string;state: string;county: string;line1: string;line2: string;city: string;postcode: string;};

const AddressCard = ({
  prefix, title, form, setForm, usePhysical, onToggleUsePhysical, physicalAddr, canEdit





}: {prefix: "bill" | "ship";title: string;form: Record<string, any>;setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;usePhysical: boolean;onToggleUsePhysical: (v: boolean) => void;physicalAddr: AddressFields;canEdit: boolean;}) => {
  const get = (k: string) => usePhysical ? physicalAddr[k as keyof AddressFields] ?? "" : form[`${prefix}_${k}`] ?? "";
  const set = (k: string, v: string) => {if (!usePhysical) setForm((p) => ({ ...p, [`${prefix}_${k}`]: v }));};
  const locked = !canEdit || usePhysical;

  return (
    <Section title={title}>
      <div className="flex items-center gap-2 mb-2">
        <Checkbox
          id={`${prefix}_use_physical`}
          checked={usePhysical}
          onCheckedChange={(v) => canEdit && onToggleUsePhysical(!!v)}
          disabled={!canEdit} />

        <Label htmlFor={`${prefix}_use_physical`} className="text-xs cursor-pointer">Use Physical Address</Label>
        {usePhysical && <Badge variant="secondary" className="text-[10px]">Mirroring</Badge>}
      </div>
      {(() => {
        const country = get("country");
        const countryInfo = COUNTRY_DATA[country];
        const states = countryInfo?.states ?? [];
        const cities = countryInfo?.cities ?? [];
        return (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Country">
              <Select value={country} onValueChange={(v) => {set("country", v);set("state", "");set("city", "");}} disabled={locked}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="State">
              <Select value={get("state")} onValueChange={(v) => set("state", v)} disabled={locked}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{states.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="City">
              <Select value={get("city")} onValueChange={(v) => set("city", v)} disabled={locked}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>{cities.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="County"><Input className="h-8 text-xs" value={get("county")} onChange={(e) => set("county", e.target.value)} disabled={locked} /></Field>
            <Field label="Line 1"><Input className="h-8 text-xs" value={get("line1")} onChange={(e) => set("line1", e.target.value)} disabled={locked} /></Field>
            <Field label="Line 2"><Input className="h-8 text-xs" value={get("line2")} onChange={(e) => set("line2", e.target.value)} disabled={locked} /></Field>
            <Field label="Postcode"><Input className="h-8 text-xs" value={get("postcode")} onChange={(e) => set("postcode", e.target.value)} disabled={locked} /></Field>
          </div>);

      })()}
    </Section>);

};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CompanySettingsPage = () => {
  const { data: settings, isLoading, updateMutation } = useCompanySettings();
  const { canEdit } = useAdminRole();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

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
      set("logo_file_name", file.name);
      set("logo_url", logoUrl);
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
      toast({ title: "Invalid email address", variant: "destructive" });return;
    }
    const { id, updated_at, ...updates } = form;
    updateMutation.mutate(updates, {
      onSuccess: () => {
        toast({ title: "Settings saved" });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
    });
  };

  const physicalAddr: AddressFields = {
    country: form.physical_country ?? "", state: form.physical_state ?? "",
    county: form.physical_county ?? "", line1: form.physical_line1 ?? "",
    line2: form.physical_line2 ?? "", city: form.physical_city ?? "",
    postcode: form.physical_postcode ?? ""
  };

  const handleToggleBillPhysical = (v: boolean) => {
    set("bill_use_physical", v);
    if (v) {
      setForm((p) => ({
        ...p, bill_use_physical: true,
        bill_country: p.physical_country, bill_state: p.physical_state, bill_county: p.physical_county,
        bill_line1: p.physical_line1, bill_line2: p.physical_line2, bill_city: p.physical_city, bill_postcode: p.physical_postcode
      }));
    }
  };

  const handleToggleShipPhysical = (v: boolean) => {
    set("ship_use_physical", v);
    if (v) {
      setForm((p) => ({
        ...p, ship_use_physical: true,
        ship_country: p.physical_country, ship_state: p.physical_state, ship_county: p.physical_county,
        ship_line1: p.physical_line1, ship_line2: p.physical_line2, ship_city: p.physical_city, ship_postcode: p.physical_postcode
      }));
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>);


  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <AdminPageHeader icon={Building2} title="Company Settings" />

          <div className="pt-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Identity */}
              <Section title="Company Identity">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Company Name"><Input className="h-8 text-xs" value={form.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} disabled={!canEdit} /></Field>
                  <Field label="Primary Contact"><Input className="h-8 text-xs" value={form.primary_contact ?? ""} onChange={(e) => set("primary_contact", e.target.value)} disabled={!canEdit} /></Field>
                  <Field label="Email"><Input className="h-8 text-xs" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} disabled={!canEdit} /></Field>
                  <Field label="Tel"><Input className="h-8 text-xs" value={form.tel ?? ""} onChange={(e) => set("tel", e.target.value)} disabled={!canEdit} /></Field>
                  <Field label="Fax"><Input className="h-8 text-xs" value={form.fax ?? ""} onChange={(e) => set("fax", e.target.value)} disabled={!canEdit} /></Field>
                  <Field label="Tax TIN"><Input className="h-8 text-xs" value={form.tax_tin ?? ""} onChange={(e) => set("tax_tin", e.target.value)} disabled={!canEdit} /></Field>
                  <Field label="Base Currency">
                    <Select value={form.base_currency ?? "BBD"} onValueChange={(v) => set("base_currency", v)} disabled={!canEdit}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Business Calendar">
                    <Select value={form.business_calendar ?? "Business HRS"} onValueChange={(v) => set("business_calendar", v)} disabled={!canEdit}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CALENDARS.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Slogan"><Input className="h-8 text-xs" value={form.slogan ?? ""} onChange={(e) => set("slogan", e.target.value)} disabled={!canEdit} /></Field>
                <Field label="Feedback Email">
                  <Input className="h-8 text-xs" type="email" placeholder="feedback@company.com" value={form.feedback_email ?? ""} onChange={(e) => set("feedback_email", e.target.value)} disabled={!canEdit} />
                  <p className="text-[9px] text-muted-foreground mt-0.5">Help feedback and suggestions are sent to this address</p>
                </Field>
              </Section>

              {/* Physical Address */}
              <Section title="Physical Address">
                {(() => {
              const country = form.physical_country ?? "Barbados";
              const countryInfo = COUNTRY_DATA[country];
              const states = countryInfo?.states ?? [];
              const cities = countryInfo?.cities ?? [];
              return (
                <div className="grid grid-cols-2 gap-2">
                      <Field label="Country">
                        <Select value={country} onValueChange={(v) => {set("physical_country", v);set("physical_state", "");set("physical_city", "");}} disabled={!canEdit}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </Field>
                      <Field label="State">
                        <Select value={form.physical_state ?? ""} onValueChange={(v) => set("physical_state", v)} disabled={!canEdit}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select state" /></SelectTrigger>
                          <SelectContent>{states.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </Field>
                      <Field label="City">
                        <Select value={form.physical_city ?? ""} onValueChange={(v) => set("physical_city", v)} disabled={!canEdit}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select city" /></SelectTrigger>
                          <SelectContent>{cities.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </Field>
                      <Field label="County"><Input className="h-8 text-xs" value={form.physical_county ?? ""} onChange={(e) => set("physical_county", e.target.value)} disabled={!canEdit} /></Field>
                      <Field label="Line 1"><Input className="h-8 text-xs" value={form.physical_line1 ?? ""} onChange={(e) => set("physical_line1", e.target.value)} disabled={!canEdit} /></Field>
                      <Field label="Line 2"><Input className="h-8 text-xs" value={form.physical_line2 ?? ""} onChange={(e) => set("physical_line2", e.target.value)} disabled={!canEdit} /></Field>
                      <Field label="Postcode"><Input className="h-8 text-xs" value={form.physical_postcode ?? ""} onChange={(e) => set("physical_postcode", e.target.value)} disabled={!canEdit} /></Field>
                    </div>);

            })()}
              </Section>

              {/* Bill-To */}
              <AddressCard prefix="bill" title="Bill-To Address" form={form} setForm={setForm} usePhysical={!!form.bill_use_physical} onToggleUsePhysical={handleToggleBillPhysical} physicalAddr={physicalAddr} canEdit={canEdit} />

              {/* Ship-To */}
              <AddressCard prefix="ship" title="Ship-To Address" form={form} setForm={setForm} usePhysical={!!form.ship_use_physical} onToggleUsePhysical={handleToggleShipPhysical} physicalAddr={physicalAddr} canEdit={canEdit} />

              {/* PDF Header & Footer */}
              <Section title="PDF Export Header & Footer">
                <Field label="Header (appears on all PDF exports)">
                  <Textarea
                className="text-xs min-h-[60px] font-mono"
                placeholder="<b>Company Name</b> — Your tagline here"
                value={form.pdf_header_html ?? ""}
                onChange={(e) => set("pdf_header_html", e.target.value)}
                disabled={!canEdit} />

                </Field>
                <p className="text-[9px] text-muted-foreground">Supports basic HTML: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;br&gt;, &lt;span style="..."&gt;</p>
                <Field label="Footer (appears on all PDF exports)">
                  <Textarea
                className="text-xs min-h-[60px] font-mono"
                placeholder="All prices subject to change · <i>Thank you for your business</i>"
                value={form.pdf_footer_html ?? ""}
                onChange={(e) => set("pdf_footer_html", e.target.value)}
                disabled={!canEdit} />

                </Field>
              </Section>

              {/* Logo */}
              <Section title="Logo">
                <div className="flex items-center gap-3">
                  {form.logo_url ?
              <img src={form.logo_url} alt="Company logo" className="h-16 w-auto object-contain border border-border p-1 bg-background" onError={(e) => {(e.target as HTMLImageElement).style.display = 'none';}} /> :

              <div className="h-16 w-16 flex items-center justify-center border border-dashed border-border bg-muted/30">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
              }
                  <div className="flex-1 space-y-1">
                    {form.logo_file_name && <p className="text-xs font-medium">{form.logo_file_name}</p>}
                    {canEdit &&
                <>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                          <Upload className="h-3 w-3" />
                          {uploading ? "Uploading…" : "Upload Logo"}
                        </Button>
                      </>
                }
                  </div>
                </div>
              </Section>
            </div>

            {canEdit &&
        <div className="pt-2">
                <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save Company Variables"}
                </Button>
              </div>
        }
          </div>
    </div>);

};

export default CompanySettingsPage;