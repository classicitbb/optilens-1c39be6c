import { useState, useMemo } from "react";
import { useContacts, useContactTags, useContactTagLinks, useIndustries, useSaveContact, useDeleteContact, useSetContactTags, type Contact } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ChevronDown, ChevronLeft, ChevronRight, Building2, User, X, Trash2, Settings, Upload, Download, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type FilterMode = "all" | "companies" | "persons" | "customers";

const LEAD_SOURCES = [
  { value: "not_specified", label: "Not specified" },
  { value: "lead_form", label: "Lead Form" },
  { value: "new_business_application", label: "New Business Application" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "walk_in", label: "Walk-in" },
  { value: "phone_inquiry", label: "Phone Inquiry" },
  { value: "trade_show", label: "Trade Show" },
  { value: "other", label: "Other" },
];

const PIPELINE_STAGES = ["New", "Prospect", "Qualified", "Active Customer", "Inactive"];

const emptyContact = (isCompany: boolean): Partial<Contact> => ({
  name: "",
  is_company: isCompany,
  email: "",
  phone: "",
  street: "",
  street2: "",
  city: "",
  state: "",
  zip: "",
  country_code: "",
  tax_id: "",
  website: "",
  industry_id: null,
  notes: "",
  salesperson: "",
  parent_id: null,
  is_archived: false,
  avatar_url: "",
  is_customer: false,
  lead_source: "",
  pipeline_stage: "New",
});

