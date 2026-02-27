import { CalendarCheck } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useActivities } from "@/features/admin/crm/hooks/useActivities";

const CrmActivitiesPage = () => {
  const { data = [], isLoading } = useActivities();

  return (
    <div className="space-y-4">
      <AdminPageHeader title="CRM Activities" icon={CalendarCheck} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.map((a) => (
            <div key={a.id} className="border rounded p-2 text-xs flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{a.activity_type}</p>
                <p className="text-muted-foreground">Due: {a.due_at ? new Date(a.due_at).toLocaleString() : "—"}</p>
              </div>
              <Badge variant="outline">{a.status}</Badge>
            </div>
          ))}
          {isLoading ? <p className="text-xs text-muted-foreground">Loading activities…</p> : null}
          {!isLoading && data.length === 0 ? <p className="text-xs text-muted-foreground">No activities yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default CrmActivitiesPage;
