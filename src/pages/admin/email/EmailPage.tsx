import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Archive, Download, Flag, Folder, Forward, Image as ImageIcon, Inbox, Mail, MailOpen, Paperclip,
  RefreshCw, Reply, ReplyAll, Search, Send, Trash2, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { emailBridge, getEmailBridgeUrl, type EmailFolder, type EmailMessage } from "@/lib/emailBridge";
import {
  useEmailFolders, useEmailMessage, useEmailMessages, useEmailStatus, useInvalidateEmail, useMoveEmail, useSetEmailFlags,
} from "@/features/admin/email/useEmail";
import { EmailBody } from "@/features/admin/email/EmailBody";
import { ComposeDialog } from "@/features/admin/email/ComposeDialog";
import { CrmContactPanel } from "@/features/admin/email/CrmContactPanel";
import {
  EMPTY_DRAFT, formatBytes, formatEmailDate, formatFullDate, forwardHeader, hasRemoteImages, prefixSubject, quoteForReply, type ComposeDraft,
} from "@/features/admin/email/format";

const FOLDER_ICONS: Record<string, LucideIcon> = {
  "\\Inbox": Inbox, "\\Sent": Send, "\\Drafts": Mail, "\\Archive": Archive, "\\Trash": Trash2, "\\Junk": Folder,
};

