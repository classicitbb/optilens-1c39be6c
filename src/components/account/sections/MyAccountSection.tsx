import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AtSign, Building2, Check, CheckCircle2, IdCard, KeyRound, LogOut, Pencil, Phone, Save, Shield, User, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { resolveUserAvatar, resolveUserFullName } from "@/lib/profileData";
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

const MyAccountSection = () => {
  const { user, signOut } = useAuth();
  const { role, hasAccess } = useUserRole();
  const { identity, emulation, effectiveUserId } = usePortalIdentity();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();
  const { addresses } = useCustomerAddresses(emulation?.userId);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [reauthSent, setReauthSent] = useState(false);
  const [sendingReauthCode, setSendingReauthCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", phone: "", display_name: "", bio: "", avatar_url: "", organization_name: "" },
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
          display_name: data.display_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || (emulation ? "" : resolveUserAvatar(user)),
          organization_name: data.organization_name || "",
        });
      } else {
        form.reset({
          full_name: emulation ? "" : resolveUserFullName(user),
          phone: "",
          display_name: "",
          bio: "",
          avatar_url: emulation ? "" : resolveUserAvatar(user),
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
    const target = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name='${focus}']`);
    target?.focus();
  }, [searchParams]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    if (emulation) {
      toast({ title: "Read-only while emulating", description: "Exit emulation to edit your own profile." });
      return;
    }

    setSaving(true);
    const { error } = await (supabase.from("profiles") as any)
      .upsert({
        user_id: user.id,
        full_name: values.full_name.trim(),
        phone: values.phone.trim(),
        display_name: values.display_name || null,
        bio: values.bio || null,
        avatar_url: values.avatar_url || null,
        organization_name: values.organization_name?.trim() || null,
      }, { onConflict: "user_id" });

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
      return;
    }

    await (supabase.rpc as any)("sync_customer_portal_identity", { p_user_id: user.id });
    await queryClient.invalidateQueries({ queryKey: ["portal-identity", user.id] });
    toast({ title: "Success", description: "Profile updated successfully" });
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
  const displayName = form.watch("display_name");
  const profileName = fullName || displayName || "Your profile";
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
        <div className="space-y-4">
          <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{profileName}</p>
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
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    <dd className="truncate font-medium text-foreground">{phone || "—"}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Organization</dt>
                    <dd className="truncate font-medium text-foreground">{organizationName || "—"}</dd>
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

        <Card className="border-0 bg-white shadow-sm dark:bg-slate-950 md:border">
          <CardContent className="p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your display name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-9" placeholder="+1 (246) 555-0101" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organization_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization / Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Classic Visions" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <FormLabel>ERP Account Number</FormLabel>
                    <div
                      className="flex h-10 w-full items-center rounded-md border border-border bg-muted/40 px-3 font-mono text-sm text-foreground"
                      role="status"
                      aria-label="ERP Account Number"
                    >
                      {identity?.accountNumber || "ACC#"}
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="avatar_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avatar URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/avatar.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself..."
                            className="min-h-[84px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {emulation ? "Profile editing is read-only while emulating a customer." : "Changes update your portal profile and approval workflow."}
                  </p>
                  <Button type="submit" className="sm:w-auto" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default MyAccountSection;
