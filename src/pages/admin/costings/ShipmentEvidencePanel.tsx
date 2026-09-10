import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Link2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type EvidenceTarget = { key: string; label: string; value: string; category: "invoice" | "freight" | "reference" };
type DocumentRecord = { id: string; original_file_name: string; mime_type: string; storage_path: string };
type EvidenceLink = { id: string; document_id: string; target_key: string };

const colour: Record<EvidenceTarget["category"], string> = { invoice: "border-sky-400 bg-sky-400/15", freight: "border-amber-400 bg-amber-400/15", reference: "border-violet-400 bg-violet-400/15" };

/** Each mapping is explicitly approved by an operator; this component has no OCR write path. */
const ShipmentEvidencePanel = ({ shipmentId, targets, readOnly = false }: { shipmentId: string | null; targets: EvidenceTarget[]; readOnly?: boolean }) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [links, setLinks] = useState<EvidenceLink[]>([]);
  const [selected, setSelected] = useState<DocumentRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const refresh = async () => {
    if (!shipmentId) return;
    const [{ data: docs }, { data: evidence }] = await Promise.all([(supabase.from("shipment_documents") as any).select("*").eq("shipment_id", shipmentId).order("created_at"), (supabase.from("shipment_evidence_links") as any).select("*").eq("shipment_id", shipmentId)]);
    const next = (docs ?? []) as DocumentRecord[];
    setDocuments(next); setLinks((evidence ?? []) as EvidenceLink[]);
    setSelected((current) => current && next.some((d) => d.id === current.id) ? current : next[0] ?? null);
  };
  useEffect(() => { void refresh(); }, [shipmentId]);
  useEffect(() => { if (!selected) { setPreviewUrl(null); return; } let active = true; void supabase.storage.from("shipment-costing-documents").createSignedUrl(selected.storage_path, 600).then(({ data }) => { if (active) setPreviewUrl(data?.signedUrl ?? null); }); return () => { active = false; }; }, [selected]);
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
  const linked = (target: EvidenceTarget) => links.find((link) => link.target_key === target.key);
  const isImage = selected?.mime_type.startsWith("image/");
  return <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
    <div className="flex items-center justify-between border-b px-3 py-2"><div><h2 className="text-xs font-semibold">Document review</h2><p className="text-[10px] text-muted-foreground">Manual evidence links only; documents never overwrite costing values.</p></div><Badge variant="outline" className="text-[9px]">OCR-ready</Badge></div>
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(260px,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_190px] lg:grid-rows-1"><div className="min-h-0 p-2">
      {!shipmentId ? <div className="flex h-full min-h-[260px] items-center justify-center rounded border border-dashed p-4 text-center text-xs text-muted-foreground">Create the shipment to attach evidence.</div> : !selected ? <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="flex h-full min-h-[260px] flex-col items-center justify-center rounded border border-dashed p-4 text-center"><Upload className="mb-2 h-5 w-5 text-muted-foreground"/><p className="text-xs font-medium">Drop PDF, PNG, or JPEG</p><p className="mt-1 text-[10px] text-muted-foreground">Email/web sources are reserved for a later adapter.</p><Button size="sm" variant="outline" className="mt-3 h-7 text-xs" disabled={readOnly || uploading} onClick={() => inputRef.current?.click()}>Choose document</Button></div> : <div className="flex h-full min-h-[260px] flex-col gap-1"><div className="flex items-center gap-1 text-[10px] font-medium">{isImage ? <ImageIcon className="h-3 w-3"/> : <FileText className="h-3 w-3"/>}<span className="truncate">{selected.original_file_name}</span></div><div className="relative min-h-0 flex-1 overflow-auto rounded border bg-muted/20">{previewUrl && (isImage ? <img src={previewUrl} className="mx-auto block max-w-full" alt={selected.original_file_name}/> : <iframe title={selected.original_file_name} src={previewUrl} className="h-full min-h-[260px] w-full"/>)}{links.some((link) => link.document_id === selected.id) && <div className="pointer-events-none absolute left-[5%] top-[5%] h-[10%] w-[90%] border-2 border-sky-400 bg-sky-400/10"/>}</div></div>}
      <input ref={inputRef} type="file" className="hidden" accept="application/pdf,image/png,image/jpeg" multiple onChange={onSelect}/></div>
      <aside className="border-t bg-muted/20 p-2 lg:border-l lg:border-t-0"><div className="mb-2 flex items-center gap-1 text-[10px] font-semibold"><Link2 className="h-3 w-3"/> Reviewed sources</div><div className="space-y-1.5">{targets.map((target) => { const link = linked(target); return <button key={target.key} type="button" onClick={() => link ? setSelected(documents.find((doc) => doc.id === link.document_id) ?? null) : void approveLink(target)} disabled={!selected || readOnly} className={`w-full rounded border p-1.5 text-left ${colour[target.category]} disabled:opacity-60`}><div className="flex justify-between gap-1"><span className="text-[10px] font-semibold">{target.label}</span><span className="text-[9px]">{link ? "Linked" : "Link"}</span></div><div className="truncate font-mono text-[10px]">{target.value}</div></button>; })}</div><div className="mt-3 border-t pt-2">{documents.map((doc) => <button key={doc.id} type="button" onClick={() => setSelected(doc)} className={`block w-full truncate rounded px-1 py-1 text-left text-[10px] ${selected?.id === doc.id ? "bg-background font-medium" : ""}`}>{doc.original_file_name}</button>)}</div></aside>
    </div></section>;
};
export default ShipmentEvidencePanel;
