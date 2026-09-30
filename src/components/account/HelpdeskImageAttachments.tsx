import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Music, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHelpdeskAttachmentUrls, HELPDESK_ATTACHMENT_ACCEPT, isAudioAttachment, isImageAttachment, type HelpdeskAttachment, validateHelpdeskFiles } from "@/lib/helpdeskAttachments";

export const HelpdeskImageAttachments = ({ ticketId, attachments, onFilesChange, disabled, readOnly }: {
  ticketId: string;
  attachments: HelpdeskAttachment[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<{ file: File; url: string }[]>([]);
  const [stored, setStored] = useState<HelpdeskAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void getHelpdeskAttachmentUrls(attachments).then(setStored); }, [attachments, ticketId]);
  const choose = (files: File[]) => {
    if (disabled) return;
    const validation = validateHelpdeskFiles(files);
    setError(validation);
    if (validation) return;
    selected.forEach((item) => URL.revokeObjectURL(item.url));
    setSelected(files.map((file) => ({ file, url: URL.createObjectURL(file) })));
    onFilesChange(files);
  };
  return <div className="space-y-2">
    {readOnly ? null : <><input ref={inputRef} className="sr-only" type="file" accept={HELPDESK_ATTACHMENT_ACCEPT} multiple onChange={(e) => choose(Array.from(e.target.files ?? []))} />
    <div
      className="flex min-h-12 items-center justify-between rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); choose(Array.from(event.dataTransfer.files)); }}
      onPaste={(event) => {
        const pasted = Array.from(event.clipboardData.files);
        if (pasted.length) { event.preventDefault(); choose(pasted); }
      }}
    >
      <span>Paste or drag files here, or add up to 5 photos, documents or audio files (10 MB each).</span>
      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}><Paperclip className="mr-1 h-4 w-4" />Attach files</Button>
    </div>
    </>}
    {error ? <p className="text-xs text-destructive">{error}</p> : null}
    {(selected.length || stored.length) ? <div className="flex flex-wrap gap-2">
      {stored.map((attachment) => !attachment.signedUrl ? <Loader2 key={attachment.id} className="h-4 w-4 animate-spin" />
        : isImageAttachment(attachment.mime_type) ? <a key={attachment.id} href={attachment.signedUrl} target="_blank" rel="noreferrer"><img className="h-16 w-16 rounded border object-cover" src={attachment.signedUrl} alt={attachment.file_name} /></a>
        : isAudioAttachment(attachment.mime_type) ? <div key={attachment.id} className="space-y-1"><p className="max-w-56 truncate text-xs">{attachment.file_name}</p><audio controls preload="none" className="h-8 max-w-56" src={attachment.signedUrl} /></div>
        : <a key={attachment.id} href={attachment.signedUrl} target="_blank" rel="noreferrer" className="flex max-w-56 items-center gap-1.5 rounded border px-2 py-1 text-xs hover:bg-muted"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{attachment.file_name}</span></a>)}
      {selected.map(({ file, url }) => <div key={url} className="relative">{isImageAttachment(file.type) ? <img className="h-16 w-16 rounded border object-cover" src={url} alt="New attachment preview" /> : <div className="flex max-w-56 items-center gap-1.5 rounded border px-2 py-1 text-xs">{isAudioAttachment(file.type) ? <Music className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}<span className="truncate">{file.name}</span></div>}<button type="button" className="absolute -right-2 -top-2 rounded-full bg-background" onClick={() => { URL.revokeObjectURL(url); const next = selected.filter((item) => item.url !== url); setSelected(next); onFilesChange(next.map((item) => item.file)); }}><X className="h-4 w-4" /></button></div>)}
    </div> : null}
  </div>;
};
