import { useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateWebsiteFeature,
  useUpdateWebsiteFeature,
  useWebsiteFeatures,
  type WebsiteFeature,
} from "@/hooks/useWebsiteFeatures";
import { useToast } from "@/hooks/use-toast";

/**
 * The operator's tuning surface: runtime feature flags plus free-text notes.
 * Notes double as the request channel the AI build agents (Claude / Codex)
 * review each session — write what a feature needs and it becomes backlog.
 */
const FeatureBoardPage = () => {
  const { toast } = useToast();
  const { data: features = [], isLoading } = useWebsiteFeatures();
  const update = useUpdateWebsiteFeature();
  const create = useCreateWebsiteFeature();
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleToggle = async (feature: WebsiteFeature, enabled: boolean) => {
    try {
      await update.mutateAsync({ key: feature.key, patch: { enabled } });
      toast({ title: `${feature.label} ${enabled ? "enabled" : "disabled"}` });
    } catch (e: any) {
      toast({ title: "Unable to update feature", description: e?.message, variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    const key = newKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    if (!key || !newLabel.trim()) {
      toast({ title: "Key and label are required", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({ key, label: newLabel.trim() });
      setNewKey("");
      setNewLabel("");
      toast({ title: "Feature added to the board" });
    } catch (e: any) {
      toast({ title: "Unable to add feature", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Feature Board" icon={SlidersHorizontal}>
        <p className="text-xs text-muted-foreground">
          Toggle live functionality and write feature notes — the notes feed the AI build agents.
        </p>
      </AdminPageHeader>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Add a feature / request</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="key (e.g. rx_order_form)" className="h-8 w-56 text-xs" />
          <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label" className="h-8 w-64 text-xs" />
          <Button size="sm" className="h-8 text-xs" onClick={handleCreate} disabled={create.isPending}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {features.map((feature) => (
          <FeatureCard key={feature.key} feature={feature} onToggle={handleToggle} />
        ))}
      </div>

      {isLoading ? <p className="text-xs text-muted-foreground">Loading feature board…</p> : null}
      {!isLoading && features.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No features yet — run the website_features migration, then this board fills in.
        </p>
      ) : null}
    </div>
  );
};

const FeatureCard = ({
  feature,
  onToggle,
}: {
  feature: WebsiteFeature;
  onToggle: (feature: WebsiteFeature, enabled: boolean) => void;
}) => {
  const { toast } = useToast();
  const update = useUpdateWebsiteFeature();
  const [notes, setNotes] = useState(feature.notes ?? "");
  const dirty = notes !== (feature.notes ?? "");

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2">
            {feature.label}
            <Badge variant={feature.enabled ? "default" : "outline"}>{feature.enabled ? "Live" : "Off"}</Badge>
          </span>
          <Switch checked={feature.enabled} onCheckedChange={(checked) => onToggle(feature, checked)} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {feature.description ? <p className="text-xs text-muted-foreground">{feature.description}</p> : null}
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notes / what this feature still needs (read by the build agents)…"
          className="text-xs"
        />
        {dirty ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            onClick={async () => {
              try {
                await update.mutateAsync({ key: feature.key, patch: { notes } });
                toast({ title: "Notes saved" });
              } catch (e: any) {
                toast({ title: "Unable to save notes", description: e?.message, variant: "destructive" });
              }
            }}
          >
            Save notes
          </Button>
        ) : null}
        <p className="text-[10px] text-muted-foreground">
          key: {feature.key} · updated {new Date(feature.updated_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
};

export default FeatureBoardPage;
