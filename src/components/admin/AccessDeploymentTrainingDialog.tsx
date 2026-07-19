import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CheckCircle2, ClipboardCopy, Lightbulb, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "optilens.access-deployment-training.completed-scenarios";

type TrainingScenario = {
  id: string;
  title: string;
  situation: string;
  prompt: string;
  resolution: string;
  outcome: string;
};

const scenarios: TrainingScenario[] = [
  {
    id: "existing-contact",
    title: "Existing contact needs a portal login",
    situation: "Nadia Reifer is already a contact at Enhanced Vision. The company has an ERP customer account, but Nadia has never signed in.",
    prompt: "Which account should Nadia access?",
    resolution: "Select the existing Enhanced Vision account, choose the required portal features, then send an invite or create a temporary password.",
    outcome: "One contact, one customer account, and one login remain linked. No duplicate customer is created.",
  },
  {
    id: "existing-login",
    title: "Existing login matches the email",
    situation: "The email belongs to a signed-up user, but the login is not connected to the contact or account you selected.",
    prompt: "An existing login uses this email. Link it or leave it unchanged?",
    resolution: "Confirm the existing login only after reviewing the selected contact and account. Leave it unchanged if the relationship is uncertain.",
    outcome: "The system never silently reassigns an existing login.",
  },
  {
    id: "unverified-user",
    title: "Unverified signed-up user",
    situation: "A user has signed up, but has not verified their email address yet.",
    prompt: "This person has not verified their email. Access will unlock after verification.",
    resolution: "Prepare the contact, customer link, and requested features. Do not treat the portal as usable until email verification completes.",
    outcome: "The setup is ready without weakening the email-verification safeguard.",
  },
  {
    id: "no-match",
    title: "No matching record",
    situation: "Searching by name, email, and account number returns no user, contact, or customer account.",
    prompt: "No match found. Create a contact and choose the next action when you are ready.",
    resolution: "Create only the person contact. Then decide whether to link an existing account, create an account, or deploy access later.",
    outcome: "The system does not invent a customer account or portal login.",
  },
  {
    id: "staff-access",
    title: "Internal staff user",
    situation: "A new internal colleague needs access to the admin workspace rather than a customer portal.",
    prompt: "Which staff role should this user have?",
    resolution: "Choose the role explicitly. Staff access does not create a customer, pricelist, or portal relationship.",
    outcome: "The person receives only the role they need.",
  },
  {
    id: "ambiguous-account",
    title: "Several accounts look possible",
    situation: "A contact is associated with more than one plausible company or ERP account.",
    prompt: "Review the available accounts and choose the one this person should access.",
    resolution: "Compare the company, account number, and contact relationship. If the system cannot safely resolve it, escalate instead of guessing.",
    outcome: "A portal user receives one deliberate primary account link.",
  },
  {
    id: "feature-access",
    title: "Feature and statement access",
    situation: "The person needs account access, but not every portal feature is appropriate.",
    prompt: "Which portal features should be enabled for this person?",
    resolution: "Choose features individually. Statements still require an Owner, CEO, or Buyer tag; a feature choice cannot bypass that rule.",
    outcome: "Access is specific, explainable, and safe to audit.",
  },
];

const escalationTemplate = `Access deployment follow-up

Person / email:
Contact selected:
Possible customer accounts:
What the system found:
Decision still needed:
Action attempted:
`;

export const hasCompletedAccessDeploymentTraining = () => {
  if (typeof window === "undefined") return false;
  try {
    const completed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(completed) && scenarios.every((scenario) => completed.includes(scenario.id));
  } catch {
    return false;
  }
};

interface AccessDeploymentTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrainingComplete?: () => void;
}

