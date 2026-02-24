import { useState, useMemo } from "react";
import { useContacts, useContactTags, useContactTagLinks, useIndustries, useSaveContact, useDeleteContact, useSetContactTags, type Contact } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, ChevronDown, Building2, User, X, Trash2, Settings, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type FilterMode = "all" | "companies" | "persons";

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
});

const ContactsPage = () => {
  const { data: contacts = [], isLoading } = useContacts();
  const { data: tags = [] } = useContactTags();
  const { data: industries = [] } = useIndustries();
  const saveContact = useSaveContact();
  const deleteContact = useDeleteContact();
  const setContactTags = useSetContactTags();
  const { toast } = useToast();

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
      await saveContact.mutateAsync(editContact);
      // Save tags if editing existing
      if (editContact.id) {
        await setContactTags.mutateAsync({ contactId: editContact.id, tagIds: selectedTagIds });
      }
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
          {(["all", "companies", "persons"] as FilterMode[]).map((f) => (
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
                    <Badge
                      className="text-[10px] px-1.5 py-0 h-5 border-0"
                      style={{
                        background: c.is_company ? "hsl(215 65% 50% / 0.12)" : "hsl(168 76% 42% / 0.12)",
                        color: c.is_company ? "hsl(215 65% 50%)" : "hsl(168 76% 42%)",
                      }}
                    >
                      {c.is_company ? "Company" : "Person"}
                    </Badge>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {editContact?.is_company ? <Building2 className="h-5 w-5" style={{ color: "hsl(215 65% 50%)" }} /> : <User className="h-5 w-5" style={{ color: "hsl(168 76% 42%)" }} />}
              {editContact?.id ? "Edit Contact" : editContact?.is_company ? "New Company" : "New Person"}
            </DialogTitle>
          </DialogHeader>

          {editContact && (
            <div className="space-y-4">
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Name *</label>
                  <Input
                    className="h-8 text-xs"
                    value={editContact.name ?? ""}
                    onChange={(e) => setEditContact({ ...editContact, name: e.target.value })}
                  />
                </div>
                {!editContact.is_company && (
                  <div>
                    <label className="text-xs font-medium mb-1 block">Parent Company</label>
                    <Select
                      value={editContact.parent_id ?? "none"}
                      onValueChange={(v) => setEditContact({ ...editContact, parent_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Email</label>
                  <Input className="h-8 text-xs" value={editContact.email ?? ""} onChange={(e) => setEditContact({ ...editContact, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Phone</label>
                  <Input className="h-8 text-xs" value={editContact.phone ?? ""} onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })} />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Street</label>
                  <Input className="h-8 text-xs" value={editContact.street ?? ""} onChange={(e) => setEditContact({ ...editContact, street: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Street 2</label>
                  <Input className="h-8 text-xs" value={editContact.street2 ?? ""} onChange={(e) => setEditContact({ ...editContact, street2: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">City</label>
                  <Input className="h-8 text-xs" value={editContact.city ?? ""} onChange={(e) => setEditContact({ ...editContact, city: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">State</label>
                  <Input className="h-8 text-xs" value={editContact.state ?? ""} onChange={(e) => setEditContact({ ...editContact, state: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">ZIP</label>
                  <Input className="h-8 text-xs" value={editContact.zip ?? ""} onChange={(e) => setEditContact({ ...editContact, zip: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Country Code</label>
                  <Input className="h-8 text-xs" value={editContact.country_code ?? ""} onChange={(e) => setEditContact({ ...editContact, country_code: e.target.value })} />
                </div>
              </div>

              {/* Other fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Tax ID</label>
                  <Input className="h-8 text-xs" value={editContact.tax_id ?? ""} onChange={(e) => setEditContact({ ...editContact, tax_id: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Website</label>
                  <Input className="h-8 text-xs" value={editContact.website ?? ""} onChange={(e) => setEditContact({ ...editContact, website: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Salesperson</label>
                  <Input className="h-8 text-xs" value={editContact.salesperson ?? ""} onChange={(e) => setEditContact({ ...editContact, salesperson: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Industry</label>
                  <Select
                    value={editContact.industry_id ?? "none"}
                    onValueChange={(v) => setEditContact({ ...editContact, industry_id: v === "none" ? null : v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {industries.map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.full_name || i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              {editContact.id && (
                <div>
                  <label className="text-xs font-medium mb-1 block">Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => {
                      const selected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() =>
                            setSelectedTagIds((prev) =>
                              selected ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]
                            )
                          }
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all"
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

              {/* Notes */}
              <div>
                <label className="text-xs font-medium mb-1 block">Notes</label>
                <Textarea
                  className="text-xs min-h-[60px]"
                  value={editContact.notes ?? ""}
                  onChange={(e) => setEditContact({ ...editContact, notes: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "hsl(215 25% 88%)" }}>
                <div>
                  {editContact.id && (
                    <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" style={{ color: "hsl(0 72% 51%)" }} onClick={() => handleDelete(editContact.id!)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditContact(null)}>Cancel</Button>
                  <Button size="sm" className="h-8 text-xs" style={{ background: "hsl(168 76% 42%)", color: "white" }} onClick={handleSave} disabled={saveContact.isPending}>
                    {saveContact.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactsPage;
