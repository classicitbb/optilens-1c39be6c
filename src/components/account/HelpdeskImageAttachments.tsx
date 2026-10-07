import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Music, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImagePreviewDialog, type PreviewImage } from "@/components/account/ImagePreviewDialog";
import { getHelpdeskAttachmentUrls, HELPDESK_ATTACHMENT_ACCEPT, isAudioAttachment, isImageAttachment, type HelpdeskAttachment, validateHelpdeskFiles } from "@/lib/helpdeskAttachments";

export const HelpdeskImageAttachments = ({ ticketId, attachments, onFilesChange, disabled, readOnly }: {
  ticketId: string;
  attachments: HelpdeskAttachment[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<{ file: File; url: string }[]>([]);
  const [stored, setStored] = useState<HelpdeskAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewImage | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(0);

  // Bring newly added files into view: in a scrolling dialog they would otherwise land off-screen.
  useEffect(() => {
    if (selected.length > previousCount.current) stripRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    previousCount.current = selected.length;
  }, [selected.length]);

  useEffect(() => { void getHelpdeskAttachmentUrls(attachments).then(setStored); }, [attachments, ticketId]);
  const choose = (files: File[]) => {
    if (disabled) return;
    const combined = [...selected.map((item) => item.file), ...files];
    const validation = validateHelpdeskFiles(combined);
    setError(validation);
    if (validation) return;
    setSelected([...selected, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    onFilesChange(combined);
  };

  // Drop and paste work anywhere in the surrounding dialog (or an element marked
  // data-attachment-scope), not just on the small drop box. Without either, the
  // component itself is the target.
  const chooseRef = useRef(choose);
  chooseRef.current = choose;
  useEffect(() => {
    if (readOnly) return;
    const scope = rootRef.current?.closest<HTMLElement>('[data-attachment-scope],[role="dialog"]') ?? rootRef.current;
    if (!scope) return;
    const hasFiles = (event: DragEvent) => Boolean(event.dataTransfer?.types.includes("Files"));
    const onDragOver = (event: DragEvent) => { if (hasFiles(event)) event.preventDefault(); };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      chooseRef.current(Array.from(event.dataTransfer?.files ?? []));
    };
    const onPaste = (event: ClipboardEvent) => {
      const pasted = Array.from(event.clipboardData?.files ?? []);
      if (!pasted.length) return;
      event.preventDefault();
      chooseRef.current(pasted);
    };
    scope.addEventListener("dragover", onDragOver);
    scope.addEventListener("drop", onDrop);
    scope.addEventListener("paste", onPaste);
    return () => {
      scope.removeEventListener("dragover", onDragOver);
      scope.removeEventListener("drop", onDrop);
      scope.removeEventListener("paste", onPaste);
    };
  }, [readOnly]);
  const imageThumb = (src: string, name: string, alt: string) => (
    <button type="button" className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title="Click to preview" aria-label={`Preview ${name}`} onClick={() => setPreview({ src, name })}>
      <img className="h-16 w-16 cursor-zoom-in rounded border object-cover" src={src} alt={alt} />
    </button>
  );
  const attachedCount = selected.length + stored.length;
  const strip = attachedCount ? <div ref={stripRef} className="space-y-1">
    {readOnly ? null : <p className="text-xs font-medium text-muted-foreground" role="status">{attachedCount === 1 ? "1 file attached" : `${attachedCount} files attached`} · click an image to preview</p>}
    <div className="flex flex-wrap gap-2">
      {stored.map((attachment) => !attachment.signedUrl ? <Loader2 key={attachment.id} className="h-4 w-4 animate-spin" />
        : isImageAttachment(attachment.mime_type) ? <div key={attachment.id}>{imageThumb(attachment.signedUrl, attachment.file_name, attachment.file_name)}</div>
        : isAudioAttachment(attachment.mime_type) ? <div key={attachment.id} className="space-y-1"><p className="max-w-56 truncate text-xs">{attachment.file_name}</p><audio controls preload="none" className="h-8 max-w-56" src={attachment.signedUrl} /></div>
        : <a key={attachment.id} href={attachment.signedUrl} target="_blank" rel="noreferrer" className="flex max-w-56 items-center gap-1.5 rounded border px-2 py-1 text-xs hover:bg-muted"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{attachment.file_name}</span></a>)}
      {selected.map(({ file, url }) => <div key={url} className="relative">{isImageAttachment(file.type) ? imageThumb(url, file.name, "New attachment preview") : <div className="flex max-w-56 items-center gap-1.5 rounded border px-2 py-1 text-xs">{isAudioAttachment(file.type) ? <Music className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}<span className="truncate">{file.name}</span></div>}<button type="button" aria-label={`Remove ${file.name}`} className="absolute -right-2 -top-2 rounded-full bg-background" onClick={() => { URL.revokeObjectURL(url); const next = selected.filter((item) => item.url !== url); setSelected(next); onFilesChange(next.map((item) => item.file)); }}><X className="h-4 w-4" /></button></div>)}
    </div>
  </div> : null;
  return <div ref={rootRef} className="space-y-2">
    {strip}
    {readOnly ? null : <><input ref={inputRef} className="sr-only" type="file" accept={HELPDESK_ATTACHMENT_ACCEPT} multiple onChange={(e) => { choose(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    <div className="flex min-h-12 items-center justify-between rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
      <span>Paste or drag files here, or add up to 5 photos, documents or audio files (10 MB each).</span>
      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}><Paperclip className="mr-1 h-4 w-4" />Attach files</Button>
    </div>
    </>}
    {error ? <p className="text-xs text-destructive">{error}</p> : null}
    <ImagePreviewDialog image={preview} onClose={() => setPreview(null)} />
  </div>;
};
