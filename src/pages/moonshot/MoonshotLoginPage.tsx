import { useCallback, useEffect, useMemo, useState } from "react";
import { Rocket } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { hasPermission } from "@/lib/accessControl";
import { lovable } from "@/integrations/lovable";
import { useRobotsMeta } from "@/hooks/useRobotsMeta";

const MoonshotLoginPage = () => {
  useRobotsMeta("noindex, nofollow");

  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signOut, user } = useAuth();
  const { role } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect");
  const authError = params.get("error");
  const moonshotRedirectTarget = redirect && redirect.startsWith("/moonshot") ? redirect : "/moonshot/dashboard";

  const detectedEmail = useMemo(() => user?.email ?? localStorage.getItem("moonshot:last-email") ?? "", [user?.email]);

  const routeUser = useCallback(() => {
    if (hasPermission(role, "moonshot_access")) {
      navigate(moonshotRedirectTarget, { replace: true });
      return;
    }

    navigate("/moonshot/login?error=access_denied", { replace: true });
  }, [moonshotRedirectTarget, navigate, role]);


  useEffect(() => {
    if (user) {
      routeUser();
    }
  }, [routeUser, user]);

  const handleQuickEnter = async () => {
    if (user) {
      routeUser();
      return;
    }

    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/moonshot/login?redirect=${encodeURIComponent(moonshotRedirectTarget)}`,
      extraParams: detectedEmail ? { login_hint: detectedEmail } : undefined,
    });

    if (error) {
      toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    localStorage.setItem("moonshot:last-email", email);
    routeUser();
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#041f3d]">
      <section className="hidden lg:flex items-center justify-center bg-gradient-to-br from-[#041f3d] via-[#06294f] to-[#0b1730]">
        <div className="text-center text-white">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10">
            <Rocket className="h-9 w-9" />
          </div>
          <h1 className="text-5xl font-bold lowercase tracking-tight">moonshot</h1>
          <p className="mt-4 text-sm uppercase tracking-[0.35em] text-white/80">AN ECOSYSTEM FOR GROWTH™</p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 bg-[#042549]">
        <div className={`w-full max-w-md rounded-2xl bg-[#f4f5f7] shadow-2xl p-8 transition-all duration-300 ${expanded ? "min-h-[520px]" : "min-h-[320px]"}`}>
          {authError === "access_denied" && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Your account is authenticated, but it does not currently have Moonshot access.
              <button
                type="button"
                className="ml-2 font-semibold underline"
                onClick={async () => {
                  await signOut();
                  navigate("/moonshot/login", { replace: true });
                }}
              >
                Sign out
              </button>
            </div>
          )}
          {!expanded ? (
            <div className="space-y-6 text-center">
              <h2 className="text-3xl font-semibold text-[#0b2a4a]">Welcome back</h2>
              {detectedEmail && <div className="rounded-full bg-[#d8dde6] px-4 py-3 text-left text-sm text-[#1f3551]">{detectedEmail}</div>}
              <Button className="w-full rounded-full bg-[#1cc7a1] text-white hover:bg-[#15b390]" onClick={handleQuickEnter}>Enter Moonshot</Button>
              <p className="text-sm text-[#57728f]">Not you? <button className="text-[#11a489]" onClick={() => setExpanded(true)}>Sign in with a different account</button></p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSignIn}>
              <h2 className="text-3xl font-semibold text-[#0b2a4a] text-center">Welcome Back</h2>
              <Input className="rounded-full h-11 bg-[#d8dde6]" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input className="rounded-full h-11 bg-[#d8dde6]" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" disabled={submitting} className="w-full rounded-full bg-[#69a7bc] hover:bg-[#5b99ae]">Sign In</Button>
              <div className="text-center text-xs text-[#57728f]">OR CONTINUE WITH</div>
              <Button type="button" variant="outline" className="w-full rounded-full" onClick={handleQuickEnter}>Sign in with Google</Button>
              <p className="text-center text-sm text-[#57728f]">Don’t have an account? <button type="button" className="text-[#11a489]" onClick={() => toast({ title: 'Contact your administrator', description: 'Moonshot accounts are provisioned internally.' })}>Sign up</button></p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default MoonshotLoginPage;
