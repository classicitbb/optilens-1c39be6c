import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";

export default function MoonshotToolsPage() {
  const { resetDemoData } = useMoonshotStore();

  return (
    <Card>
      <CardHeader><CardTitle>Tools & Settings</CardTitle></CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={resetDemoData}>Reset Demo Data</Button>
      </CardContent>
    </Card>
  );
}
