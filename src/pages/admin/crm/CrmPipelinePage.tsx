import { useMemo, useState } from "react";
import { Columns3, ExternalLink, Sparkles, Target, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ALL_STAGES,
  CRM_PIPELINES,
  NURTURE_STAGE,
  PIPELINE_STAGES,
  useClassifyContact,
  usePipelineContacts,
  useRemoveFromPipeline,
  useSetContactStage,
  useUnclassifiedContacts,
  type PipelineContact,
  type PipelineKey,
  type PipelineStageKey,
} from "@/features/admin/crm/hooks/usePipeline";
import { useCadences, useEnrollContact } from "@/features/admin/crm/hooks/useCadences";
import { useToast } from "@/hooks/use-toast";

const isOverdue = (iso: string | null) => !!iso && new Date(iso).getTime() < Date.now();

const locationLabel = (c: PipelineContact) =>
  [c.city, c.country].filter(Boolean).join(", ") || "—";

const CrmPipelinePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pipeline, setPipeline] = useState<PipelineKey>("opticals");
  const [search, setSearch] = useState("");
  const [showClassify, setShowClassify] = useState(false);

  const { data = [], isLoading } = usePipelineContacts(pipeline);
  const { data: cadences = [] } = useCadences(pipeline);
  const setStage = useSetContactStage();
  const removeFromPipeline = useRemoveFromPipeline();
  const enroll = useEnrollContact();

  const handleEnroll = async (contact: PipelineContact, cadenceId: string) => {
    try {
      await enroll.mutateAsync({ contactId: contact.id, cadenceId });
      toast({ title: `${contact.name} enrolled — outreach drafting in the Outbox` });
    } catch (e: any) {
      toast({ title: "Unable to enrol", description: e?.message, variant: "destructive" });
    }
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.business_name ?? "").toLowerCase().includes(s) ||
        (c.city ?? "").toLowerCase().includes(s),
    );
  }, [data, search]);

  const byStage = useMemo(() => {
    const map: Record<string, PipelineContact[]> = {};
    for (const stage of ALL_STAGES) map[stage.key] = [];
    for (const c of filtered) {
      if (c.stage && map[c.stage]) map[c.stage].push(c);
    }
    return map;
  }, [filtered]);

  const handleMove = async (contact: PipelineContact, stage: PipelineStageKey) => {
    if (stage === contact.stage) return;
    try {
      await setStage.mutateAsync({ id: contact.id, stage });
      const title = ALL_STAGES.find((s) => s.key === stage)?.title ?? stage;
      toast({ title: `${contact.name} → ${title}` });
    } catch {
      toast({ title: "Unable to move contact", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Pipeline" icon={Columns3}>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={pipeline} onValueChange={(v) => setPipeline(v as PipelineKey)}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CRM_PIPELINES.map((p) => (
                <SelectItem key={p.key} value={p.key} className="text-xs">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this pipeline" className="h-8 w-56 text-xs" />
          <Button variant={showClassify ? "default" : "outline"} size="sm" onClick={() => setShowClassify((v) => !v)}>
            <UserPlus className="mr-1 h-4 w-4" /> Classify Contacts
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/leads")}>
            <Target className="mr-1 h-4 w-4" /> Find Leads
          </Button>
        </div>
      </AdminPageHeader>

      {showClassify ? (
        <ClassifyPanel pipeline={pipeline} onClose={() => setShowClassify(false)} />
      ) : null}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_STAGES.map((col) => (
          <StageColumn
            key={col.key}
            title={col.title}
            hint={col.hint}
            rows={byStage[col.key] ?? []}
            cadences={cadences}
            onMove={handleMove}
            onEnroll={handleEnroll}
            onRemove={(c) => removeFromPipeline.mutate(c.id)}
            onBuildPackage={(c) => navigate("/admin/sales/proposals", { state: { contactId: c.id, country: c.country } })}
          />
        ))}
        <StageColumn
          title={NURTURE_STAGE.title}
          hint={NURTURE_STAGE.hint}
          rows={byStage[NURTURE_STAGE.key] ?? []}
          cadences={cadences}
          onMove={handleMove}
          onEnroll={handleEnroll}
          onRemove={(c) => removeFromPipeline.mutate(c.id)}
          muted
        />
      </div>

      {isLoading ? <p className="text-xs text-muted-foreground">Loading pipeline…</p> : null}
      {!isLoading && data.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No contacts in the {CRM_PIPELINES.find((p) => p.key === pipeline)?.label} pipeline yet. Use “Classify Contacts” to add some.
        </p>
      ) : null}
    </div>
  );
};

