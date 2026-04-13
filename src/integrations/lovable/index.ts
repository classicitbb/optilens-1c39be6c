import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple", opts?: SignInOptions) => {
      const redirectTo = opts?.redirect_uri;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: {
            ...opts?.extraParams,
          },
        },
      });

      if (error) {
        return { error };
      }

      return {
        data,
        redirected: Boolean(data?.url),
      };
    },
  },
};
