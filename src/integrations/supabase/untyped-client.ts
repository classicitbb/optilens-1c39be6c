/**
 * Re-export the supabase client with relaxed typing.
 *
 * The auto-generated types.ts includes a PostgrestVersion qualifier that
 * causes column-level type inference to fail for many tables when using
 * newer @supabase/supabase-js releases. Casting the client to `any` here
 * lets call-sites use `.from("table")` without per-line `as any` hacks
 * while we wait for the types to be regenerated.
 *
 * Usage:  import { supabaseAny } from "@/integrations/supabase/untyped-client";
 *         const { data } = await supabaseAny.from("my_table").select("*");
 */
import { supabase } from "./client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAny = supabase as any;
