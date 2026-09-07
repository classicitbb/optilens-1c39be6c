import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHelpdeskAttachmentUrls, type HelpdeskAttachment, validateHelpdeskImages } from "@/lib/helpdeskAttachments";

export const HelpdeskImageAttachments = ({ ticketId, attachments, onFilesChange, disabled }: {
  ticketId: string;
  attachments: HelpdeskAttachment[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [stored, setStored] = useState<HelpdeskAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void getHelpdeskAttachmentUrls(attachments).then(setStored); }, [attachments, ticketId]);
  const choose = (files: File[]) => {
    if (disabled) return;
    const validation = validateHelpdeskImages(files);
    setError(validation);
    if (validation) return;
    previewUrls.forEach(URL.revokeObjectURL);
    setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
    onFilesChange(files);
  };
  return <div className="space-y-2">
    <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple onChange={(e) => choose(Array.from(e.target.files ?? []))} />
    <div
      className="flex min-h-12 items-center justify-between rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); choose(Array.from(event.dataTransfer.files)); }}
      onPaste={(event) => {
        const images = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
        if (images.length) { event.preventDefault(); choose(images); }
      }}
    >
      <span>Paste or drag images here, or add up to 5 images (10 MB each).</span>
      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}><ImagePlus className="mr-1 h-4 w-4" />Add images</Button>
    </div>
    {error ? <p className="text-xs text-destructive">{error}</p> : null}
    {(previewUrls.length || stored.length) ? <div className="flex flex-wrap gap-2">
      {stored.map((attachment) => attachment.signedUrl ? <a key={attachment.id} href={attachment.signedUrl} target="_blank" rel="noreferrer"><img className="h-16 w-16 rounded border object-cover" src={attachment.signedUrl} alt={attachment.file_name} /></a> : <Loader2 key={attachment.id} className="h-4 w-4 animate-spin" />)}
      {previewUrls.map((url) => <div key={url} className="relative"><img className="h-16 w-16 rounded border object-cover" src={url} alt="New attachment preview" /><button type="button" className="absolute -right-2 -top-2 rounded-full bg-background" onClick={() => { URL.revokeObjectURL(url); const next = previewUrls.filter((item) => item !== url); setPreviewUrls(next); onFilesChange([]); }}><X className="h-4 w-4" /></button></div>)}
    </div> : null}
  </div>;
};
