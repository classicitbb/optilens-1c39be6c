import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AtSign, Building2, Check, CheckCircle2, IdCard, KeyRound, LogOut, Pencil, Phone, Shield, User, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { capitalizeDisplayName, resolveUserFullName } from "@/lib/profileData";
import { type ProfileFormValues, profileSchema } from "@/features/portal/profileSchema";
import { getMissingProfileRequirements } from "@/features/portal/profileCompletion";
import { useCustomerAddresses } from "@/hooks/useCustomerAddresses";

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

const MyAccountSection = () => {
  const { user, signOut } = useAuth();
  const { role, hasAccess } = useUserRole();
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
      } else {
        form.reset({
          full_name: emulation ? "" : resolveUserFullName(user),
          phone: "",
          organization_name: "",
        });
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

    await (supabase.rpc as any)("sync_customer_portal_identity", { p_user_id: user.id });
    await queryClient.invalidateQueries({ queryKey: ["portal-identity", user.id] });
    toast({ title: "Success", description: successDescription });
    return true;
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

    const values = { ...form.getValues(), [field]: trimmed };
    setSavingProfileField(field);
    const saved = await saveProfileValues(values, `${label} updated.`);
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
    if (newPassword.trim().length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword.trim() !== confirmNewPassword.trim()) {
      toast({ title: "Passwords don't match", description: "Please confirm your new password.", variant: "destructive" });
      return;
    }

    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword.trim(),
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
    `Email ${identity?.emailVerified ? "verified" : "pending"}`,
    `Profile ${identity?.profileCompleted ? "complete" : "incomplete"}`,
    `Access ${identity?.portalAccessStatus?.replace(/_/g, " ") || "pending profile"}`,
    ...(identity?.crmContactId ? ["CRM contact linked"] : []),
    ...(identity?.crmCustomerId ? ["Customer approved"] : []),
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold text-foreground">Your Profile</h2>
            <p className="text-sm text-muted-foreground">Manage contact details, account access, and security.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasAccess ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          ) : null}
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

      <div className="max-w-3xl space-y-4">
          <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-muted-foreground">Full name</dt>
                  {editingProfileField === "full_name" ? (
                    <dd className="mt-1 flex items-center gap-1.5">
                      <Input
                        name="full_name"
                        value={profileDraft}
                        onChange={(e) => setProfileDraft(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        disabled={savingProfileField === "full_name"}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleSaveProfileField("full_name")}
                        disabled={savingProfileField === "full_name"}
                        aria-label="Save full name"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={handleCancelEditProfileField}
                        disabled={savingProfileField === "full_name"}
                        aria-label="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </dd>
                  ) : (
                    <dd className="flex items-center gap-1.5 truncate font-medium text-foreground">
                      <span className="truncate">{profileName}</span>
                      {emulation ? null : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={() => handleStartEditProfileField("full_name")}
                          aria-label="Edit full name"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </dd>
                  )}
                  <p className="truncate text-xs text-muted-foreground">{user?.email || "No email on file"}</p>
                </div>
              </div>
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    {editingEmail ? (
                      <dd className="mt-1 flex items-center gap-1.5">
                        <Input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          disabled={changingEmail}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={handleSaveEmail}
                          disabled={changingEmail}
                          aria-label="Save email"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={handleCancelEditEmail}
                          disabled={changingEmail}
                          aria-label="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </dd>
                    ) : (
                      <dd className="flex items-center gap-1.5 truncate font-medium text-foreground">
                        <span className="truncate">{user?.email || "—"}</span>
                        {emulation ? null : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={handleStartEditEmail}
                            aria-label="Edit email"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </dd>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    {editingProfileField === "phone" ? (
                      <dd className="mt-1 flex items-center gap-1.5">
                        <Input
                          name="phone"
                          value={profileDraft}
                          onChange={(e) => setProfileDraft(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          disabled={savingProfileField === "phone"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleSaveProfileField("phone")}
                          disabled={savingProfileField === "phone"}
                          aria-label="Save phone"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={handleCancelEditProfileField}
                          disabled={savingProfileField === "phone"}
                          aria-label="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </dd>
                    ) : (
                      <dd className="flex items-center gap-1.5 truncate font-medium text-foreground">
                        <span className="truncate">{phone || "—"}</span>
                        {emulation ? null : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => handleStartEditProfileField("phone")}
                            aria-label="Edit phone"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </dd>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs text-muted-foreground">Organization</dt>
                    {editingProfileField === "organization_name" ? (
                      <dd className="mt-1 flex items-center gap-1.5">
                        <Input
                          name="organization_name"
                          value={profileDraft}
                          onChange={(e) => setProfileDraft(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          disabled={savingProfileField === "organization_name"}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleSaveProfileField("organization_name")}
                          disabled={savingProfileField === "organization_name"}
                          aria-label="Save organization"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={handleCancelEditProfileField}
                          disabled={savingProfileField === "organization_name"}
                          aria-label="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </dd>
                    ) : (
                      <dd className="flex items-center gap-1.5 truncate font-medium text-foreground">
                        <span className="truncate">{organizationName || "—"}</span>
                        {emulation ? null : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => handleStartEditProfileField("organization_name")}
                            aria-label="Edit organization"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </dd>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <IdCard className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">ERP account</dt>
                    <dd className="truncate font-mono font-medium text-foreground">{identity?.accountNumber || "ACC#"}</dd>
                  </div>
                </div>
              </dl>
              {role ? (
                <Badge
                  className="h-5 border-0 px-1.5 py-0 text-[10px] font-medium"
                  style={{ background: roleBadgeStyle[role]?.bg, color: roleBadgeStyle[role]?.color }}
                >
                  {role}
                </Badge>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Workflow status</h3>
              </div>
              <p className="text-sm text-muted-foreground">{identity?.portalAccessNote || "Complete setup to create your CRM contact and customer workflow."}</p>
              <div className="flex flex-wrap gap-2">
                {statusBadges.map((item) => (
                  <Badge key={item} variant="outline" className="text-xs">{item}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {reauthSent ? (
            <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={updatingPassword}
                  />
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={updatingPassword}
                  />
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

          {missingRequirements.length ? (
            <Card className="border-amber-400/50 bg-amber-50/40 shadow-sm dark:bg-amber-950/20">
              <CardContent className="space-y-2 p-4">
                <p className="text-sm font-medium text-foreground">Profile setup required</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {missingRequirements.map((item) => (
                    <li key={item.key}>
                      <Link to={`${item.route}?focus=${item.focus}`} className="underline underline-offset-2">
                        Add {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
      </div>
    </section>
  );
};

export default MyAccountSection;