interface StageColumnProps {
  title: string;
  hint: string;
  rows: PipelineContact[];
  cadences: { id: string; name: string }[];
  onMove: (c: PipelineContact, stage: PipelineStageKey) => void;
  onEnroll: (c: PipelineContact, cadenceId: string) => void;
  onRemove: (c: PipelineContact) => void;
  onBuildPackage?: (c: PipelineContact) => void;
  muted?: boolean;
}

const StageColumn = ({ title, hint, rows, cadences, onMove, onEnroll, onRemove, onBuildPackage, muted }: StageColumnProps) => (
  <div className="w-64 flex-shrink-0">
    <Card className={muted ? "bg-muted/30" : undefined}>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center justify-between text-sm" title={hint}>
          {title}
          <Badge variant="outline">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((c) => (
          <div key={c.id} className="space-y-2 rounded border p-2 text-xs">
            <div>
              <p className="truncate font-medium">{c.business_name || c.name}</p>
              <p className="text-muted-foreground">{locationLabel(c)}</p>
            </div>
            {c.next_action_at ? (
              <Badge variant={isOverdue(c.next_action_at) ? "destructive" : "outline"} className="text-[10px]">
                Next: {new Date(c.next_action_at).toLocaleDateString()}
              </Badge>
            ) : null}
            <Select value={c.stage ?? undefined} onValueChange={(v) => onMove(c, v as PipelineStageKey)}>
              <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Move to…" /></SelectTrigger>
              <SelectContent>
                {ALL_STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key} className="text-xs">{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cadences.length ? (
              <Select value="" onValueChange={(v) => onEnroll(c, v)}>
                <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Enrol in cadence…" /></SelectTrigger>
                <SelectContent>
                  {cadences.map((cad) => (
                    <SelectItem key={cad.id} value={cad.id} className="text-xs">{cad.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <div className="flex gap-1">
              {onBuildPackage ? (
                <Button size="sm" variant="outline" className="h-6 flex-1 text-[10px]" onClick={() => onBuildPackage(c)}>
                  <ExternalLink className="mr-1 h-3 w-3" /> Package
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-muted-foreground" onClick={() => onRemove(c)} title="Remove from pipeline">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-[11px] text-muted-foreground">—</p> : null}
      </CardContent>
    </Card>
  </div>
);

interface ClassifyPanelProps {
  pipeline: PipelineKey;
  onClose: () => void;
}

const ClassifyPanel = ({ pipeline, onClose }: ClassifyPanelProps) => {
  const { toast } = useToast();
  const { data = [], isLoading } = useUnclassifiedContacts();
  const classify = useClassifyContact();
  const [stageChoice, setStageChoice] = useState<PipelineStageKey>("target");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter((c) => c.name.toLowerCase().includes(s) || (c.business_name ?? "").toLowerCase().includes(s));
  }, [data, search]);

  const add = async (c: PipelineContact) => {
    try {
      await classify.mutateAsync({ id: c.id, pipeline, stage: stageChoice });
      toast({ title: `${c.name} added to pipeline` });
    } catch {
      toast({ title: "Unable to classify contact", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-4 w-4" /> Classify business contacts into the pipeline
          </span>
          <div className="flex items-center gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search unclassified" className="h-8 w-48 text-xs" />
            <span className="text-[11px] text-muted-foreground">Add as</span>
            <Select value={stageChoice} onValueChange={(v) => setStageChoice(v as PipelineStageKey)}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key} className="text-xs">{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.business_name || c.name}</p>
                <p className="truncate text-muted-foreground">{locationLabel(c)}{c.lead_score ? ` · score ${c.lead_score}` : ""}</p>
              </div>
              <Button size="sm" className="h-7 text-[11px]" onClick={() => add(c)} disabled={classify.isPending}>
                <UserPlus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
          ))}
        </div>
        {isLoading ? <p className="text-xs text-muted-foreground">Loading contacts…</p> : null}
        {!isLoading && filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No unclassified business contacts match.</p>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default CrmPipelinePage;