const EmailPage = () => {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [imagesShownFor, setImagesShownFor] = useState<number | null>(null);
  const [draft, setDraft] = useState<ComposeDraft | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const openDraft = (next: ComposeDraft) => { setDraftKey((key) => key + 1); setDraft(next); };

  const bridgeUrl = getEmailBridgeUrl();
  const status = useEmailStatus();
  const connected = Boolean(status.data?.configured);
  const folders = useEmailFolders(connected);
  const folderList = folders.data ?? [];

  const inboxId = folderList.find((f) => f.special_use === "\\Inbox")?.folder_id ?? folderList[0]?.folder_id ?? null;
  const folderId = params.get("folder") ? Number(params.get("folder")) : inboxId;
  const messageId = params.get("message") ? Number(params.get("message")) : null;

  const messages = useEmailMessages(folderId, search.trim());
  const message = useEmailMessage(messageId);
  const setFlags = useSetEmailFlags();
  const move = useMoveEmail();
  const invalidate = useInvalidateEmail();

  const selectFolder = (id: number) => setParams({ folder: String(id) });
  const selectMessage = (id: number) => setParams({ ...(folderId ? { folder: String(folderId) } : {}), message: String(id) });

  const showImages = messageId !== null && imagesShownFor === messageId;

  // Opening an unread email marks it read, the same as Outlook.
  const current = message.data;
  useEffect(() => {
    if (current && !current.is_read) setFlags.mutate({ id: current.message_id, is_read: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.message_id]);

  const ownAddress = status.data?.account?.address?.toLowerCase() ?? "";
  const canSend = Boolean(status.data?.account?.canSend);

  const run = async (label: string, action: () => Promise<unknown>) => {
    try {
      await action();
      toast({ title: label });
    } catch (error) {
      toast({ title: "That didn't work", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  const moveCurrent = (to: "archive" | "trash") => current && run(to === "archive" ? "Archived" : "Moved to Deleted Items", async () => {
    await move.mutateAsync({ id: current.message_id, to });
    setParams(folderId ? { folder: String(folderId) } : {});
  });

  const reply = (all: boolean) => {
    if (!current) return;
    const cc = all
      ? [...current.to, ...current.cc].map((item) => item.address).filter((address) => address !== ownAddress && address !== current.from_address).join("; ")
      : "";
    openDraft({ ...EMPTY_DRAFT, to: current.from_address ?? "", cc, subject: prefixSubject("RE", current.subject), text: quoteForReply(current), replyToMessageId: current.message_id });
  };

  const forward = async () => {
    if (!current) return;
    try {
      const files = await Promise.all(current.attachments.map(emailBridge.downloadAttachment));
      openDraft({ ...EMPTY_DRAFT, subject: prefixSubject("FW", current.subject), text: forwardHeader(current), attachments: files });
    } catch (error) {
      toast({ title: "Couldn't load the attachments to forward", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  const openAttachment = async (attachment: EmailMessage["attachments"][number]) => {
    try {
      const file = await emailBridge.downloadAttachment(attachment);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      toast({ title: "Couldn't open the attachment", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  if (!bridgeUrl || status.isError || (status.data && !status.data.configured)) {
    return <NotConnected reason={status.error instanceof Error ? status.error.message : status.data?.reason ?? null} />;
  }

  const activeFolder = folderList.find((f) => f.folder_id === folderId);

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[520px] flex-col gap-2">
      {/* Home ribbon */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface,var(--admin-topbar-bg)))] p-1.5">
        <Button size="sm" onClick={() => openDraft({ ...EMPTY_DRAFT })}><Mail className="mr-1 h-4 w-4" /> New mail</Button>
        <span className="mx-1 h-6 w-px bg-[hsl(var(--admin-border))]" />
        <RibbonButton icon={Reply} label="Reply" disabled={!current} onClick={() => reply(false)} />
        <RibbonButton icon={ReplyAll} label="Reply all" disabled={!current} onClick={() => reply(true)} />
        <RibbonButton icon={Forward} label="Forward" disabled={!current} onClick={forward} />
        <span className="mx-1 h-6 w-px bg-[hsl(var(--admin-border))]" />
        <RibbonButton icon={Archive} label="Archive" disabled={!current || move.isPending} onClick={() => moveCurrent("archive")} />
        <RibbonButton icon={Trash2} label="Delete" disabled={!current || move.isPending} onClick={() => moveCurrent("trash")} />
        <RibbonButton icon={Flag} label={current?.is_flagged ? "Unflag" : "Flag"} disabled={!current}
          onClick={() => current && setFlags.mutate({ id: current.message_id, is_flagged: !current.is_flagged })} />
        <RibbonButton icon={MailOpen} label="Mark unread" disabled={!current}
          onClick={() => current && run("Marked unread", () => setFlags.mutateAsync({ id: current.message_id, is_read: false }))} />
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-[hsl(var(--admin-muted-fg))]" />
            <Input id="email-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${activeFolder?.display_name ?? "mail"}`} className="h-8 w-56 pl-8" />
          </div>
          <RibbonButton icon={RefreshCw} label="Sync" disabled={status.data?.sync.running}
            onClick={() => run("Checking for new mail", async () => { await emailBridge.syncNow(); setTimeout(invalidate, 8000); })} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-[200px_minmax(260px,340px)_1fr]">
        {/* Folders */}
        <nav className="hidden min-h-0 overflow-y-auto md:block" aria-label="Mail folders">
          <div className="px-2 pb-1 text-xs font-semibold text-[hsl(var(--admin-muted-fg))]">{status.data?.account?.address}</div>
          {folderList.map((folder) => <FolderButton key={folder.folder_id} folder={folder} active={folder.folder_id === folderId} onClick={() => selectFolder(folder.folder_id)} />)}
          <p className="px-2 pt-3 text-[11px] leading-snug text-[hsl(var(--admin-muted-fg))]">
            Last checked {status.data?.sync.lastCompletedAt ? formatEmailDate(status.data.sync.lastCompletedAt) : "—"}. Personal accounts open in their own webmail.
          </p>
        </nav>

        {/* Message list */}
        <div className={cn("min-h-0 overflow-y-auto rounded-lg border border-[hsl(var(--admin-border))]", messageId && "hidden md:block")}>
          {messages.isLoading ? <p className="p-4 text-xs text-[hsl(var(--admin-muted-fg))]">Loading…</p> : null}
          {!messages.isLoading && (messages.data ?? []).length === 0 ? <p className="p-6 text-center text-xs text-[hsl(var(--admin-muted-fg))]">{search ? "No emails match your search." : "This folder is empty."}</p> : null}
          {(messages.data ?? []).map((item) => {
            const sentFolder = activeFolder?.special_use === "\\Sent";
            const who = sentFolder ? `To: ${item.to.map((t) => t.name || t.address).join(", ")}` : item.from_name || item.from_address || "(unknown sender)";
            return (
              <button
                key={item.message_id}
                type="button"
                onClick={() => selectMessage(item.message_id)}
                className={cn(
                  "block w-full border-b border-l-[3px] border-b-[hsl(var(--admin-border))] border-l-transparent px-3 py-2 text-left hover:bg-[hsl(var(--admin-accent))]/5",
                  !item.is_read && "border-l-[hsl(var(--admin-accent))]",
                  item.message_id === messageId && "bg-[hsl(var(--admin-accent))]/10",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm", !item.is_read && "font-semibold")}>{who}</span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-[hsl(var(--admin-muted-fg))]">
                    {item.has_attachments ? <Paperclip className="h-3 w-3" /> : null}
                    {item.is_flagged ? <Flag className="h-3 w-3 text-destructive" /> : null}
                    {formatEmailDate(item.sent_at)}
                  </span>
                </div>
                <div className={cn("truncate text-[13px]", !item.is_read && "font-medium")}>{item.subject || "(no subject)"}</div>
                <div className="truncate text-xs text-[hsl(var(--admin-muted-fg))]">{item.snippet}</div>
              </button>
            );
          })}
        </div>

        {/* Reading pane + CRM */}
        <div className={cn("min-h-0 rounded-lg border border-[hsl(var(--admin-border))]", !messageId && "hidden md:block")}>
          {!messageId ? (
            <div className="grid h-full place-items-center text-sm text-[hsl(var(--admin-muted-fg))]">Select an item to read</div>
          ) : message.isLoading ? (
            <p className="p-4 text-xs text-[hsl(var(--admin-muted-fg))]">Loading…</p>
          ) : message.isError || !current ? (
            <p className="p-4 text-sm">{message.error instanceof Error ? message.error.message : "This email could not be opened."}</p>
          ) : (
            <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[1fr_260px]">
              <article className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto p-4">
                <Button variant="ghost" size="sm" className="self-start md:hidden" onClick={() => setParams(folderId ? { folder: String(folderId) } : {})}>← Back</Button>
                <h1 className="text-lg font-semibold [text-wrap:balance]">{current.subject || "(no subject)"}</h1>
                <div className="text-xs leading-relaxed">
                  <div><span className="font-semibold">{current.from_name || current.from_address}</span> {current.from_name ? <span className="text-[hsl(var(--admin-muted-fg))]">&lt;{current.from_address}&gt;</span> : null}</div>
                  <div className="text-[hsl(var(--admin-muted-fg))]">To: {current.to.map((t) => t.address).join(", ")}{current.cc.length ? ` · Cc: ${current.cc.map((t) => t.address).join(", ")}` : ""}</div>
                  <div className="text-[hsl(var(--admin-muted-fg))]">{formatFullDate(current.sent_at)} · {current.folder_name}</div>
                </div>
                {current.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {current.attachments.map((attachment) => (
                      <button key={attachment.attachment_id} type="button" onClick={() => openAttachment(attachment)}
                        className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--admin-border))] px-2.5 py-1.5 text-left text-xs hover:border-[hsl(var(--admin-accent))]">
                        <Download className="h-3.5 w-3.5" />
                        <span><span className="font-medium">{attachment.filename}</span><br /><span className="text-[hsl(var(--admin-muted-fg))]">{formatBytes(attachment.size_bytes)}</span></span>
                      </button>
                    ))}
                  </div>
                )}
                {hasRemoteImages(current.body_html) && !showImages && (
                  <div className="flex items-center gap-2 rounded-md bg-[hsl(var(--admin-accent))]/10 px-3 py-2 text-xs">
                    <ImageIcon className="h-4 w-4" /> Pictures in this email are blocked to protect your privacy.
                    <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => setImagesShownFor(messageId)}>Show pictures</Button>
                  </div>
                )}
                <EmailBody html={current.body_html} text={current.body_text} showImages={showImages} />
              </article>
              <aside className="min-h-0 overflow-y-auto border-t border-[hsl(var(--admin-border))] p-4 xl:border-l xl:border-t-0">
                <CrmContactPanel
                  address={activeFolder?.special_use === "\\Sent" ? current.to[0]?.address ?? null : current.from_address}
                  name={activeFolder?.special_use === "\\Sent" ? current.to[0]?.name ?? null : current.from_name}
                />
              </aside>
            </div>
          )}
        </div>
      </div>

      <ComposeDialog key={draftKey} draft={draft} fromAddress={status.data?.account?.address ?? ""} canSend={canSend} onClose={() => setDraft(null)} />
    </div>
  );
};

function RibbonButton({ icon: Icon, label, onClick, disabled }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick} disabled={disabled} className="gap-1.5">
      <Icon className="h-4 w-4" /> <span className="hidden lg:inline">{label}</span>
    </Button>
  );
}

function FolderButton({ folder, active, onClick }: { folder: EmailFolder; active: boolean; onClick: () => void }) {
  const Icon = FOLDER_ICONS[folder.special_use ?? ""] ?? Folder;
  const depth = Math.max(0, folder.path.split(".").length - 2);
  return (
    <button type="button" onClick={onClick} style={{ paddingLeft: `${8 + depth * 12}px` }}
      className={cn("flex w-full items-center justify-between gap-2 rounded-md py-1.5 pr-2 text-left text-sm hover:bg-[hsl(var(--admin-accent))]/5", active && "bg-[hsl(var(--admin-accent))]/10 font-semibold")}>
      <span className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{folder.display_name}</span></span>
      {folder.unread_count ? <span className="text-xs font-semibold tabular-nums text-[hsl(var(--admin-accent))]">{folder.unread_count}</span> : null}
    </button>
  );
}

function NotConnected({ reason }: { reason: string | null }) {
  const [url, setUrl] = useState(() => getEmailBridgeUrl() ?? "");
  const save = () => {
    try {
      if (url.trim()) window.localStorage.setItem("optilens.emailBridgeUrl", url.trim());
      else window.localStorage.removeItem("optilens.emailBridgeUrl");
    } catch {
      // Storage blocked: the build-time address still applies.
    }
    window.location.reload();
  };
  return (
    <div className="mx-auto mt-10 max-w-lg space-y-3 rounded-lg border border-[hsl(var(--admin-border))] p-6 text-sm">
      <h1 className="flex items-center gap-2 text-base font-semibold"><Mail className="h-5 w-5" /> Email isn't connected yet</h1>
      <p className="text-[hsl(var(--admin-muted-fg))]">
        Company mail comes from the office server (the OptiLens bridge). {reason ?? "No bridge address is set for this site."}
      </p>
      <label className="grid gap-1 text-xs text-[hsl(var(--admin-muted-fg))]">
        Bridge address (for admins testing a connection)
        <Input id="email-bridge-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mail-bridge.classicvisions.net" />
      </label>
      <Button size="sm" onClick={save}>Save and retry</Button>
    </div>
  );
}

export default EmailPage;
