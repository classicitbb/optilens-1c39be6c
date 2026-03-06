import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";

export default function MoonshotBusinessPlanPage() {
  const { businessPlan, updateBusinessPlan } = useMoonshotStore();

  return (
    <Card>
      <CardHeader><CardTitle>Business Plan</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={businessPlan.vision} onChange={(e) => updateBusinessPlan({ vision: e.target.value })} />
        <Textarea value={businessPlan.strategy} onChange={(e) => updateBusinessPlan({ strategy: e.target.value })} />
        <Textarea value={businessPlan.quarterlyFocus} onChange={(e) => updateBusinessPlan({ quarterlyFocus: e.target.value })} />
        <Button variant="secondary">Saved automatically</Button>
      </CardContent>
    </Card>
  );
}
