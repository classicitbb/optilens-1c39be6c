import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";
import cleanLogoSmooth from "@/assets/clean_logo_smooth.svg";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash; onAuthStateChange fires
    // with event "PASSWORD_RECOVERY" once the session is established from that token.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setIsSubmitting(false);
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    toast({ title: "Password updated!", description: "You can now sign in with your new password." });
    setTimeout(() => navigate("/auth"), 3000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent">
              <Eye className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Classic Visions</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {done ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-elegant space-y-4">
              <CheckCircle className="mx-auto h-12 w-12 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Password Updated</h2>
              <p className="text-muted-foreground">Redirecting you to sign in…</p>
            </div>
          ) : !ready ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center shadow-elegant space-y-4">
              <Lock className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
              <h2 className="text-2xl font-bold text-foreground">Verifying Reset Link</h2>
              <p className="text-muted-foreground">
                Please wait while we verify your reset link. If nothing happens,{" "}
                <Link to="/auth" className="text-primary hover:underline">
                  request a new link
                </Link>.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-accent">
                  <Lock className="h-8 w-8 text-accent-foreground" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">Set New Password</h1>
                <p className="mt-2 text-muted-foreground">Enter your new password below.</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-8 shadow-elegant">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input type="password" placeholder="••••••••" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input type="password" placeholder="••••••••" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" variant="hero" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Updating…" : "Update Password"}
                    </Button>
                  </form>
                </Form>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
