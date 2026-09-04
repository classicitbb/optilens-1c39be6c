import { supabase } from "@/integrations/supabase/client";

export interface CopilotFacts {
  platformFactsMarkdown: string;
  adminSystemPrompt: string;
  publicSystemPrompt: string;
  generatedAt: string;
}

export async function fetchCopilotFacts(): Promise<CopilotFacts> {
  const { data, error } = await supabase.functions.invoke("copilot-facts");
  if (error) throw new Error(error.message);
  return data as CopilotFacts;
}
