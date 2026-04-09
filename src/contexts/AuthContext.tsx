import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { resolveUserAvatar, resolveUserFullName } from "@/lib/profileData";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, details?: { fullName?: string; phone?: string }) => Promise<{ error: Error | null }>;
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

      const payload: Record<string, unknown> = {
        user_id: user.id,
        display_name: fullName || null,
        full_name: fullName || null,
        avatar_url: avatarUrl || null,
        email: user.email || null,
      };

      if (phone) {
        payload.phone = phone;
      }

      await (supabase.from("profiles") as any).upsert(payload as never, { onConflict: "user_id" });
      await (supabase.rpc as any)("sync_customer_portal_identity", { p_user_id: user.id });
    };

    syncProfileFromUser();
  }, [user]);

  const signUp = useCallback(async (email: string, password: string, details?: { fullName?: string; phone?: string }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: details?.fullName?.trim() || "",
          phone: details?.phone?.trim() || "",
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
    await supabase.auth.signOut();
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
