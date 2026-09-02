import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type EnrichmentResponse = {
  ok?: boolean;
  error?: string;
  skipped?: string;
  processed?: number;
  applied?: number;
  pendingReview?: number;
  failed?: number;
};

/**
 * Runs the public-web enrichment sweep for one contact or a bounded batch.
 *
 * Blank fields are filled straight away; anything that contradicts a value
 * already on the contact is left for approval in the Copilot, so the toast
 * deliberately reports those two counts separately.
 */
export const useContactEnrichment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { contactId?: string; limit?: number }) => {
      const { data, error } = await supabase.functions.invoke("crm-enrich-contacts", { body: input });
      if (error) throw error;
      const result = (data ?? {}) as EnrichmentResponse;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: (result) => {
      if (result.skipped === "daily_cap") {
        toast({
          title: "Enrichment paused for today",
          description: "The daily public-lookup limit has been reached. It resumes automatically.",
        });
        return;
      }
      const applied = result.applied ?? 0;
      const pending = result.pendingReview ?? 0;
      toast({
        title: applied || pending ? "Enrichment finished" : "Nothing new found",
        description: applied || pending
          ? `Filled ${applied} blank field${applied === 1 ? "" : "s"} across ${result.processed ?? 0} contact${result.processed === 1 ? "" : "s"}. ${pending} finding${pending === 1 ? "" : "s"} conflict with existing values and need approval in the Copilot.`
          : `Checked ${result.processed ?? 0} contact${result.processed === 1 ? "" : "s"}; no public details were missing.`,
      });
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not enrich contacts", description: error.message, variant: "destructive" });
    },
  });
};
