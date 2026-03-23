import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { KeyRound, Phone, Save, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(120, "Name must be less than 120 characters"),
  phone: z.string().trim().min(1, "Phone number is required").max(50, "Phone number must be less than 50 characters"),
  display_name: z.string().max(100, "Display name must be less than 100 characters").optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  avatar_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  organization_name: z.string().max(160, "Organization must be less than 160 characters").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const roleBadgeStyle: Record<string, { bg: string; color: string }> = {
  admin: { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 51%)" },
  operator: { bg: "hsl(215 65% 50% / 0.12)", color: "hsl(215 65% 50%)" },
  viewer: { bg: "hsl(215 15% 50% / 0.12)", color: "hsl(215 15% 50%)" },
  customer: { bg: "hsl(150 60% 40% / 0.12)", color: "hsl(150 60% 40%)" },
};

const MyAccountSection = () => {
  const { user } = useAuth();
  const { role, hasAccess } = useUserRole();
  const { identity } = usePortalIdentity();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", phone: "", display_name: "", bio: "", avatar_url: "", organization_name: "" },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await (supabase
        .from("profiles") as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle() as { data: Record<string, any> | null; error: any };

      if (error) {
        toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
      } else if (data) {
        form.reset({
          full_name: data.full_name || resolveUserFullName(user),
          phone: data.phone || "",
          display_name: data.display_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || resolveUserAvatar(user),
          organization_name: data.organization_name || "",
        });
      } else {
        form.reset({
          full_name: resolveUserFullName(user),
          phone: "",
          display_name: "",
          bio: "",
          avatar_url: resolveUserAvatar(user),
          organization_name: "",
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, form, toast]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;

    setSaving(true);
    const { error } = await (supabase
      .from("profiles") as any)
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

  const handleChangePassword = async () => {
    if (!user?.email) return;

    setResettingPw(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: window.location.origin,
    });
    setResettingPw(false);

    if (error) {
      toast({ title: "Error", description: "Failed to send reset email.", variant: "destructive" });
      return;
    }

    toast({ title: "Email sent", description: "Check your inbox for a password reset link." });
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <User className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">Your Profile</CardTitle>
        <CardDescription>Manage your account details and preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Full name:</span> {form.watch("full_name") || "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Email:</span> {user?.email}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Phone:</span> {form.watch("phone") || "—"}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Organization:</span> {form.watch("organization_name") || "—"}
          </p>
          {role && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Role:</span>
              <Badge
                className="h-5 border-0 px-1.5 py-0 text-[10px] font-medium"
                style={{ background: roleBadgeStyle[role]?.bg, color: roleBadgeStyle[role]?.color }}
              >
                {role}
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-lg border bg-background p-4">
          <p className="text-sm font-medium text-foreground">Customer workflow status</p>
          <p className="text-sm text-muted-foreground">{identity?.portalAccessNote || "Complete setup to create your CRM contact and customer workflow."}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Email {identity?.emailVerified ? "verified" : "pending"}</Badge>
            <Badge variant="outline">Profile {identity?.profileCompleted ? "complete" : "incomplete"}</Badge>
            <Badge variant="outline">Access {identity?.portalAccessStatus?.replace(/_/g, " ") || "pending profile"}</Badge>
            {identity?.crmContactId ? <Badge variant="outline">CRM contact linked</Badge> : null}
            {identity?.crmCustomerId ? <Badge variant="outline">Customer approved</Badge> : null}
          </div>
        </div>

        {hasAccess && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">
              <Shield className="mr-2 h-4 w-4" />
              Go to Admin
            </Link>
          </Button>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
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
            <Button type="submit" className="w-full" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>

        <div className="border-t pt-6">
          <h3 className="mb-2 text-sm font-semibold">Change Password</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            We'll send a password reset link to your email address.
          </p>
          <Button variant="outline" size="sm" onClick={handleChangePassword} disabled={resettingPw}>
            <KeyRound className="mr-2 h-4 w-4" />
            {resettingPw ? "Sending…" : "Send Reset Email"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MyAccountSection;
