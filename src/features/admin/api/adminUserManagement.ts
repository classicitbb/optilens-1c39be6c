import { supabase } from "@/integrations/supabase/client";

const getResponseErrorMessage = async (response: Response) => {
  const raw = await response.text();

  if (!raw) {
    return `Request failed (${response.status})`;
  }

  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? raw;
  } catch {
    return raw;
  }
};

export async function callAdminUserManagement<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.access_token) {
    throw new Error("No active session. Please sign in again.");
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "x-admin-auth-token": session.access_token,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  const raw = await response.text();
  return (raw ? JSON.parse(raw) : null) as T;
}