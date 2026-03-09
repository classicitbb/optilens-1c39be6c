import { useState } from "react";
import { Rocket, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { useMoonshotStore } from "../lib/store";

/**
 * Moonshot login gate:
 * - Authenticated users see their email and one-click "Enter"
 * - Unauthenticated users see a full login form
 */
export default function MoonshotLoginGate() {
  const { user, signIn, loading: authLoading } = useAuth();
  const { login } = useMoonshotStore();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* Authenticated → auto-enter */
  const handleEnter = () => {
    login(); // activates Zustand session
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    login();
  };

  const handleGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/admin/moonshot/dashboard",
    });
    if (error) toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[hsl(210,50%,12%)]">
        <Rocket className="h-8 w-8 text-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[hsl(210,50%,12%)]">
      {/* ── Left branding panel ── */}
      <div className="flex flex-col items-center justify-center px-8 py-12 lg:flex-1">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 backdrop-blur">
            <Rocket className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            moonshot
          </h1>
          <p className="text-sm uppercase tracking-[0.25em] text-white/60">
            An Ecosystem for Growth™
          </p>
        </div>
      </div>

      {/* ── Right login card ── */}
      <div className="flex items-center justify-center px-4 py-10 lg:flex-1">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-white p-8 shadow-2xl">
          {user ? (
            /* ── Authenticated quick-enter ── */
            <div className="flex flex-col items-center gap-6">
              <h2 className="text-xl font-semibold text-foreground">Welcome back</h2>
              <div className="w-full rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground">
                {user.email}
              </div>
              <Button className="w-full bg-[hsl(168,76%,42%)] hover:bg-[hsl(168,76%,36%)] text-white" onClick={handleEnter}>
                Enter Moonshot
              </Button>
              <p className="text-xs text-muted-foreground">
                Not you?{" "}
                <button type="button" className="text-[hsl(168,76%,42%)] hover:underline" onClick={() => window.location.href = "/auth"}>
                  Sign in with a different account
                </button>
              </p>
            </div>
          ) : (
            /* ── Unauthenticated login form ── */
            <>
              <h2 className="mb-6 text-xl font-semibold text-foreground">Log in to your account</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="ms-email" className="mb-1 block text-sm font-medium text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="ms-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="ms-pw" className="mb-1 block text-sm font-medium text-foreground">Password</label>
                  <div className="relative">
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPw(!showPw)}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <Input
                      id="ms-pw"
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="mt-1 text-right">
                    <a href="/reset-password" className="text-xs text-[hsl(168,76%,42%)] hover:underline">
                      Forgot password?
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox id="ms-remember" />
                  <label htmlFor="ms-remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</label>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[hsl(168,76%,42%)] hover:bg-[hsl(168,76%,36%)] text-white"
                >
                  {submitting ? "Logging in…" : "Login"}
                </Button>
              </form>

              {/* ── Social login ── */}
              <div className="mt-5 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogle}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in with Google
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
