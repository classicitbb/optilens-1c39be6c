import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, Mail, Lock, User } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage } from
"@/components/ui/form";

const authSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.
  string().
  min(6, { message: "Password must be at least 6 characters" }),
  fullName: z.string().optional(),
  phone: z.string().optional()
});

type AuthFormData = z.infer<typeof authSchema>;



const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(location.search);
  const rawRedirect = searchParams.get("redirect");
  const isSafeRedirect = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//");
  const from = isSafeRedirect ? rawRedirect : (location.state?.from?.pathname ?? "/");

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "", fullName: "", phone: "" }
  });

  const onSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          toast({
            title: "Login Failed",
            description: error.message.includes("Invalid login credentials") ?
            "Invalid email or password. Please try again." :
            error.message,
            variant: "destructive"
          });
          return;
        }
        toast({ title: "Welcome back!", description: "You have successfully logged in." });
      } else {
        if (!data.fullName?.trim()) {
          form.setError("fullName", { message: "Name is required" });
          return;
        }
        if (!data.phone?.trim()) {
          form.setError("phone", { message: "Phone number is required" });
          return;
        }

        const { error } = await signUp(data.email, data.password, {
          fullName: data.fullName,
          phone: data.phone,
        });
        if (error) {
          toast({
            title: error.message.includes("User already registered") ? "Account Exists" : "Sign Up Failed",
            description: error.message.includes("User already registered") ?
            "This email is already registered. Please log in instead." :
            error.message,
            variant: "destructive"
          });
          return;
        }
        toast({ title: "Account created!", description: "You have successfully signed up and logged in." });
      }
      } catch {
      toast({ title: "Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* ── Animated gradient background (Caribbean flag colours) ── */}
      <div className="absolute inset-0 animate-gradient-shift bg-[length:400%_400%]"
      style={{
        backgroundImage:
        "linear-gradient(135deg, hsl(210 80% 18%) 0%, hsl(195 90% 30%) 20%, hsl(48 95% 50%) 40%, hsl(145 55% 35%) 60%, hsl(0 75% 45%) 75%, hsl(215 65% 25%) 100%)"
      }} />


      {/* Extra glow blobs */}
      <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[hsl(195_90%_30%/0.35)] blur-[120px] animate-pulse" />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[hsl(48_95%_50%/0.25)] blur-[120px] animate-pulse [animation-delay:2s]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-[hsl(145_55%_35%/0.2)] blur-[100px] animate-pulse [animation-delay:4s]" />

      

      {/* ── Login card ── */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="rounded-2xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Eye className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {isLogin ? "Sign in to access your account" : "Sign up to get started"}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) =>
                !isLogin ?
                <FormItem>
                    <FormLabel className="text-white/80">Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                        <Input
                        placeholder="Jane Smith"
                        className="border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/40 focus-visible:ring-white/40"
                        {...field} />

                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem> :
                <></>
                } />


              <FormField
                control={form.control}
                name="phone"
                render={({ field }) =>
                !isLogin ?
                <FormItem>
                    <FormLabel className="text-white/80">Phone Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                        <Input
                        type="tel"
                        placeholder="+1 (246) 555-0101"
                        className="border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/40 focus-visible:ring-white/40"
                        {...field} />

                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem> :
                <></>
                } />


              <FormField
                control={form.control}
                name="email"
                render={({ field }) =>
                <FormItem>
                    <FormLabel className="text-white/80">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                        <Input
                        type="email"
                        placeholder="you@example.com"
                        className="border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/40 focus-visible:ring-white/40"
                        {...field} />

                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                } />


              <FormField
                control={form.control}
                name="password"
                render={({ field }) =>
                <FormItem>
                    <FormLabel className="text-white/80">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                        <Input
                        type="password"
                        placeholder="••••••••"
                        className="border-white/20 bg-white/10 pl-10 text-white placeholder:text-white/40 focus-visible:ring-white/40"
                        {...field} />

                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                } />


              <Button
                type="submit"
                className="w-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 border border-white/20"
                disabled={isSubmitting}>

                {isSubmitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
          </Form>

          <div className="my-5 flex flex-col items-center gap-2">
            <span className="w-full border-t border-white/20" />
            <span className="text-xs uppercase text-white/50">Or continue with</span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20"
            onClick={async () => {
              const safeFrom = from.startsWith("/") && !from.startsWith("//") ? from : "/";
              const redirectUri = safeFrom !== "/" ? `${window.location.origin}${safeFrom}` : window.location.origin;
              const { error } = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: redirectUri,
                extraParams: {
                  scope: "openid email profile",
                },
              });
              if (error) {
                toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
              }
            }}>

            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </Button>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {setIsLogin(!isLogin);form.reset();}}
              className="text-sm text-white/70 hover:text-white hover:underline">

              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>);

};

export default Auth;
