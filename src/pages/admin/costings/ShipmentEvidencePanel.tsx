import { ChangeEvent, DragEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, FileText, ImageIcon, Link2, Upload, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PdfViewer from "@/components/pdf/PdfViewer";

export type EvidenceTarget = { key: string; label: string; value: string; category: "invoice" | "freight" | "reference" };
type DocumentRecord = { id: string; original_file_name: string; mime_type: string; storage_path: string };
type EvidenceLink = { id: string; document_id: string; target_key: string };

const colour: Record<EvidenceTarget["category"], string> = { invoice: "border-sky-400 bg-sky-400/15", freight: "border-amber-400 bg-amber-400/15", reference: "border-violet-400 bg-violet-400/15" };

/** Each mapping is explicitly approved by an operator; this component has no OCR write path. */
const ShipmentEvidencePanel = ({ shipmentId, targets, readOnly = false, coverSheet }: { shipmentId: string | null; targets: EvidenceTarget[]; readOnly?: boolean; coverSheet?: ReactNode }) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [links, setLinks] = useState<EvidenceLink[]>([]);
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const refresh = async () => {
    if (!shipmentId) return;
    const [{ data: docs }, { data: evidence }] = await Promise.all([(supabase.from("shipment_documents") as any).select("*").eq("shipment_id", shipmentId).order("created_at"), (supabase.from("shipment_evidence_links") as any).select("*").eq("shipment_id", shipmentId)]);
    const next = (docs ?? []) as DocumentRecord[];
    setDocuments(next); setLinks((evidence ?? []) as EvidenceLink[]);
    // The costing sheet is the useful default binder front page. Documents only
    // replace it when an operator explicitly selects one from the source list.
    setSelected((current) => current && next.some((d) => d.id === current.id) ? current : null);
  };
  useEffect(() => { void refresh(); }, [shipmentId]);
  useEffect(() => {
    if (!selected) { setPreviewUrl(null); setPreviewError(null); return; }
    let active = true;
    setPreviewUrl(null);
    setPreviewError(null);
    void supabase.storage.from("shipment-costing-documents").createSignedUrl(selected.storage_path, 600).then(({ data, error }) => {
      if (!active) return;
      if (error || !data?.signedUrl) {
        setPreviewError(error?.message ?? "A secure preview link could not be created.");
        return;
      }
      setPreviewUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [selected]);
  const addFiles = async (files: FileList | File[]) => {
    if (!shipmentId || !user || readOnly) return;
    const accepted = Array.from(files).filter((file) => ["application/pdf", "image/png", "image/jpeg"].includes(file.type) && file.size <= 25 * 1024 * 1024);
    if (!accepted.length) return;
    setUploading(true);
    try { for (const file of accepted) { const name = `${shipmentId}/${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`; const { error: storageError } = await supabase.storage.from("shipment-costing-documents").upload(name, file, { contentType: file.type, upsert: false }); if (storageError) throw storageError; const { error } = await (supabase.from("shipment_documents") as any).insert({ shipment_id: shipmentId, source_kind: "upload", original_file_name: file.name, mime_type: file.type, byte_size: file.size, storage_path: name, uploaded_by_user_id: user.id }); if (error) throw error; } await refresh(); } finally { setUploading(false); }
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); void addFiles(event.dataTransfer.files); };
  const onSelect = (event: ChangeEvent<HTMLInputElement>) => { if (event.target.files) void addFiles(event.target.files); event.target.value = ""; };
  const approveLink = async (target: EvidenceTarget) => { if (!shipmentId || !selected || !user || readOnly) return; await (supabase.from("shipment_evidence_links") as any).insert({ shipment_id: shipmentId, document_id: selected.id, target_kind: "header", target_key: target.key, page_number: 1, bounds: { x: .05, y: .05, width: .9, height: .1 }, source_text: target.value, approved_by_user_id: user.id }); await refresh(); };
  const unlink = async (link: EvidenceLink) => {
    if (readOnly) return;
    const { error } = await (supabase.from("shipment_evidence_links") as any).delete().eq("id", link.id);
    if (!error) await refresh();
  };
  const linked = (target: EvidenceTarget) => links.find((link) => link.target_key === target.key);
  const isImage = selected?.mime_type.startsWith("image/");
  return <section className={`flex flex-1 flex-col rounded-lg border border-border bg-card shadow-sm ${expanded ? "min-h-[410px]" : "min-h-0"}`}>
    <div className="flex items-center justify-between gap-2 border-b px-3 py-2"><div className="min-w-0"><h2 className="text-xs font-semibold">Document review</h2>{expanded ? <p className="text-[10px] text-muted-foreground">Manual evidence links only; documents never overwrite costing values.</p> : <p className="truncate text-[10px] text-muted-foreground">{selected ? `Selected: ${selected.original_file_name}` : "Costing sheet selected"}</p>}</div><div className="flex shrink-0 items-center gap-1"><Badge variant="outline" className="text-[9px]">PDF reader</Badge><Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded((current) => !current)} aria-label={expanded ? "Minimize document review" : "Expand document review"}>{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</Button></div></div>
    {expanded && <div className="grid min-h-0 flex-1 grid-rows-[minmax(260px,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_190px] lg:grid-rows-1"><div className="min-h-0 p-2">
      {!shipmentId ? <div className="flex h-full min-h-[260px] items-center justify-center rounded border border-dashed p-4 text-center text-xs text-muted-foreground">Create the shipment to attach evidence.</div> : !selected ? <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="relative min-h-[260px] rounded border border-dashed p-2">{coverSheet ?? <div className="flex h-full min-h-[260px] flex-col items-center justify-center p-4 text-center"><Upload className="mb-2 h-5 w-5 text-muted-foreground"/><p className="text-xs font-medium">Drop PDF, PNG, or JPEG</p></div>}<div className="absolute bottom-4 left-1/2 -translate-x-1/2"><Button size="sm" variant="outline" className="h-7 bg-background text-xs" disabled={readOnly || uploading} onClick={() => inputRef.current?.click()}><Upload className="mr-1 h-3 w-3" /> Choose document</Button></div></div> : <div className="flex min-h-[260px] flex-col gap-1"><div className="flex items-center gap-1 text-[10px] font-medium">{isImage ? <ImageIcon className="h-3 w-3"/> : <FileText className="h-3 w-3"/>}<span className="truncate">{selected.original_file_name}</span></div><div className="relative h-[min(68vh,760px)] min-h-[420px] overflow-hidden rounded border bg-muted/20">{previewError ? <div className="flex min-h-[260px] items-center justify-center p-4 text-center text-xs text-destructive">{previewError}</div> : !previewUrl ? <div className="flex min-h-[260px] items-center justify-center p-4 text-xs text-muted-foreground">Preparing secure preview…</div> : isImage ? <img src={previewUrl} className="mx-auto block h-full max-w-full object-contain" alt={selected.original_file_name} onError={() => setPreviewError("The image preview could not be displayed.")}/> : <PdfViewer url={previewUrl} title={selected.original_file_name} downloadName={selected.original_file_name} pageMode="single" className="h-full" />}{links.some((link) => link.document_id === selected.id) && <div className="pointer-events-none absolute left-[5%] top-[5%] h-[10%] w-[90%] border-2 border-sky-400 bg-sky-400/10"/>}</div></div>}
      <input ref={inputRef} type="file" className="hidden" accept="application/pdf,image/png,image/jpeg" multiple onChange={onSelect}/></div>
      <aside className="border-t bg-muted/20 p-2 lg:border-l lg:border-t-0"><div className="mb-2 flex items-center gap-1 text-[10px] font-semibold"><Link2 className="h-3 w-3"/> Reviewed sources</div><div className="space-y-1.5">{targets.map((target) => { const link = linked(target); return <div key={target.key} className={`rounded border p-1.5 ${colour[target.category]}`}><div className="flex items-center justify-between gap-1"><button type="button" onClick={() => link ? setSelected(documents.find((doc) => doc.id === link.document_id) ?? null) : void approveLink(target)} disabled={readOnly || (!link && !selected)} className="min-w-0 flex-1 text-left disabled:opacity-60"><div className="flex justify-between gap-1"><span className="text-[10px] font-semibold">{target.label}</span><span className="text-[9px]">{link ? "Linked" : "Link"}</span></div><div className="truncate font-mono text-[10px]">{target.value}</div></button>{link && !readOnly && <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => void unlink(link)} aria-label={`Unlink ${target.label}`}><Unlink className="h-3 w-3"/></Button>}</div></div>; })}</div><div className="mt-3 border-t pt-2"><button type="button" onClick={() => setSelected(null)} className={`block w-full truncate rounded px-1 py-1 text-left text-[10px] ${!selected ? "bg-background font-medium" : ""}`}>Costing sheet</button>{documents.map((doc) => <button key={doc.id} type="button" onClick={() => setSelected(doc)} className={`block w-full truncate rounded px-1 py-1 text-left text-[10px] ${selected?.id === doc.id ? "bg-background font-medium" : ""}`}>{doc.original_file_name}</button>)}</div></aside>
    </div>}</section>;
};
export default ShipmentEvidencePanel;
