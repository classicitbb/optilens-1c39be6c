import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CopilotMarkdown } from "@/features/admin/copilot/CopilotMarkdown";
import { fetchCopilotFacts } from "@/features/admin/settings/copilotFactsApi";

function PromptBlock({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          The exact system prompt sent to the model for {label}.
        </p>
        <Button size="sm" variant="outline" onClick={onCopy}>
          <Copy className="mr-2 h-3.5 w-3.5" /> Copy
        </Button>
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words border border-border bg-muted p-3 text-xs leading-5">
        {value}
      </pre>
    </div>
  );
}

export function CopilotFactsCard({ enabled }: { enabled: boolean }) {
  const { toast } = useToast();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["copilot-facts"],
    queryFn: fetchCopilotFacts,
    enabled,
  });

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" /> Platform facts & AI system prompts
        </CardTitle>
        <CardDescription>
          What each AI surface has actually been told about its authorization and access — read-only, generated from
          the live prompt source.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading platform facts…
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">
            Unable to load platform facts: {error instanceof Error ? error.message : "Unknown error"}
          </p>
        )}
        {data && (
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="facts">
              <AccordionTrigger>Platform facts</AccordionTrigger>
              <AccordionContent>
                <div className="mb-2 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => copy(data.platformFactsMarkdown, "Platform facts")}>
                    <Copy className="mr-2 h-3.5 w-3.5" /> Copy markdown
                  </Button>
                </div>
                <CopilotMarkdown content={data.platformFactsMarkdown} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="admin-prompt">
              <AccordionTrigger>Admin Copilot system prompt</AccordionTrigger>
              <AccordionContent>
                <PromptBlock
                  label="the admin Portal Copilot"
                  value={data.adminSystemPrompt}
                  onCopy={() => copy(data.adminSystemPrompt, "Admin Copilot system prompt")}
                />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="public-prompt">
              <AccordionTrigger>Public assistant system prompt</AccordionTrigger>
              <AccordionContent>
                <PromptBlock
                  label="the public support assistant"
                  value={data.publicSystemPrompt}
                  onCopy={() => copy(data.publicSystemPrompt, "Public assistant system prompt")}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

export default CopilotFactsCard;
