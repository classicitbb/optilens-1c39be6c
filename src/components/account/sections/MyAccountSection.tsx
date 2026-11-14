import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AtSign, Building2, Check, CheckCircle2, Circle, IdCard, KeyRound, LogOut, Pencil, Phone, ShieldCheck, User, X, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { capitalizeDisplayName, resolveUserFullName } from "@/lib/profileData";
import { type ProfileFormValues, profileSchema } from "@/features/portal/profileSchema";
import { getMissingProfileRequirements } from "@/features/portal/profileCompletion";
import { useCustomerAddresses } from "@/hooks/useCustomerAddresses";
import PaymentMethodsSection from "@/components/account/sections/PaymentMethodsSection";
import AddressBookSection from "@/components/account/sections/AddressBookSection";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const roleBadgeStyle: Record<string, { bg: string; color: string }> = {
  admin: { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 51%)" },
  operator: { bg: "hsl(215 65% 50% / 0.12)", color: "hsl(215 65% 50%)" },
  viewer: { bg: "hsl(215 15% 50% / 0.12)", color: "hsl(215 15% 50%)" },
  customer: { bg: "hsl(150 60% 40% / 0.12)", color: "hsl(150 60% 40%)" },
};

type InlineProfileField = "full_name" | "phone" | "organization_name";

const inlineProfileLabels: Record<InlineProfileField, string> = {
  full_name: "Full name",
  phone: "Phone",
  organization_name: "Organization",
};

const inlineProfileMaxLength: Record<InlineProfileField, number> = {
  full_name: 120,
  phone: 50,
  organization_name: 160,
};

interface EditableFieldProps {
  icon: LucideIcon;
  label: string;
  value: string;
  name?: string;
  type?: string;
  hint?: string;
  editing: boolean;
  draft: string;
  saving: boolean;
  readOnly: boolean;
  onDraft: (value: string) => void;
  onStart: () => void;
  onSave: () => void;
  onCancel: () => void;
}

/** One labelled row that toggles between display and an inline editor (Enter saves, Escape cancels). */
const EditableField = ({ icon: Icon, label, value, name, type, hint, editing, draft, saving, readOnly, onDraft, onStart, onSave, onCancel }: EditableFieldProps) => (
  <div className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-1 text-sm transition-colors hover:bg-muted/50">
    <Icon className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {editing ? (
        <div className="mt-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <Input
              name={name}
              type={type}
              aria-label={label}
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSave();
                } else if (event.key === "Escape") {
                  onCancel();
                }
              }}
              className="h-9 text-sm"
              autoFocus
              disabled={saving}
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onSave} disabled={saving} aria-label={`Save ${label.toLowerCase()}`}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onCancel} disabled={saving} aria-label="Cancel">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <span className={`truncate ${value ? "" : "text-muted-foreground"}`}>{value || "Not added yet"}</span>
          {readOnly ? null : (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onStart} aria-label={`Edit ${label.toLowerCase()}`}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  </div>
);

