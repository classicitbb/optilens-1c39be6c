/**
 * Readable reason from a failed `supabase.functions.invoke` call.
 *
 * On a non-2xx response supabase-js sets `data` to null and returns the raw
 * Response on `error.context`, so the function's `{ error: "..." }` body is only
 * reachable by reading it from there. Without this callers show the generic
 * "Edge Function returned a non-2xx status code".
 */
export async function functionErrorMessage(
  error: { message?: string; context?: unknown } | null,
  data: unknown,
  fallback: string,
): Promise<string> {
  const fromData = (data as { error?: string } | null)?.error;
  if (fromData) return fromData;
  const context = error?.context;
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: string } | null;
      if (body?.error) return body.error;
    } catch {
      // Body was not JSON; fall through to the generic message.
    }
  }
  return error?.message || fallback;
}
