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

const getFunctionErrorMessage = async (error: unknown) => {
  if (error && typeof error === "object") {
    const context = (error as { context?: Response }).context;
    if (context instanceof Response) {
      return getResponseErrorMessage(context);
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Request failed";
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

  const { data, error } = await supabase.functions.invoke("admin-user-management", {
    body,
    headers: {
      "x-admin-auth-token": session.access_token,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  if (data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string") {
    throw new Error((data as { error: string }).error);
  }

  return (data ?? null) as T;
}