const ContactsPage = () => {
  const { data: contacts = [], isLoading } = useContacts();
  const { data: tags = [] } = useContactTags();
  const { data: industries = [] } = useIndustries();
  const saveContact = useSaveContact();
  const deleteContact = useDeleteContact();
  const setContactTags = useSetContactTags();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [editContact, setEditContact] = useState<Partial<Contact> | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Load tags when editing
  const { data: editTagIds = [] } = useContactTagLinks(editContact?.id);

  const filtered = useMemo(() => {
    let list = contacts;
    if (!showArchived) list = list.filter((c) => !c.is_archived);
    if (filter === "companies") list = list.filter((c) => c.is_company);
    if (filter === "persons") list = list.filter((c) => !c.is_company);
    if (filter === "customers") list = list.filter((c) => c.is_customer);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s) ||
          c.phone.includes(s) ||
          c.city.toLowerCase().includes(s)
      );
    }
    return list;
  }, [contacts, filter, search, showArchived]);

  const companies = contacts.filter((c) => c.is_company);

  const exportCsv = () => {
    const headers = ["name","is_company","email","phone","street","street2","city","state","zip","country_code","tax_id","website","salesperson","notes"];
    const rows = filtered.map((c) =>
      headers.map((h) => {
        const val = (c as any)[h] ?? "";
        const str = String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${filtered.length} contacts` });
  };

  const importCsv = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast({ title: "CSV must have a header row and at least one data row", variant: "destructive" });
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const nameIdx = headers.findIndex((h) => h.toLowerCase() === "name");
      if (nameIdx === -1) {
        toast({ title: "CSV must contain a 'name' column", variant: "destructive" });
        return;
      }
      let imported = 0;
      let errors = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].match(/(".*?"|[^,]*)/g)?.map((v) => v.trim().replace(/^"|"$/g, "").replace(/""/g, '"')) ?? [];
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          if (h === "is_company") {
            row[h] = vals[idx]?.toLowerCase() === "true";
          } else {
            row[h] = vals[idx] ?? "";
          }
        });
        if (!row.name) continue;
        const { error } = await supabase.from("contacts").insert(row as any);
        if (error) errors++;
        else imported++;
      }
      toast({ title: `Imported ${imported} contacts${errors ? `, ${errors} errors` : ""}` });
      // Refetch
      window.location.reload();
    };
    input.click();
  };

  const handleSave = async () => {
    if (!editContact?.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    try {
      // If new contact, insert and get id back
      let contactId = editContact.id;
      if (!contactId) {
        const { data: inserted, error: insErr } = await supabase
          .from("contacts")
          .insert({
            name: editContact.name,
            is_company: editContact.is_company ?? true,
            email: editContact.email ?? "",
            phone: editContact.phone ?? "",
            street: editContact.street ?? "",
            street2: editContact.street2 ?? "",
            city: editContact.city ?? "",
            state: editContact.state ?? "",
            zip: editContact.zip ?? "",
            country_code: editContact.country_code ?? "",
            tax_id: editContact.tax_id ?? "",
            website: editContact.website ?? "",
            industry_id: editContact.industry_id ?? null,
            notes: editContact.notes ?? "",
            salesperson: editContact.salesperson ?? "",
            parent_id: editContact.parent_id ?? null,
            is_archived: editContact.is_archived ?? false,
            avatar_url: editContact.avatar_url ?? "",
            is_customer: editContact.is_customer ?? false,
            lead_source: editContact.lead_source ?? "",
            pipeline_stage: editContact.pipeline_stage ?? "New",
          } as any)
          .select("id")
          .single();
        if (insErr) throw insErr;
        contactId = inserted.id;
      } else {
        await saveContact.mutateAsync(editContact);
      }

      // Save tags
      if (contactId) {
        await setContactTags.mutateAsync({ contactId, tagIds: selectedTagIds });
      }

      // Auto-create/sync customer record when is_customer is true
      if (editContact.is_customer && contactId) {
        // Check if customer already linked
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("contact_id", contactId as any)
          .maybeSingle();
        if (!existing) {
          await supabase.from("customers").insert({
            name: editContact.name,
            email: editContact.email ?? null,
            phone: editContact.phone ?? null,
            address: [editContact.street, editContact.city, editContact.state, editContact.country_code].filter(Boolean).join(", ") || null,
            type: editContact.is_company ? "Company" : "Person",
            pipeline_stage: editContact.pipeline_stage ?? "Prospect",
            contact_id: contactId,
          } as any);
        }
      }

      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["customers-list"] });
      toast({ title: editContact.id ? "Contact updated" : "Contact created" });
      setEditContact(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContact.mutateAsync(id);
      toast({ title: "Contact deleted" });
      setEditContact(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openEdit = (contact: Contact) => {
    setEditContact(contact);
    setSelectedTagIds([]);
  };

  const openNew = (isCompany: boolean) => {
    setEditContact(emptyContact(isCompany));
    setSelectedTagIds([]);
  };

  // Sync tag ids when editTagIds loads
  useMemo(() => {
    if (editTagIds.length > 0 && editContact?.id) {
      setSelectedTagIds(editTagIds);
    }
  }, [editTagIds, editContact?.id]);

  const getParentName = (parentId: string | null) => {
    if (!parentId) return "";
    return contacts.find((c) => c.id === parentId)?.name ?? "";
  };

  const getContactTags = (contactId: string) => {
    // We'd need tag links for each row - for list view we'll skip expensive queries
    return [];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold" style={{ color: "hsl(215 30% 15%)" }}>Contacts</h1>
          <p className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>
            Manage companies and persons
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Import CSV" onClick={importCsv}>
              <Upload className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Export CSV" onClick={exportCsv}>
              <Download className="h-4 w-4" />
            </Button>
          <Link to="/admin/erp/config/contact-tags">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Configuration">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1" style={{ background: "hsl(168 76% 42%)", color: "white" }}>
                <Plus className="h-3.5 w-3.5" /> New <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openNew(true)}>
                <Building2 className="h-4 w-4 mr-2" /> New Company
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openNew(false)}>
                <User className="h-4 w-4 mr-2" /> New Person
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex items-center border rounded-md overflow-hidden" style={{ borderColor: "hsl(215 25% 88%)" }}>
          {(["all", "companies", "persons", "customers"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium capitalize transition-colors"
              style={{
                background: filter === f ? "hsl(168 76% 42%)" : "transparent",
                color: filter === f ? "white" : "hsl(215 15% 50%)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Archived
        </label>
        <span className="text-xs ml-auto" style={{ color: "hsl(215 15% 50%)" }}>
          {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden" style={{ borderColor: "hsl(215 25% 88%)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Salesperson</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Country</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                  No contacts found. Click "New" to create one.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
                  <TableCell className="font-medium text-xs">{c.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge
                        className="text-[10px] px-1.5 py-0 h-5 border-0"
                        style={{
                          background: c.is_company ? "hsl(215 65% 50% / 0.12)" : "hsl(168 76% 42% / 0.12)",
                          color: c.is_company ? "hsl(215 65% 50%)" : "hsl(168 76% 42%)",
                        }}
                      >
                        {c.is_company ? "Company" : "Person"}
                      </Badge>
                      {c.is_customer && (
                        <Badge className="text-[10px] px-1.5 py-0 h-5 border-0" style={{ background: "hsl(38 92% 50% / 0.12)", color: "hsl(38 92% 40%)" }}>
                          Customer
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{c.email}</TableCell>
                  <TableCell className="text-xs">{c.phone}</TableCell>
                  <TableCell className="text-xs">{c.salesperson}</TableCell>
                  <TableCell className="text-xs">{c.city}</TableCell>
                  <TableCell className="text-xs">{c.country_code}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editContact} onOpenChange={(v) => !v && setEditContact(null)}>
        <DialogContent className="max-w-[95vw] w-[900px] p-0 gap-0 overflow-hidden" style={{ maxHeight: "calc(100vh - 48px)" }}>
          {editContact && (() => {
            const currentIndex = filtered.findIndex((c) => c.id === editContact.id);
            const canGoPrev = editContact.id && currentIndex > 0;
            const canGoNext = editContact.id && currentIndex >= 0 && currentIndex < filtered.length - 1;
            const goTo = (contact: Contact) => {
              setEditContact(contact);
              setSelectedTagIds([]);
            };

            return (
              <>
                {/* Header with nav */}
                <DialogHeader className="px-4 py-2.5 border-b shrink-0" style={{ borderColor: "hsl(215 25% 88%)" }}>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 text-sm">
                      {editContact.is_company ? <Building2 className="h-4 w-4" style={{ color: "hsl(215 65% 50%)" }} /> : <User className="h-4 w-4" style={{ color: "hsl(168 76% 42%)" }} />}
                      {editContact.id ? "Edit Contact" : editContact.is_company ? "New Company" : "New Person"}
                    </DialogTitle>
                    {editContact.id && (
                      <div className="flex items-center gap-1 mr-8">
                        <span className="text-[10px] mr-1" style={{ color: "hsl(215 15% 55%)" }}>
                          {currentIndex + 1} / {filtered.length}
                        </span>
                        <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                          disabled={!canGoPrev}
                          onClick={() => canGoPrev && goTo(filtered[currentIndex - 1])}>
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                          disabled={!canGoNext}
                          onClick={() => canGoNext && goTo(filtered[currentIndex + 1])}>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogHeader>

                {/* Body with tabs */}
                <Tabs defaultValue="details" className="flex flex-col min-h-0 flex-1">
                  <TabsList className="px-4 pt-2 pb-0 h-auto bg-transparent justify-start gap-2 shrink-0">
                    <TabsTrigger value="details" className="text-xs h-7 px-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Details</TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs h-7 px-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="flex-1 px-4 py-3 m-0 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-2.5 h-full">
                      {/* Column 1: Identity */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(215 15% 55%)" }}>Identity</h4>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Name *</label>
                          <Input className="h-7 text-xs" value={editContact.name ?? ""} onChange={(e) => setEditContact({ ...editContact, name: e.target.value })} />
                        </div>
                        {!editContact.is_company && (
                          <div>
                            <label className="text-[11px] font-medium mb-0.5 block">Parent Company</label>
                            <Select value={editContact.parent_id ?? "none"} onValueChange={(v) => setEditContact({ ...editContact, parent_id: v === "none" ? null : v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select company" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Email</label>
                          <Input className="h-7 text-xs" value={editContact.email ?? ""} onChange={(e) => setEditContact({ ...editContact, email: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Phone</label>
                          <Input className="h-7 text-xs" value={editContact.phone ?? ""} onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Website</label>
                          <Input className="h-7 text-xs" value={editContact.website ?? ""} onChange={(e) => setEditContact({ ...editContact, website: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Salesperson</label>
                          <Input className="h-7 text-xs" value={editContact.salesperson ?? ""} onChange={(e) => setEditContact({ ...editContact, salesperson: e.target.value })} />
                        </div>
                      </div>

                      {/* Column 2: Address */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(215 15% 55%)" }}>Address</h4>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Street</label>
                          <Input className="h-7 text-xs" value={editContact.street ?? ""} onChange={(e) => setEditContact({ ...editContact, street: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Street 2</label>
                          <Input className="h-7 text-xs" value={editContact.street2 ?? ""} onChange={(e) => setEditContact({ ...editContact, street2: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-medium mb-0.5 block">City</label>
                            <Input className="h-7 text-xs" value={editContact.city ?? ""} onChange={(e) => setEditContact({ ...editContact, city: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium mb-0.5 block">State</label>
                            <Input className="h-7 text-xs" value={editContact.state ?? ""} onChange={(e) => setEditContact({ ...editContact, state: e.target.value })} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-medium mb-0.5 block">ZIP</label>
                            <Input className="h-7 text-xs" value={editContact.zip ?? ""} onChange={(e) => setEditContact({ ...editContact, zip: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium mb-0.5 block">Country</label>
                            <Input className="h-7 text-xs" value={editContact.country_code ?? ""} onChange={(e) => setEditContact({ ...editContact, country_code: e.target.value })} />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Tax ID</label>
                          <Input className="h-7 text-xs" value={editContact.tax_id ?? ""} onChange={(e) => setEditContact({ ...editContact, tax_id: e.target.value })} />
                        </div>
                      </div>

                      {/* Column 3: Classification */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(215 15% 55%)" }}>Classification</h4>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Industry</label>
                          <Select value={editContact.industry_id ?? "none"} onValueChange={(v) => setEditContact({ ...editContact, industry_id: v === "none" ? null : v })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select industry" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {industries.map((i) => (<SelectItem key={i.id} value={i.id}>{i.full_name || i.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Lead Source</label>
                          <Select value={editContact.lead_source || "not_specified"} onValueChange={(v) => setEditContact({ ...editContact, lead_source: v })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select source…" /></SelectTrigger>
                            <SelectContent>
                              {LEAD_SOURCES.map((s) => (<SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Pipeline Stage</label>
                          <Select value={editContact.pipeline_stage ?? "New"} onValueChange={(v) => setEditContact({ ...editContact, pipeline_stage: v })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PIPELINE_STAGES.map((s) => (<SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Customer toggle */}
                        <div className="border rounded-md p-2 space-y-1.5 mt-1" style={{ borderColor: "hsl(var(--border))" }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                              <Label className="text-[11px] font-semibold">Customer</Label>
                            </div>
                            <Switch
                              checked={editContact.is_customer ?? false}
                              onCheckedChange={(checked) => setEditContact({ ...editContact, is_customer: checked, pipeline_stage: checked ? (editContact.pipeline_stage === "New" ? "Prospect" : editContact.pipeline_stage) : editContact.pipeline_stage })}
                            />
                          </div>
                          <p className="text-[10px]" style={{ color: "hsl(215 15% 55%)" }}>
                            {editContact.is_customer ? "Available for pricelist assignments" : "Not a customer"}
                          </p>
                        </div>

                        {/* Tags */}
                        {editContact.id && (
                          <div>
                            <label className="text-[11px] font-medium mb-0.5 block">Tags</label>
                            <div className="flex flex-wrap gap-1">
                              {tags.map((tag) => {
                                const selected = selectedTagIds.includes(tag.id);
                                return (
                                  <button
                                    key={tag.id}
                                    onClick={() => setSelectedTagIds((prev) => selected ? prev.filter((t) => t !== tag.id) : [...prev, tag.id])}
                                    className="px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-all"
                                    style={{
                                      background: selected ? tag.color + "20" : "transparent",
                                      color: selected ? tag.color : "hsl(215 15% 50%)",
                                      borderColor: selected ? tag.color : "hsl(215 25% 88%)",
                                    }}
                                  >
                                    {tag.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="flex-1 px-4 py-3 m-0">
                    <Textarea
                      className="text-xs min-h-[120px] h-full resize-none"
                      placeholder="Add notes about this contact…"
                      value={editContact.notes ?? ""}
                      onChange={(e) => setEditContact({ ...editContact, notes: e.target.value })}
                    />
                  </TabsContent>
                </Tabs>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t shrink-0" style={{ borderColor: "hsl(215 25% 88%)" }}>
                  <div>
                    {editContact.id && (
                      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" style={{ color: "hsl(0 72% 51%)" }} onClick={() => handleDelete(editContact.id!)}>
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditContact(null)}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs" style={{ background: "hsl(168 76% 42%)", color: "white" }} onClick={handleSave} disabled={saveContact.isPending}>
                      {saveContact.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactsPage;
