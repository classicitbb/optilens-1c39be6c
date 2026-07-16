import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { resolveUserAvatar, resolveUserFullName } from "@/lib/profileData";
import type { AuthAudience, AuthIntent } from "@/lib/authFlow";

export interface AuthSignupDetails {
  fullName?: string;
  phone?: string;
  organizationName?: string;
  audience?: AuthAudience | null;
  interestIntent?: AuthIntent | null;
  onboardingCompletedAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, details?: AuthSignupDetails) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const syncProfileFromUser = async () => {
      if (!user) return;

      const fullName = resolveUserFullName(user);
      const avatarUrl = resolveUserAvatar(user);
      const phone =
        typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone.trim() :
        typeof user.user_metadata?.phone_number === "string" ? user.user_metadata.phone_number.trim() :
        "";
      const organizationName =
        typeof user.user_metadata?.organization_name === "string" ? user.user_metadata.organization_name.trim() :
        typeof user.user_metadata?.organizationName === "string" ? user.user_metadata.organizationName.trim() :
        "";
      const audience =
        typeof user.user_metadata?.audience === "string" ? user.user_metadata.audience.trim() :
        "";
      const interestIntent =
        typeof user.user_metadata?.interest_intent === "string" ? user.user_metadata.interest_intent.trim() :
        typeof user.user_metadata?.interestIntent === "string" ? user.user_metadata.interestIntent.trim() :
        "";
      const onboardingCompletedAt =
        typeof user.user_metadata?.onboarding_completed_at === "string" ? user.user_metadata.onboarding_completed_at.trim() :
        typeof user.user_metadata?.onboardingCompletedAt === "string" ? user.user_metadata.onboardingCompletedAt.trim() :
        "";

      const payload: Record<string, unknown> = {
        user_id: user.id,
        display_name: fullName || null,
        full_name: fullName || null,
        avatar_url: avatarUrl || null,
        email: user.email || null,
        organization_name: organizationName || null,
        audience: audience || null,
        interest_intent: interestIntent || null,
        onboarding_completed_at: onboardingCompletedAt || null,
      };

      if (phone) {
        payload.phone = phone;
      }

      await (supabase.from("profiles") as any).upsert(payload as never, { onConflict: "user_id" });
      await (supabase.rpc as any)("sync_customer_portal_identity", { p_user_id: user.id });
    };

    syncProfileFromUser();
  }, [user]);

  const signUp = useCallback(async (email: string, password: string, details?: AuthSignupDetails) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: details?.fullName?.trim() || "",
          phone: details?.phone?.trim() || "",
          organization_name: details?.organizationName?.trim() || "",
          audience: details?.audience || "",
          interest_intent: details?.interestIntent || "",
          onboarding_completed_at: details?.onboardingCompletedAt || "",
        }
      }
    });
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    // Local scope: only end this browser's session. The supabase-js default
    // (global) revokes every session for the user, which silently killed
    // still-open admin tabs on other domains when switching test accounts.
    await supabase.auth.signOut({ scope: "local" });
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }), [user, session, loading, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
