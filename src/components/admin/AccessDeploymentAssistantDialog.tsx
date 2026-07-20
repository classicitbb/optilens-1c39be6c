import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Link2, Mail, Search, ShieldAlert, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { type Contact } from "@/hooks/useContacts";
import { type AppRole, useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { hasCompletedAccessDeploymentTraining } from "@/components/admin/AccessDeploymentTrainingDialog";
import { resolveCompatibleCustomerAccounts, type AccessDeploymentCustomerOption } from "@/lib/accessDeployment";

type CustomerOption = AccessDeploymentCustomerOption;

type DeploymentKind = "portal" | "staff";
type ProvisioningMethod = "link" | "invite" | "password" | null;

type AccessDeploymentAssistantDialogProps = {
  contacts: Contact[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateContact: (initial: { name: string; email: string }) => void;
  onEditContact: (contact: Contact) => void;
  onOpenTraining: () => void;
};

const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

const roleLabels: Record<Exclude<AppRole, "customer">, string> = {
  admin: "Admin — full control",
  operator: "Operator — day-to-day work",
  viewer: "Viewer — read-only",
};

export function AccessDeploymentAssistantDialog({ contacts, open, onOpenChange, onCreateContact, onEditContact, onOpenTraining }: AccessDeploymentAssistantDialogProps) {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const { users, isLoading: usersLoading, inviteUser, createUser, assignRole, linkCustomerPortalAccount } = useAdminUsers();
  const [query, setQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [kind, setKind] = useState<DeploymentKind>("portal");
  const [method, setMethod] = useState<ProvisioningMethod>(null);
  const [password, setPassword] = useState("");
  const [staffRole, setStaffRole] = useState<Exclude<AppRole, "customer">>("operator");
  const [approvePortal, setApprovePortal] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [showFirstUsePrompt, setShowFirstUsePrompt] = useState(() => !hasCompletedAccessDeploymentTraining());

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["access-deployment-customers"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("customers") as any)
        .select("id,name,account_number,email,contact_id,innovations_customer_id")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CustomerOption[];
    },
  });

  const contactMatches = useMemo(() => {
    const term = normalize(query);
    if (term.length < 2) return [];
    return contacts.filter((contact) => [contact.name, contact.email, contact.phone, contact.business_name].some((value) => normalize(value).includes(term))).slice(0, 8);
  }, [contacts, query]);
  const customerMatches = useMemo(() => {
    const term = normalize(query);
    if (term.length < 2) return [];
    return customers.filter((customer) => [customer.name, customer.email, customer.account_number].some((value) => normalize(value).includes(term))).slice(0, 8);
  }, [customers, query]);
  const contactCustomers = useMemo(() => {
    return resolveCompatibleCustomerAccounts(selectedContact, customers);
  }, [customers, selectedContact]);
  const email = selectedContact?.email?.trim() ?? "";
  const existingLogin = useMemo(() => users.find((user) => normalize(user.email) === normalize(email)), [email, users]);
  const canDeploy = Boolean(selectedContact && method && (kind === "staff" || selectedCustomer) && (method !== "password" || password.length >= 12));

  const reset = () => {
    setQuery(""); setSelectedContact(null); setSelectedCustomer(null); setKind("portal"); setMethod(null); setPassword(""); setStaffRole("operator"); setApprovePortal(false); setSuccess(null); setDeploymentError(null);
  };
  const close = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };
  const selectContact = (contact: Contact | null) => {
    setSelectedContact(contact);
    setSelectedCustomer(null);
    setMethod(null);
    setSuccess(null);
    setDeploymentError(null);
  };
  const selectCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer);
    setMethod(null);
    setSuccess(null);
    setDeploymentError(null);
  };

  const deploy = async () => {
    if (!selectedContact || !method || !canDeploy) return;
    if (!isAdmin) {
      toast({ title: "Admin approval required", description: "Only an admin can create or link logins. Use the operations follow-up in Access training to preserve this case.", variant: "destructive" });
      return;
    }
    try {
      setIsDeploying(true);
      let userId = existingLogin?.user_id;
      if (kind === "portal") {
        if (!selectedCustomer) return;
        if (method === "link") {
          if (!existingLogin) throw new Error("Choose an existing login before linking it.");
          await linkCustomerPortalAccount.mutateAsync({ userId: existingLogin.user_id, customerId: selectedCustomer.id, contactId: selectedContact.id, displayName: selectedContact.name });
        } else if (method === "invite") {
          const result = await inviteUser.mutateAsync({ email, customerId: selectedCustomer.id, contactId: selectedContact.id, displayName: selectedContact.name });
          userId = result.userId;
        } else {
          const result = await createUser.mutateAsync({ email, password, customerId: selectedCustomer.id, contactId: selectedContact.id, displayName: selectedContact.name });
          userId = result.userId;
        }
        if (approvePortal && userId) {
          const { error } = await (supabase as any).from("profiles").upsert({
            user_id: userId,
            portal_access_approved_override: true,
            portal_access_approved_at: new Date().toISOString(),
            portal_access_approved_note: "Approved from the Contacts deployment assistant.",
          }, { onConflict: "user_id" });
          if (error) throw error;
          const { error: syncError } = await (supabase.rpc as any)("sync_customer_portal_identity", { p_user_id: userId });
          if (syncError) throw syncError;
        }
        setSuccess(method === "link" ? "Existing login linked to the selected customer." : method === "invite" ? "Invitation sent and linked to the selected customer." : "Portal login created and linked to the selected customer.");
      } else {
        if (method === "link") {
          if (!existingLogin) throw new Error("Choose an existing login before using it.");
        } else if (method === "invite") {
          const result = await inviteUser.mutateAsync({ email, displayName: selectedContact.name });
          userId = result.userId;
        } else {
          const result = await createUser.mutateAsync({ email, password, displayName: selectedContact.name });
          userId = result.userId;
        }
        if (!userId) throw new Error("The login was created but could not be identified for role assignment. Refresh Users and complete the role assignment there.");
        await assignRole.mutateAsync({ userId, role: staffRole });
        setSuccess(`Internal ${roleLabels[staffRole].split(" — ")[0].toLowerCase()} access is ready.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Access deployment failed.";
      setDeploymentError(message);
      toast({ title: "Deployment needs attention", description: `${message} Open Access training > Exceptions to create an operations follow-up with this search context.`, variant: "destructive" });
    } finally {
      setIsDeploying(false);
    }
  };

  const noMatchName = query.includes("@") ? "" : query.trim();
  const noMatchEmail = query.includes("@") ? query.trim() : "";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Deploy access</DialogTitle>
          <DialogDescription>Search first. The assistant shows what it found and asks for only the decisions it cannot safely make.</DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" /> {success}</div>
            <p className="mt-1 text-emerald-800">The contact, login, and customer link were kept as one deployment record.</p>
          </div>
        ) : (
          <div className="space-y-5 py-1">
            {showFirstUsePrompt ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950"><div><p className="font-medium">First deployment?</p><p className="mt-1">Practise the seven safe scenarios before changing a live login, contact, or customer account.</p></div><div className="flex gap-2"><Button size="sm" variant="outline" className="border-sky-300 bg-white" onClick={() => { close(false); onOpenTraining(); }}>Start training</Button><Button size="sm" variant="ghost" onClick={() => setShowFirstUsePrompt(false)}>Continue</Button></div></div> : null}
            {deploymentError ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><div><p className="font-medium">Deployment needs an operations follow-up</p><p className="mt-1">{deploymentError}</p></div><Button size="sm" variant="outline" onClick={() => { close(false); onOpenTraining(); }}>Open exception help</Button></div> : null}
            <section className="space-y-2">
              <Label htmlFor="access-search">1. Who are you deploying?</Label>
              <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="access-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by person, email, or account number" className="pl-9" autoFocus /></div>
              {query.trim().length >= 2 && !selectedContact ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground">Contacts</p>{contactMatches.length ? contactMatches.map((contact) => <Button key={contact.id} variant="outline" className="h-auto w-full justify-start p-2 text-left" onClick={() => selectContact(contact)}><span><span className="block text-sm font-medium">{contact.name}</span><span className="block text-xs text-muted-foreground">{contact.email || "No email"}</span></span></Button>) : <p className="text-xs text-muted-foreground">No contact match.</p>}</div>
                  <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground">Customer accounts</p>{customerMatches.length ? customerMatches.map((customer) => <Button key={customer.id} variant="outline" className="h-auto w-full justify-start p-2 text-left" onClick={() => setSelectedCustomer(customer)}><span><span className="block text-sm font-medium">{customer.name}</span><span className="block text-xs text-muted-foreground">{customer.account_number || "No account number"}</span></span></Button>) : <p className="text-xs text-muted-foreground">No customer account match.</p>}</div>
                </div>
              ) : null}
              {query.trim().length >= 2 && !contactMatches.length && !customerMatches.length && !selectedContact ? <div className="rounded-md border border-dashed p-3 text-sm"><p className="font-medium">No matching record</p><p className="mt-1 text-muted-foreground">Create the contact only, then reopen Deploy access when you are ready to link a customer or login.</p><Button size="sm" className="mt-3" onClick={() => { onCreateContact({ name: noMatchName, email: noMatchEmail }); close(false); }}>Create contact only</Button></div> : null}
            </section>

            {selectedContact ? <section className="space-y-3 rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{selectedContact.name}</p><p className="text-xs text-muted-foreground">{email || "No email on this contact"}</p></div><Button variant="ghost" size="sm" onClick={() => selectContact(null)}>Change</Button></div>
              {!email ? <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-950"><div className="flex gap-2 font-medium"><ShieldAlert className="h-4 w-4" /> An email is needed before a login can be created.</div><Button variant="link" className="h-auto p-0 text-amber-950" onClick={() => { onEditContact(selectedContact); close(false); }}>Add the email in this contact</Button></div> : <>
                <div className="space-y-2"><Label>2. What access should they have?</Label><div className="flex gap-2"><Button variant={kind === "portal" ? "default" : "outline"} onClick={() => { setKind("portal"); setMethod(null); }}>Customer portal</Button><Button variant={kind === "staff" ? "default" : "outline"} onClick={() => { setKind("staff"); setMethod(null); }}>Internal staff</Button></div></div>
                {kind === "portal" ? <div className="space-y-2"><Label>3. Which account should this person access?</Label>{contactCustomers.length > 1 ? <p className="text-xs text-amber-700">More than one linked account was found. Choose the primary account; the assistant will not choose for you.</p> : null}<Select value={selectedCustomer?.id?.toString() ?? ""} onValueChange={(value) => selectCustomer(customers.find((customer) => customer.id === Number(value))!)}><SelectTrigger><SelectValue placeholder={customersLoading ? "Loading accounts…" : "Choose a customer account"} /></SelectTrigger><SelectContent>{(contactCustomers.length ? contactCustomers : customerMatches).map((customer) => <SelectItem key={customer.id} value={String(customer.id)}>{customer.name} {customer.account_number ? `(${customer.account_number})` : ""}</SelectItem>)}</SelectContent></Select>{!selectedCustomer && !contactCustomers.length ? <p className="text-xs text-amber-700">No compatible customer link was found. Select a customer from the search results above, or link the contact to a customer before deploying portal access.</p> : null}</div> : <div className="space-y-2"><Label htmlFor="staff-role">3. Choose the internal role</Label><Select value={staffRole} onValueChange={(value) => setStaffRole(value as Exclude<AppRole, "customer">)}><SelectTrigger id="staff-role"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(roleLabels) as Array<Exclude<AppRole, "customer">>).map((role) => <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>)}</SelectContent></Select></div>}
                {(kind === "staff" || selectedCustomer) ? <div className="space-y-2"><Label>4. How should they sign in?</Label>{usersLoading ? <p className="text-sm text-muted-foreground">Checking for an existing login…</p> : existingLogin ? <div className="rounded-md border p-3 text-sm"><p className="font-medium">An existing login uses this email.</p><p className="mt-1 text-muted-foreground">{existingLogin.email_confirmed_at ? "The email is verified." : "This person has not verified their email. Access will unlock after verification."}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant={method === "link" ? "default" : "outline"} onClick={() => setMethod("link")}><Link2 className="mr-1 h-3.5 w-3.5" />{kind === "portal" ? "Link this login" : "Use this login"}</Button><Button size="sm" variant="ghost" onClick={() => { setMethod(null); toast({ title: "Login left unchanged", description: "No records were linked or changed." }); }}>Leave unchanged</Button></div></div> : <div className="flex flex-wrap gap-2"><Button size="sm" variant={method === "invite" ? "default" : "outline"} onClick={() => setMethod("invite")}><Mail className="mr-1 h-3.5 w-3.5" />Send invite</Button><Button size="sm" variant={method === "password" ? "default" : "outline"} onClick={() => setMethod("password")}>Set temporary password</Button>{method === "password" ? <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" className="max-w-xs" /> : null}</div>}</div> : null}
                {kind === "portal" && selectedCustomer && method ? <label className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm"><Checkbox checked={approvePortal} onCheckedChange={(checked) => setApprovePortal(checked === true)} /><span><span className="font-medium">Approve portal access now</span><span className="block text-muted-foreground">Use this only after confirming the customer and contact link. Pricing and statement access still require the matching access tag, unless the contact is tagged CEO.</span></span></label> : null}
              </>}
            </section> : null}
          </div>
        )}
        <DialogFooter>{success ? <><Button variant="outline" onClick={reset}>Deploy another</Button><Button onClick={() => close(false)}>Done</Button></> : <><Button variant="outline" onClick={() => close(false)}>Cancel</Button><Button onClick={deploy} disabled={!canDeploy || isDeploying}>{isDeploying ? "Deploying…" : "Deploy access"}</Button></>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
