import { useState } from "react";
import { AlertCircle, Check, Globe, Loader2, Mail, RotateCcw, Save, UserRoundSearch, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CopilotMarkdown } from "./CopilotMarkdown";
import type { CopilotAction } from "./api";

export const statusLabel = (status: string) => status.replaceAll("_", " ");
export const statusTone = (status: string) => {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "failed" || status === "partial" || status === "blocked") return "border-red-200 bg-red-50 text-red-800";
  if (status === "rejected") return "border-slate-200 bg-slate-50 text-slate-700";
  if (status === "executing" || status === "preparing") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
};

type ActionCardProps = {
  action: CopilotAction;
  busy: boolean;
  onDecide: (action: CopilotAction, decision: "approve" | "reject") => void;
  onSave: (action: CopilotAction, draft: { subject?: string; body?: string; taskContent?: string }) => void;
};

export const ActionCard = ({ action, busy, onDecide, onSave }: ActionCardProps) => {
  const [subject, setSubject] = useState(action.payload.subject ?? "");
  const [body, setBody] = useState(action.payload.body ?? "");
  const [taskContent, setTaskContent] = useState(action.payload.taskContent ?? "");
  const canAct = action.status === "pending_approval" || action.status === "failed";

  const isEmail = action.action_type === "send_portal_invite" || action.action_type === "send_docstudio_email";
  const changed = isEmail
    ? subject !== (action.payload.subject ?? "") || body !== (action.payload.body ?? "")
    : taskContent !== (action.payload.taskContent ?? "");
  const partialAccountCreated = action.result?.portalAccountCreated === true && action.result?.emailQueued === false;

  return (
    <Card className={cn("overflow-hidden rounded-sm shadow-none border", action.status === "failed" && "border-red-300")}>
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 gap-2">
            <div className={cn("mt-0.5 p-1", isEmail ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700")}>
              {isEmail ? <Mail className="h-3 w-3" /> : <UserRoundSearch className="h-3 w-3" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xs font-semibold">{action.title}</CardTitle>
              <CardDescription className="mt-0.5 text-[11px]">{action.summary}</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className={cn(statusTone(action.status), "text-[10px]")}>{statusLabel(action.status)}</Badge>
            <Badge variant="outline" className="text-[10px]">Level {action.risk_level}</Badge>
          </div>
        </div>
        {action.last_error ? (
          <div role="alert" className="border border-red-200 bg-red-50 p-2 text-xs text-red-900">
            <p className="flex items-center gap-1.5 font-medium"><AlertCircle className="h-3 w-3" /> Action needs attention</p>
            <p className="mt-0.5 text-[11px]">{action.last_error}</p>
            {partialAccountCreated ? <p className="mt-0.5 text-[11px] font-medium">The portal account remains created. Retry will only prepare a fresh secure link and queue the email.</p> : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {isEmail ? (
          <div className="space-y-2 border bg-muted/20 p-2">
            {action.action_type === "send_docstudio_email" ? (
              <div className="grid gap-0.5 text-xs sm:grid-cols-[7rem_1fr]"><span className="text-muted-foreground">Recipients</span><span>{(action.payload.recipients ?? []).join(", ")}</span></div>
            ) : (
              <>
                <div className="grid gap-0.5 text-xs sm:grid-cols-[7rem_1fr]"><span className="text-muted-foreground">Recipient</span><span>{action.payload.recipientName} &lt;{action.payload.recipientEmail}&gt;</span></div>
                <div className="grid gap-0.5 text-xs sm:grid-cols-[7rem_1fr]"><span className="text-muted-foreground">Template rule</span><span>{action.payload.templateName}</span></div>
              </>
            )}
            <div className="space-y-0.5">
              <Label htmlFor={`subject-${action.id}`} className="text-[11px]">Subject</Label>
              <Input id={`subject-${action.id}`} value={subject} onChange={(event) => setSubject(event.target.value)} className="h-6 text-xs" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor={`body-${action.id}`} className="text-[11px]">Email draft</Label>
              <Textarea id={`body-${action.id}`} value={body} onChange={(event) => setBody(event.target.value)} rows={4} className="text-xs" />
            </div>
          </div>
        ) : (
          <div className="space-y-2 border bg-muted/20 p-2">
            {action.payload.evidence?.length ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex flex-wrap gap-1">
                  {action.payload.priority ? <Badge variant="outline" className="text-[10px]">Priority: {action.payload.priority}</Badge> : null}
                  {action.payload.dueAt ? <Badge variant="outline" className="text-[10px]">Due: {new Date(action.payload.dueAt).toLocaleDateString()}</Badge> : null}
                  {action.payload.suggestedOwnerId ? <Badge variant="outline" className="text-[10px]">Owner: current admin</Badge> : null}
                </div>
                <p className="font-medium">Evidence used</p>
                <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground text-[11px]">
                  {action.payload.evidence.map((item) => <li key={item}>{item}</li>)}
                </ul>
                {action.payload.inference ? (
                  <p className="text-[11px]"><span className="font-medium">Inference:</span> {action.payload.inference}</p>
                ) : null}
                {action.payload.recommendedNextAction ? (
                  <p className="text-[11px]"><span className="font-medium">Recommended next action:</span> {action.payload.recommendedNextAction}</p>
                ) : null}
                {action.payload.outreachDraft ? (
                  <div className="border-l-2 border-cyan-500 pl-2">
                    <p className="text-[11px] font-medium">Optional outreach draft</p>
                    <div className="mt-0.5 text-[11px] text-muted-foreground"><CopilotMarkdown content={action.payload.outreachDraft} /></div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <Label htmlFor={`task-${action.id}`} className="text-[11px]">Internal follow-up task</Label>
            <Textarea id={`task-${action.id}`} value={taskContent} onChange={(event) => setTaskContent(event.target.value)} rows={3} className="text-xs" />
          </div>
        )}

        {canAct ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {changed ? (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => onSave(action, isEmail ? { subject, body } : { taskContent })} className="h-6 text-xs">
                <Save className="mr-1 h-3 w-3" /> Save edit
              </Button>
            ) : null}
            <Button size="sm" disabled={busy || changed} onClick={() => onDecide(action, "approve")} className="h-6 text-xs">
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : action.status === "failed" ? <RotateCcw className="mr-1 h-3 w-3" /> : <Check className="mr-1 h-3 w-3" />}
              {action.status === "failed" ? "Retry" : isEmail ? "Approve & send" : "Approve"}
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => onDecide(action, "reject")} className="h-6 text-xs">
              <X className="mr-1 h-3 w-3" /> Reject
            </Button>
            {changed ? <span className="text-[11px] text-amber-700">Save the edit before approval.</span> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default ActionCard;