export function AccessDeploymentTrainingDialog({ open, onOpenChange, onTrainingComplete }: AccessDeploymentTrainingDialogProps) {
  const { toast } = useToast();
  const [activeScenarioId, setActiveScenarioId] = useState(scenarios[0].id);
  const [completedScenarioIds, setCompletedScenarioIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
      setCompletedScenarioIds(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
    } catch {
      setCompletedScenarioIds([]);
    }
  }, [open]);

  const activeScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === activeScenarioId) ?? scenarios[0],
    [activeScenarioId],
  );
  const completedCount = completedScenarioIds.filter((id) => scenarios.some((scenario) => scenario.id === id)).length;
  const isActiveScenarioComplete = completedScenarioIds.includes(activeScenario.id);

  const markScenarioComplete = () => {
    const next = Array.from(new Set([...completedScenarioIds, activeScenario.id]));
    setCompletedScenarioIds(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (next.length === scenarios.length) {
      onTrainingComplete?.();
      toast({ title: "Access deployment training complete", description: "You can return here whenever an unusual case needs a refresher." });
    }
  };

  const copyEscalationTemplate = async () => {
    try {
      await navigator.clipboard.writeText(escalationTemplate);
      toast({ title: "Follow-up template copied", description: "Paste it into the operations follow-up with the unresolved system context." });
    } catch {
      toast({ title: "Could not copy template", description: "Select the template manually and add it to the operations follow-up.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5" />Access deployment training</DialogTitle>
          <DialogDescription>Safe practice only — these scenarios never create or change live users, contacts, customers, or portal access.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="practice" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="practice">Guided practice</TabsTrigger>
            <TabsTrigger value="exceptions">Exception help</TabsTrigger>
            <TabsTrigger value="quick-guide">Quick guide</TabsTrigger>
          </TabsList>

          <TabsContent value="practice" className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <span>{completedCount} of {scenarios.length} scenarios practised</span>
              <Badge variant={completedCount === scenarios.length ? "default" : "secondary"}>{completedCount === scenarios.length ? "Complete" : "In progress"}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="space-y-1" role="navigation" aria-label="Training scenarios">
                {scenarios.map((scenario) => {
                  const complete = completedScenarioIds.includes(scenario.id);
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => setActiveScenarioId(scenario.id)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${activeScenario.id === scenario.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >
                      <span>{scenario.title}</span>
                      {complete ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-label="Practised" /> : null}
                    </button>
                  );
                })}
              </div>
              <section className="space-y-4 rounded-lg border p-4" aria-labelledby="active-training-scenario">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sandbox scenario</p>
                  <h3 id="active-training-scenario" className="mt-1 text-lg font-semibold">{activeScenario.title}</h3>
                </div>
                <div><p className="text-sm font-medium">Situation</p><p className="mt-1 text-sm text-muted-foreground">{activeScenario.situation}</p></div>
                <div className="rounded-md border border-primary/25 bg-primary/5 p-3"><p className="text-sm font-medium">The assistant should ask</p><p className="mt-1 text-sm">“{activeScenario.prompt}”</p></div>
                <div><p className="text-sm font-medium">Correct response</p><p className="mt-1 text-sm text-muted-foreground">{activeScenario.resolution}</p></div>
                <div><p className="text-sm font-medium">Expected outcome</p><p className="mt-1 text-sm text-muted-foreground">{activeScenario.outcome}</p></div>
                <Button type="button" variant={isActiveScenarioComplete ? "outline" : "default"} onClick={markScenarioComplete} disabled={isActiveScenarioComplete}>
                  {isActiveScenarioComplete ? "Scenario practised" : "Mark scenario practised"}
                </Button>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="exceptions" className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex gap-2"><ShieldAlert className="h-5 w-5 shrink-0 text-amber-700" /><div><h3 className="font-semibold">Escalate when the relationship is not safe to infer</h3><p className="mt-1 text-sm text-muted-foreground">Do not create a duplicate or move an existing login just to finish a deployment.</p></div></div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Several customer accounts may belong to the person, and no account can be confirmed.</li>
              <li>An existing login has an uncertain relationship to the selected contact or company.</li>
              <li>The account number conflicts with another customer record.</li>
              <li>The request requires statement access but the contact does not have an eligible billing tag.</li>
              <li>A deployment attempt fails after the system reports a missing or incompatible relationship.</li>
            </ul>
            <Button type="button" variant="outline" onClick={copyEscalationTemplate}><ClipboardCopy className="mr-2 h-4 w-4" />Copy operations follow-up template</Button>
          </TabsContent>

          <TabsContent value="quick-guide" className="space-y-4 text-sm">
            <div className="rounded-lg border p-4"><p className="font-medium">1. Start with a system search</p><p className="mt-1 text-muted-foreground">Search by person, email, or ERP account number before creating anything.</p></div>
            <div className="rounded-lg border p-4"><p className="font-medium">2. Read the known data</p><p className="mt-1 text-muted-foreground">Prefilled values may be edited, but existing CRM values should not be overwritten just to match a profile.</p></div>
            <div className="rounded-lg border p-4"><p className="font-medium">3. Resolve one business decision at a time</p><p className="mt-1 text-muted-foreground">Choose the correct account, decide what to do with an existing login, and select only the portal features needed.</p></div>
            <div className="rounded-lg border p-4"><p className="font-medium">4. Escalate genuine uncertainty</p><p className="mt-1 text-muted-foreground">A correct follow-up is better than a duplicate customer, accidental login reassignment, or inappropriate statement access.</p></div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground"><Lightbulb className="h-4 w-4" />Training reappears for first use and exceptions.</div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close training</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
