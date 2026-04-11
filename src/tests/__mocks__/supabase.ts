// Lightweight mock for @/integrations/supabase/client used in tests
export const supabase = {
  from: () => ({ select: () => ({ data: [], error: null }) }),
  auth: { getSession: async () => ({ data: { session: null }, error: null }) },
  functions: { invoke: async () => ({ data: null, error: null }) },
};