const MyAccountSection = () => {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const { identity, emulation, effectiveUserId } = usePortalIdentity();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { addresses } = useCustomerAddresses(emulation?.userId);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [editingProfileField, setEditingProfileField] = useState<InlineProfileField | null>(null);
  const [profileDraft, setProfileDraft] = useState("");
  const [savingProfileField, setSavingProfileField] = useState<InlineProfileField | null>(null);
  const [reauthSent, setReauthSent] = useState(false);
  const [sendingReauthCode, setSendingReauthCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  // Optional account-number the customer types before approval. It is a claim
  // that speeds up admin review — it never grants access on its own.
  const [claimDraft, setClaimDraft] = useState("");
  const [savedClaim, setSavedClaim] = useState("");
  const [savingClaim, setSavingClaim] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", phone: "", organization_name: "" },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const profileUserId = effectiveUserId ?? user.id;
      const { data, error } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("user_id", profileUserId)
        .maybeSingle() as { data: Record<string, any> | null; error: any };

      if (error) {
        toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
      } else if (data) {
        form.reset({
          full_name: data.full_name || (emulation ? "" : resolveUserFullName(user)),
          phone: data.phone || "",
          organization_name: data.organization_name || "",
        });
        setClaimDraft(data.claimed_account_number || "");
        setSavedClaim(data.claimed_account_number || "");
      } else {
        form.reset({
          full_name: emulation ? "" : resolveUserFullName(user),
          phone: "",
          organization_name: "",
        });
        setClaimDraft("");
        setSavedClaim("");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, effectiveUserId, emulation, form, toast]);

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (!focus) return;
    if (focus === "full_name" || focus === "phone" || focus === "organization_name") {
      setEditingProfileField(focus);
      setProfileDraft(form.getValues(focus));
    }
    const target = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name='${focus}']`);
    target?.focus();
  }, [form, searchParams]);

  const saveProfileValues = async (values: ProfileFormValues, successDescription = "Profile updated successfully") => {
    if (!user) return;
    if (emulation) {
      toast({ title: "Read-only while emulating", description: "Exit emulation to edit your own profile." });
      return false;
    }

    const fullName = values.full_name.trim();
    const { error } = await (supabase.from("profiles") as any)
      .upsert({
        user_id: user.id,
        full_name: fullName,
        phone: values.phone.trim(),
        display_name: fullName || null,
        organization_name: values.organization_name?.trim() || null,
      }, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
      return false;
    }

    // Keep editable profile metadata aligned with the durable profile row so
    // a later auth refresh cannot restore stale signup values.
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        phone: values.phone.trim(),
        organization_name: values.organization_name?.trim() || "",
      },
    });
    if (metadataError) {
      toast({ title: "Profile saved", description: "Your profile was saved, but sign-in metadata will refresh next time.", variant: "default" });
    }

    const { error: syncError } = await (supabase.rpc as any)("sync_customer_portal_identity", { p_user_id: user.id });
    await queryClient.invalidateQueries({ queryKey: ["portal-identity", user.id] });
    if (syncError) {
      toast({ title: "Profile saved", description: "Your access status may take a little while to refresh." });
      return true;
    }
    toast({ title: "Success", description: successDescription });
    return true;
  };

  const handleSaveClaim = async () => {
    if (!user || emulation) return;
    const trimmed = claimDraft.trim().toUpperCase();
    if (trimmed.length > 60) {
      toast({ title: "Account number is too long", description: "Enter the account number exactly as it appears on your invoice.", variant: "destructive" });
      return;
    }
    setSavingClaim(true);
    const { error } = await (supabase.from("profiles") as any)
      .upsert({ user_id: user.id, claimed_account_number: trimmed || null }, { onConflict: "user_id" });
    setSavingClaim(false);
    if (error) {
      toast({ title: "Error", description: "Could not save the account number.", variant: "destructive" });
      return;
    }
    setClaimDraft(trimmed);
    setSavedClaim(trimmed);
    await queryClient.invalidateQueries({ queryKey: ["portal-identity", user.id] });
    toast({
      title: trimmed ? "Account number saved" : "Account number cleared",
      description: trimmed ? "Our team will confirm and link your account." : undefined,
    });
  };

  const handleStartEditProfileField = (field: InlineProfileField) => {
    setProfileDraft(form.getValues(field));
    setEditingProfileField(field);
  };

  const handleCancelEditProfileField = () => {
    setEditingProfileField(null);
    setProfileDraft("");
  };

  const handleSaveProfileField = async (field: InlineProfileField) => {
    const trimmed = profileDraft.trim();
    const label = inlineProfileLabels[field];
    if (!trimmed) {
      toast({ title: `${label} is required`, description: `Enter a ${label.toLowerCase()} before saving.`, variant: "destructive" });
      return;
    }
    if (trimmed.length > inlineProfileMaxLength[field]) {
      toast({ title: `${label} is too long`, description: `${label} must be ${inlineProfileMaxLength[field]} characters or less.`, variant: "destructive" });
      return;
    }

    if (field === "phone") {
      const digits = trimmed.replace(/\D/g, "");
      if (/[^\d\s+().\-]/.test(trimmed) || digits.length < 7 || digits.length > 15) {
        toast({ title: "Check the phone number", description: "Use 7 to 15 digits. Spaces, +, dashes and brackets are fine.", variant: "destructive" });
        return;
      }
    }

    const values = { ...form.getValues(), [field]: trimmed };
    setSavingProfileField(field);
    const saved = await saveProfileValues(
      values,
      `${label} updated.`,
    );
    setSavingProfileField(null);
    if (!saved) return;
    form.setValue(field, trimmed, { shouldDirty: false, shouldTouch: false });
    setEditingProfileField(null);
    setProfileDraft("");
  };

  const handleStartEditEmail = () => {
    setNewEmail(user?.email || "");
    setEditingEmail(true);
  };

  const handleCancelEditEmail = () => {
    setEditingEmail(false);
    setNewEmail("");
  };

  const handleSaveEmail = async () => {
    const trimmed = newEmail.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setChangingEmail(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setEditingEmail(false);
    setNewEmail("");
    toast({
      title: "Confirmation sent",
      description: "Check your inbox to confirm the change — your email won't update until you do.",
    });
  };

  const handleSendReauthCode = async () => {
    if (emulation) return;
    setSendingReauthCode(true);
    const { error } = await supabase.auth.reauthenticate();
    setSendingReauthCode(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message.includes("security purposes")
          ? "Please wait about a minute before requesting another code."
          : error.message,
        variant: "destructive",
      });
      return;
    }

    setReauthSent(true);
    toast({ title: "Code sent", description: "Check your inbox for a verification code." });
  };

  const handleUpdatePassword = async () => {
    if (!verificationCode.trim()) {
      toast({ title: "Enter the code", description: "Please enter the verification code from your email.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords don't match", description: "Please confirm your new password.", variant: "destructive" });
      return;
    }

    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      nonce: verificationCode.trim(),
    });
    setUpdatingPassword(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setReauthSent(false);
    setVerificationCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    toast({ title: "Password updated", description: "Your password has been changed." });
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4" role="status" aria-label="Loading your profile">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const missingRequirements = getMissingProfileRequirements(
    {
      fullName: form.getValues("full_name"),
      phone: form.getValues("phone"),
      organizationName: form.getValues("organization_name"),
      hasShippingAddress: addresses.length > 0,
    },
    identity,
  );
  const fullName = form.watch("full_name");
  const phone = form.watch("phone");
  const organizationName = form.watch("organization_name");
  const profileName = capitalizeDisplayName(fullName, "Your profile");
  const initials = profileName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "ME";
  const statusBadges = [
    { label: `Email ${identity?.emailVerified ? "verified" : "pending"}`, ok: Boolean(identity?.emailVerified) },
    { label: `Profile ${identity?.profileCompleted ? "complete" : "incomplete"}`, ok: Boolean(identity?.profileCompleted) },
    { label: `Access ${identity?.portalAccessStatus?.replace(/_/g, " ") || "pending profile"}`, ok: identity?.portalAccessStatus === "approved_customer" },
  ];

  const checklist = [
    { label: "Full name", done: !missingRequirements.some((item) => item.key === "full_name"), to: "/profile/account?focus=full_name" },
    { label: "Phone number", done: !missingRequirements.some((item) => item.key === "phone"), to: "/profile/account?focus=phone" },
    { label: "Organization", done: !missingRequirements.some((item) => item.key === "organization_name"), to: "/profile/account?focus=organization_name" },
    { label: "Shipping address", done: addresses.length > 0 || identity?.portalAccessStatus === "approved_customer", href: "#address-book" },
    { label: "Email verified", done: Boolean(identity?.emailVerified) },
    { label: "ERP account linked", done: Boolean(identity?.accountNumber) },
  ];
  const completedCount = checklist.filter((item) => item.done).length;
  const completionPercent = Math.round((completedCount / checklist.length) * 100);
  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8;
  const passwordMismatch = confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-foreground">Your Profile</h2>
            <p className="text-sm text-muted-foreground">Manage contact details, account access, and security.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSendReauthCode} disabled={sendingReauthCode || !!emulation}>
            <KeyRound className="mr-2 h-4 w-4" />
            {sendingReauthCode ? "Sending..." : "Change password"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => { void signOut(); }}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>

      <div className="max-w-3xl space-y-3">
          <Card className={`overflow-hidden shadow-sm ${completionPercent < 100 ? "border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/20" : "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20"}`}>
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{completionPercent < 100 ? "Finish setting up your profile" : "Your profile is complete"}</p>
                <span className="text-sm font-semibold tabular-nums text-foreground">{completedCount}/{checklist.length}</span>
              </div>
              <Progress value={completionPercent} aria-label={`Profile ${completionPercent}% complete`} className="h-1.5" />
              {completionPercent < 100 ? (
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {checklist.map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-sm">
                      {item.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      {item.done ? (
                        <span className="text-muted-foreground">{item.label}</span>
                      ) : item.to ? (
                        <Link to={item.to} className="font-medium underline underline-offset-2">Add {item.label.toLowerCase()}</Link>
                      ) : item.href ? (
                        <a href={item.href} className="font-medium underline underline-offset-2">Add {item.label.toLowerCase()}</a>
                      ) : (
                        <span className="font-medium">{item.label} pending</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-950 md:border">
            <CardContent className="space-y-0 p-3">
              <EditableField
                icon={User}
                label="Full name"
                name="full_name"
                value={profileName}
                editing={editingProfileField === "full_name"}
                draft={profileDraft}
                saving={savingProfileField === "full_name"}
                readOnly={!!emulation}
                onDraft={setProfileDraft}
                onStart={() => handleStartEditProfileField("full_name")}
                onSave={() => handleSaveProfileField("full_name")}
                onCancel={handleCancelEditProfileField}
              />
              <EditableField
                icon={AtSign}
                label="Email"
                type="email"
                value={user?.email || ""}
                hint={editingEmail ? "We'll email a confirmation link. Your email won't change until you confirm." : undefined}
                editing={editingEmail}
                draft={newEmail}
                saving={changingEmail}
                readOnly={!!emulation}
                onDraft={setNewEmail}
                onStart={handleStartEditEmail}
                onSave={handleSaveEmail}
                onCancel={handleCancelEditEmail}
              />
              <EditableField
                icon={Phone}
                label="Phone"
                name="phone"
                value={phone}
                editing={editingProfileField === "phone"}
                draft={profileDraft}
                saving={savingProfileField === "phone"}
                readOnly={!!emulation}
                onDraft={setProfileDraft}
                onStart={() => handleStartEditProfileField("phone")}
                onSave={() => handleSaveProfileField("phone")}
                onCancel={handleCancelEditProfileField}
              />
              <EditableField
                icon={Building2}
                label="Organization"
                name="organization_name"
                value={organizationName || ""}
                editing={editingProfileField === "organization_name"}
                draft={profileDraft}
                saving={savingProfileField === "organization_name"}
                readOnly={!!emulation}
                onDraft={setProfileDraft}
                onStart={() => handleStartEditProfileField("organization_name")}
                onSave={() => handleSaveProfileField("organization_name")}
                onCancel={handleCancelEditProfileField}
              />
              <div className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-1 text-sm transition-colors hover:bg-muted/50">
                <IdCard className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">ERP account</p>
                  {identity?.accountNumber ? (
                    <p className="truncate font-mono font-medium text-foreground">{identity.accountNumber}</p>
                  ) : emulation ? (
                    <p className="truncate font-medium text-muted-foreground">Not linked yet</p>
                  ) : savedClaim ? (
                    <div className="space-y-1">
                      <p className="truncate font-mono font-medium text-foreground">{savedClaim}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Submitted. Our team is confirming it. To change this number, contact us.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Input
                          name="claimed_account_number"
                          aria-label="ERP account number"
                          value={claimDraft}
                          onChange={(e) => setClaimDraft(e.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void handleSaveClaim();
                            }
                          }}
                          placeholder="Account # from your invoice (optional)"
                          className="h-9 font-mono text-sm"
                          disabled={savingClaim}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={handleSaveClaim}
                          disabled={savingClaim || claimDraft.trim().toUpperCase() === savedClaim}
                          aria-label="Save account number"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Already a customer? Enter your account number to speed up approval. Our team confirms it before it's linked.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {role === "admin" ? (
                <Button asChild variant="outline" size="sm" className="mt-3"><Link to="/admin/dashboard">Admin</Link></Button>
              ) : role ? (
                <Badge
                  className="mt-3 h-5 border-0 px-1.5 py-0 text-[10px] font-medium"
                  style={{ background: roleBadgeStyle[role]?.bg, color: roleBadgeStyle[role]?.color }}
                >
                  {role}
                </Badge>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-950 md:border">
            <CardContent className="space-y-2 p-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" />{identity?.portalAccessNote || "Complete setup to create your CRM contact and customer workflow."}</p>
              <div className="flex flex-wrap gap-1.5">
                {statusBadges.map((item) => (
                  <Badge key={item.label} variant="outline" className={`gap-1 text-xs ${item.ok ? "border-emerald-300 text-emerald-700 dark:text-emerald-400" : "border-amber-300 text-amber-700 dark:text-amber-400"}`}>
                    {item.ok ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                    {item.label}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div id="address-book" className="scroll-mt-20">
            <AddressBookSection
              title="Saved addresses"
              description="Manage the shipping and billing addresses available during checkout."
            />
          </div>

          <div id="payment-methods" className="scroll-mt-20">
            <PaymentMethodsSection
              title="Saved payment methods"
              description="Cards saved during checkout appear here. You can update their saved details or remove them."
              allowCreate={false}
            />
          </div>

          {reauthSent ? (
            <Card className="overflow-hidden border-0 bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-950 md:border">
              <CardContent className="space-y-2 p-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Update password</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the verification code we emailed you, along with your new password.
                </p>
                <div className="grid gap-2">
                  <Input
                    placeholder="Verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    disabled={updatingPassword}
                  />
                  <Input
                    type="password"
                    placeholder="New password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={updatingPassword}
                    aria-invalid={passwordTooShort}
                  />
                  <p className={`text-[11px] ${passwordTooShort ? "text-destructive" : "text-muted-foreground"}`}>Use at least 8 characters.</p>
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={updatingPassword}
                    aria-invalid={passwordMismatch}
                  />
                  {passwordMismatch ? <p className="text-[11px] text-destructive">Passwords don't match yet.</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleUpdatePassword} disabled={updatingPassword}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    {updatingPassword ? "Updating…" : "Update Password"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updatingPassword}
                    onClick={() => {
                      setReauthSent(false);
                      setVerificationCode("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="link" size="sm" onClick={handleSendReauthCode} disabled={sendingReauthCode}>
                    {sendingReauthCode ? "Resending…" : "Resend code"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

      </div>
    </section>
  );
};

export default MyAccountSection;
