import { useMemo } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, GraduationCap, PlayCircle } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { TOURS, type TourDefinition } from "@/help/tours";
import { useTours } from "@/help/tours/TourProvider";
import { useTourProgress } from "@/help/tours/useTourProgress";

const TourCard = ({ tour, status }: { tour: TourDefinition; status: "new" | "seen" | "completed" }) => {
  const navigate = useNavigate();
  const tours = useTours();

  const launch = (step = 0) => {
    navigate(tour.path);
    tours?.queueTour(tour.id, step);
  };

  return (
    <Card data-training-tour={tour.id}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <CardTitle className="flex-1 text-base">{tour.title}</CardTitle>
          {status === "completed" ? (
            <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>
          ) : status === "seen" ? (
            <Badge variant="outline">Started</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{tour.summary}</p>
        {tour.startHint && <p className="text-xs text-muted-foreground">{tour.startHint}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-1 text-sm">
          {tour.steps.map((step, i) => (
            <li key={step.target}>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left hover:bg-muted"
                onClick={() => launch(i)}
                aria-label={`Start ${tour.title} at step ${i + 1}: ${step.title}`}
              >
                <span className="mr-2 tabular-nums text-muted-foreground">{i + 1}.</span>
                {step.title}
              </button>
            </li>
          ))}
        </ol>
        <Button size="sm" className="gap-1" onClick={() => launch()}>
          <PlayCircle className="h-4 w-4" /> {status === "new" ? "Start tour" : "Replay tour"}
        </Button>
      </CardContent>
    </Card>
  );
};

/** Every guided tour the user can view, grouped by app. Replays are always allowed. */
const TrainingHubPage = () => {
  const { canView } = useRolePermissions();
  const { realRole } = useAdminRole();
  const { progress } = useTourProgress();

  const groups = useMemo(() => {
    const visible = TOURS.filter((tour) => !tour.feature || realRole === "admin" || canView(tour.feature));
    const byGroup = new Map<string, TourDefinition[]>();
    visible.forEach((tour) => byGroup.set(tour.group, [...(byGroup.get(tour.group) ?? []), tour]));
    return [...byGroup.entries()];
  }, [canView, realRole]);

  const statusOf = (tourId: string) => {
    const row = progress?.find((p) => p.tour_id === tourId);
    return row?.completed_at ? "completed" : row?.seen_at ? "seen" : "new";
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <AdminPageHeader icon={GraduationCap} title="Tours & training" tooltip="Guided tours of each page. Start from any step and replay as often as you like." />
      <p className="max-w-2xl text-sm text-muted-foreground">
        Each tour opens its page and walks you through it. Pick a step to jump straight to it. You can also start a page's tour from the Help menu (?) in the top bar.
      </p>
      {groups.length === 0 && <p className="text-sm text-muted-foreground">No tours are available for your role yet.</p>}
      {groups.map(([group, tours]) => (
        <section key={group} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tours.map((tour) => <TourCard key={tour.id} tour={tour} status={statusOf(tour.id)} />)}
          </div>
        </section>
      ))}
    </div>
  );
};

export default TrainingHubPage;
