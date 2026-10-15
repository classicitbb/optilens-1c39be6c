import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Archive, CalendarCheck, Download, Flag, Folder, Forward, Image as ImageIcon, Inbox, Mail, MailOpen, Paperclip,
  ChevronDown, ChevronRight, MoreHorizontal, PanelRightClose, PanelRightOpen, Plus, RefreshCw, Reply, ReplyAll, Search, Send, Settings2, Trash2, Users, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { emailBridge, getEmailBridgeUrl, type EmailAccount, type EmailFolder, type EmailMessage } from "@/lib/emailBridge";
import {
  useCrmContactByEmail, useEmailFolders, useEmailMessage, useEmailMessages, useEmailStatus, useInvalidateEmail, useMoveEmail, useSetEmailFlags,
} from "@/features/admin/email/useEmail";
import { useEmailToTask } from "@/features/admin/email/useEmailToTask";
import { EmailBody } from "@/features/admin/email/EmailBody";
import { parseCsvPreview } from "@/features/admin/email/csvPreview";
import { ComposeDialog } from "@/features/admin/email/ComposeDialog";
import { CrmContactPanel } from "@/features/admin/email/CrmContactPanel";
import { EmailAppRail } from "@/features/admin/email/EmailAppRail";
import { ConnectMailboxDialog, ManageMailboxDialog } from "@/features/admin/email/MailboxDialogs";
import {
  EMPTY_DRAFT, formatBytes, formatEmailDate, formatFullDate, forwardHeader, hasRemoteImages, prefixSubject, quoteForReply, quoteHtmlForReply, type ComposeDraft,
} from "@/features/admin/email/format";

const FOLDER_ICONS: Record<string, LucideIcon> = {
  "\\Inbox": Inbox, "\\Sent": Send, "\\Drafts": Mail, "\\Archive": Archive, "\\Trash": Trash2, "\\Junk": Folder,
};

type AttachmentPreview = { attachment: EmailMessage["attachments"][number]; kind?: "image" | "pdf" | "csv" | "text"; url?: string; text?: string; loading?: boolean; error?: string };

const EmailPage = () => {
  const gridRef = useRef<HTMLDivElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const [ribbonWidth, setRibbonWidth] = useState(0);
  useEffect(() => {
    const element = ribbonRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setRibbonWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const compactRibbon = ribbonWidth > 0 && ribbonWidth < 1000;
  const overflowResponses = ribbonWidth > 0 && ribbonWidth < 1250;
  const [folderWidth, setFolderWidth] = useState(200);
  const [listWidth, setListWidth] = useState(340);
  const [crmWidth, setCrmWidth] = useState(260);
  const [crmOpen, setCrmOpen] = useState(true);
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [imagesShownFor, setImagesShownFor] = useState<number | null>(null);
  const [draft, setDraft] = useState<ComposeDraft | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [preview, setPreview] = useState<AttachmentPreview | null>(null);
  const previewRequest = useRef(0);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());
  const openDraft = (next: ComposeDraft) => { setDraftKey((key) => key + 1); setDraft(next); };

  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview?.url]);

  const [connectOpen, setConnectOpen] = useState(false);
  const [managing, setManaging] = useState<EmailAccount | null>(null);

  const bridgeUrl = getEmailBridgeUrl();
  const status = useEmailStatus();
  const accounts = status.data?.accounts ?? [];
  // Personal mailboxes first, then shared ones such as orders@.
  const orderedAccounts = [...accounts].sort((a, b) => Number(a.isShared) - Number(b.isShared) || a.displayName.localeCompare(b.displayName));
  const accountCode = params.get("account") ?? orderedAccounts[0]?.code ?? null;
  const account = accounts.find((row) => row.code === accountCode) ?? null;
  const folders = useEmailFolders(accountCode);
  const folderList = folders.data ?? [];

  const inboxId = folderList.find((f) => f.special_use === "\\Inbox")?.folder_id ?? folderList[0]?.folder_id ?? null;
  const folderId = params.get("folder") && params.get("account") === accountCode ? Number(params.get("folder")) : inboxId;
  const messageId = params.get("message") ? Number(params.get("message")) : null;

  const messages = useEmailMessages(folderId, search.trim());
  const message = useEmailMessage(messageId);
  const setFlags = useSetEmailFlags();
  const move = useMoveEmail();
  const invalidate = useInvalidateEmail();

  const here = () => ({ ...(accountCode ? { account: accountCode } : {}), ...(folderId ? { folder: String(folderId) } : {}) });
  const closePreview = () => { previewRequest.current += 1; setPreview(null); };
  const selectFolder = (code: string, id: number) => { closePreview(); setParams({ account: code, folder: String(id) }); };
  const selectAccount = (code: string) => { closePreview(); setParams({ account: code }); };
  const selectMessage = (id: number) => { closePreview(); setParams({ ...here(), message: String(id) }); };

  const showImages = messageId !== null && imagesShownFor === messageId;

  // Opening an unread email marks it read, the same as Outlook.
  const current = message.data;
  useEffect(() => {
    if (current && !current.is_read) setFlags.mutate({ id: current.message_id, is_read: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.message_id]);

  const ownAddress = (current?.account_address ?? account?.address ?? "").toLowerCase();
  // The CRM side of the conversation: the recipient for sent mail, otherwise the sender.
  const sentByUs = current?.special_use === "\\Sent";
  const crmAddress = (sentByUs ? current?.to[0]?.address : current?.from_address) ?? null;
  const crmName = (sentByUs ? current?.to[0]?.name : current?.from_name) ?? null;
  const crmContact = useCrmContactByEmail(crmAddress).data?.[0];
  const emailToTask = useEmailToTask();
  const sendAccount = current?.account_code ?? accountCode ?? "";

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
    setParams(here());
  });

  const reply = (all: boolean) => {
    if (!current) return;
    const cc = all
      ? [...current.to, ...current.cc].map((item) => item.address).filter((address) => address !== ownAddress && address !== current.from_address).join("; ")
      : "";
    openDraft({ ...EMPTY_DRAFT, account: sendAccount, to: current.from_address ?? "", cc, subject: prefixSubject("RE", current.subject), quoted: quoteForReply(current), quotedHtml: quoteHtmlForReply(current), replyToMessageId: current.message_id });
  };

  const createTask = async () => {
    if (!current) return;
    try {
      const taskId = await emailToTask.createTask(current, crmContact?.id);
      toast({
        title: "Task created",
        description: `Due tomorrow at 9:00${crmContact ? `, linked to ${crmContact.business_name || crmContact.name}` : ""}.`,
        action: <ToastAction altText="Open the task" onClick={() => navigate(`/admin/crm/activities?task=${taskId}`)}>Open task</ToastAction>,
      });
    } catch (error) {
      toast({ title: "Couldn't create the task", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  const forward = async () => {
    if (!current) return;
    try {
      const files = await Promise.all(current.attachments.map(emailBridge.downloadAttachment));
      openDraft({ ...EMPTY_DRAFT, account: sendAccount, subject: prefixSubject("FW", current.subject), quoted: forwardHeader(current), attachments: files });
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

  const previewAttachment = async (attachment: EmailMessage["attachments"][number]) => {
    const requestId = ++previewRequest.current;
    setPreview({ attachment, loading: true });
    try {
      const file = await emailBridge.downloadAttachment(attachment);
      if (requestId !== previewRequest.current) return;
      const mime = (file.type || attachment.content_type || "").toLowerCase();
      const name = attachment.filename.toLowerCase();
      if (["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp"].includes(mime) || mime === "application/pdf" || name.endsWith(".pdf")) {
        const type = name.endsWith(".pdf") ? "application/pdf" : mime;
        setPreview({ attachment, kind: type === "application/pdf" ? "pdf" : "image", url: URL.createObjectURL(new Blob([file], { type })) });
      } else if (!/\.html?$/.test(name) && (["text/plain", "text/csv", "application/csv", "application/json"].includes(mime) || /\.(csv|txt|log|json)$/.test(name)) && file.size <= 1024 * 1024) {
        const text = await file.text();
        if (requestId === previewRequest.current) setPreview({ attachment, kind: mime.includes("csv") || name.endsWith(".csv") ? "csv" : "text", text });
      } else {
        setPreview({ attachment, error: "Preview isn't available for this file. You can download it instead." });
      }
    } catch (error) {
      if (requestId === previewRequest.current) setPreview({ attachment, error: error instanceof Error ? error.message : String(error) });
    }
  };

  if (!bridgeUrl || status.isError) {
    return <NotConnected reason={status.error instanceof Error ? status.error.message : null} />;
  }

  const activeFolder = folderList.find((f) => f.folder_id === folderId);

  return (
    <div className="flex h-full min-h-0 gap-2">
    <EmailAppRail />
    <div ref={ribbonRef} className="flex min-w-0 flex-1 flex-col gap-2">
      {/* Keep search and Sync on the ribbon; move only actions without room into More. */}
      <div className="flex min-w-0 items-center gap-1 rounded-lg border border-[hsl(var(--admin-border))] dark:border-[#294366] bg-[hsl(var(--admin-surface,var(--admin-topbar-bg)))] p-1.5">
        <div className="flex overflow-hidden rounded-md bg-[hsl(var(--admin-accent))] text-white">
          <button type="button" onClick={() => openDraft({ ...EMPTY_DRAFT, account: sendAccount })}
            className="flex h-8 items-center gap-1.5 px-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]">
            <Mail className="h-4 w-4" /> New mail
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="New options" className="flex h-8 w-7 items-center justify-center border-l border-white/25 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]">
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onSelect={() => openDraft({ ...EMPTY_DRAFT, account: sendAccount })}><Mail className="mr-2 h-4 w-4" /> New mail</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setConnectOpen(true)}><Plus className="mr-2 h-4 w-4" /> Connect a mailbox</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!compactRibbon && <span className="mx-1 h-6 w-px bg-[hsl(var(--admin-border))]" />}
        {!compactRibbon && <div className="flex items-center gap-1">
        <RibbonButton icon={Trash2} label="Delete" disabled={!current || move.isPending} onClick={() => moveCurrent("trash")} />
        <RibbonButton icon={Archive} label="Archive" disabled={!current || move.isPending} onClick={() => moveCurrent("archive")} />
        <RibbonButton icon={Flag} label={current?.is_flagged ? "Unflag" : "Flag"} disabled={!current}
          onClick={() => current && setFlags.mutate({ id: current.message_id, is_flagged: !current.is_flagged })} />
        </div>}
        {current && !overflowResponses && <div className="flex items-center gap-1">
          <span className="mx-1 h-6 w-px bg-[hsl(var(--admin-border))]" />
          <RibbonButton icon={Reply} label="Reply" onClick={() => reply(false)} />
          <RibbonButton icon={ReplyAll} label="Reply all" onClick={() => reply(true)} />
          <RibbonButton icon={Forward} label="Forward" onClick={forward} />
        </div>}
        {!compactRibbon && <div className="flex items-center gap-1">
        <RibbonButton icon={MailOpen} label="Mark unread" disabled={!current}
          onClick={() => current && run("Marked unread", () => setFlags.mutateAsync({ id: current.message_id, is_read: false }))} />
        <RibbonButton icon={CalendarCheck} label="Create task" disabled={!current || emailToTask.isPending} onClick={createTask} />
        </div>}
        {(compactRibbon || overflowResponses) && <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" aria-label="More mail actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {compactRibbon && <>
              <DropdownMenuLabel>Move & delete</DropdownMenuLabel>
              <DropdownMenuItem disabled={!current || move.isPending} onSelect={() => moveCurrent("archive")}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
              <DropdownMenuItem disabled={!current || move.isPending} onSelect={() => moveCurrent("trash")}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
              <DropdownMenuSeparator />
            </>}
            {overflowResponses && <>
              <DropdownMenuLabel>Respond</DropdownMenuLabel>
              <DropdownMenuItem disabled={!current} onSelect={() => reply(false)}><Reply className="mr-2 h-4 w-4" /> Reply</DropdownMenuItem>
              <DropdownMenuItem disabled={!current} onSelect={() => reply(true)}><ReplyAll className="mr-2 h-4 w-4" /> Reply all</DropdownMenuItem>
              <DropdownMenuItem disabled={!current} onSelect={forward}><Forward className="mr-2 h-4 w-4" /> Forward</DropdownMenuItem>
            </>}
            {compactRibbon && <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Tags & tasks</DropdownMenuLabel>
              <DropdownMenuItem disabled={!current} onSelect={() => current && setFlags.mutate({ id: current.message_id, is_flagged: !current.is_flagged })}><Flag className="mr-2 h-4 w-4" /> {current?.is_flagged ? "Unflag" : "Flag"}</DropdownMenuItem>
              <DropdownMenuItem disabled={!current} onSelect={() => current && run("Marked unread", () => setFlags.mutateAsync({ id: current.message_id, is_read: false }))}><MailOpen className="mr-2 h-4 w-4" /> Mark unread</DropdownMenuItem>
              <DropdownMenuItem disabled={!current || emailToTask.isPending} onSelect={createTask}><CalendarCheck className="mr-2 h-4 w-4" /> Create task</DropdownMenuItem>
            </>}
          </DropdownMenuContent>
        </DropdownMenu>}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-[hsl(var(--admin-muted-fg))]" />
            <Input id="email-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${activeFolder?.display_name ?? "mail"}`} className="h-8 w-[clamp(8rem,20vw,14rem)] pl-8" />
          </div>
          <RibbonButton icon={RefreshCw} label="Sync" disabled={accounts.some((row) => row.syncing)}
            onClick={() => run("Checking for new mail", async () => { await emailBridge.syncNow(); setTimeout(invalidate, 8000); })} />
        </div>
      </div>

      <div ref={gridRef} className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-[var(--email-folder-width)_var(--email-list-width)_minmax(0,1fr)]"
        style={{ "--email-folder-width": `${folderWidth}px`, "--email-list-width": `${listWidth}px` } as CSSProperties}>
        {/* Mailboxes and their folders */}
        <div className="relative hidden min-h-0 min-w-0 md:block">
        <nav className="h-full min-h-0 overflow-y-auto" aria-label="Mailboxes">
          {orderedAccounts.map((row) => (
            <MailboxGroup key={row.code} account={row} active={row.code === accountCode} activeFolderId={folderId}
              folders={row.code === accountCode ? folderList : []} onOpen={() => selectAccount(row.code)}
              onFolder={(id) => selectFolder(row.code, id)} onManage={() => setManaging(row)}
              collapsedFolders={collapsedFolders} onToggleFolder={(path) => setCollapsedFolders((current) => {
                const next = new Set(current);
                if (next.has(path)) next.delete(path); else next.add(path);
                return next;
              })} />
          ))}
          {status.data && accounts.length === 0 ? <p className="px-2 py-2 text-xs text-[hsl(var(--admin-muted-fg))]">You haven't connected a mailbox yet.</p> : null}
          <Button size="sm" variant="ghost" className="mt-1 w-full justify-start" onClick={() => setConnectOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Connect a mailbox
          </Button>
          <p className="px-2 pt-2 text-[11px] leading-snug text-[hsl(var(--admin-muted-fg))]">
            Add every work address you use. Personal accounts (Gmail, Hotmail) stay in their own webmail.
          </p>
        </nav>
        <ResizeHandle label="Resize mailboxes" value={folderWidth} min={160} max={420}
          onChange={(width) => setFolderWidth(clamp(width, 160, Math.min(420, (gridRef.current?.clientWidth ?? 1200) - listWidth - 330)))} />
        </div>

        {/* Message list */}
        <div className={cn("relative min-h-0 min-w-0", messageId && "hidden md:block")}>
          <div className="h-full overflow-y-auto rounded-lg border border-[hsl(var(--admin-border))]">
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
                aria-current={item.message_id === messageId ? "true" : undefined}
                className={cn(
                  "block w-full border-b border-l-[3px] border-b-[hsl(var(--admin-border))] border-l-transparent px-3 py-2 text-left hover:bg-[hsl(var(--admin-accent))]/20",
                  !item.is_read && "border-l-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent))]/15",
                  item.message_id === messageId && "border-l-[hsl(var(--admin-accent))] !bg-[hsl(var(--admin-accent))]/25 ring-1 ring-inset ring-[hsl(var(--admin-accent))]/40",
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
          <ResizeHandle label="Resize message list" value={listWidth} min={260} max={640}
            onChange={(width) => setListWidth(clamp(width, 260, Math.min(640, (gridRef.current?.clientWidth ?? 1200) - folderWidth - 330)))} />
        </div>

        {/* Reading pane + CRM */}
        <div ref={readingRef} className={cn("min-h-0 rounded-lg border border-[hsl(var(--admin-border))]", !messageId && "hidden md:block")}>
          {!messageId ? (
            <div className="grid h-full place-items-center text-sm text-[hsl(var(--admin-muted-fg))]">Select an item to read</div>
          ) : message.isLoading ? (
            <p className="p-4 text-xs text-[hsl(var(--admin-muted-fg))]">Loading…</p>
          ) : message.isError || !current ? (
            <p className="p-4 text-sm">{message.error instanceof Error ? message.error.message : "This email could not be opened."}</p>
          ) : (
            <div className={cn("grid h-full min-h-0 grid-cols-1", crmOpen && "xl:grid-cols-[minmax(0,1fr)_var(--email-crm-width)]")}
              style={{ "--email-crm-width": `${crmWidth}px` } as CSSProperties}>
              <article className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto border border-[hsl(var(--admin-border))] p-4 dark:border-[#294366]">
                <Button variant="ghost" size="sm" className="self-start md:hidden" onClick={() => setParams(here())}>← Back</Button>
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-lg font-semibold [text-wrap:balance]">{current.subject || "(no subject)"}</h1>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={crmOpen ? "Hide CRM panel" : "Show CRM panel"}
                    aria-expanded={crmOpen} onClick={() => setCrmOpen((open) => !open)}>
                    {crmOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="text-xs leading-relaxed">
                  <div><span className="font-semibold">{current.from_name || current.from_address}</span> {current.from_name ? <span className="text-[hsl(var(--admin-muted-fg))]">&lt;{current.from_address}&gt;</span> : null}</div>
                  <div className="text-[hsl(var(--admin-muted-fg))]">To: {current.to.map((t) => t.address).join(", ")}{current.cc.length ? ` · Cc: ${current.cc.map((t) => t.address).join(", ")}` : ""}</div>
                  <div className="text-[hsl(var(--admin-muted-fg))]">{formatFullDate(current.sent_at)} · {current.folder_name}</div>
                </div>
                {current.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {current.attachments.map((attachment) => (
                      <button key={attachment.attachment_id} type="button" onClick={() => previewAttachment(attachment)}
                        className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--admin-border))] px-2.5 py-1.5 text-left text-xs hover:border-[hsl(var(--admin-accent))]">
                        <Paperclip className="h-3.5 w-3.5" />
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
              {crmOpen && <aside className="relative min-h-0 border-t border-[hsl(var(--admin-border))] xl:border-l xl:border-t-0">
                <div className="hidden xl:block">
                  <ResizeHandle label="Resize CRM panel" value={crmWidth} min={200} max={500} side="left"
                    onChange={(width) => setCrmWidth(clamp(width, 200, Math.min(500, (readingRef.current?.clientWidth ?? 800) - 320)))} />
                </div>
                <div className="h-full overflow-y-auto p-4">
                  <CrmContactPanel address={crmAddress} name={crmName} onCreateTask={createTask} creatingTask={emailToTask.isPending} />
                </div>
              </aside>}
            </div>
          )}
        </div>
      </div>

      <ComposeDialog key={draftKey} draft={draft} accounts={orderedAccounts} onClose={() => setDraft(null)} onManageSignatures={setManaging} />
      <ConnectMailboxDialog key={connectOpen ? "open" : "closed"} open={connectOpen} onClose={() => setConnectOpen(false)}
        defaultAddress={accounts.some((row) => row.address === status.data?.user.email) ? "" : status.data?.user.email ?? ""}
        isAdmin={Boolean(status.data?.user.isAdmin)} />
      <ManageMailboxDialog key={managing?.code ?? "none"} account={managing ? accounts.find((row) => row.code === managing.code) ?? managing : null}
        onClose={() => setManaging(null)} />
      <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="flex h-[85vh] w-[92vw] max-w-5xl flex-col gap-3 overflow-hidden bg-[hsl(var(--admin-card))] text-[hsl(var(--admin-content-fg))]">
          <DialogHeader><DialogTitle className="truncate pr-8">{preview?.attachment.filename}</DialogTitle></DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[hsl(var(--admin-border))] bg-white text-slate-900">
            {preview?.loading && <p className="p-4 text-sm">Loading preview…</p>}
            {preview?.error && <p className="p-4 text-sm">{preview.error}</p>}
            {preview?.kind === "csv" && preview.text !== undefined && <CsvPreview text={preview.text} />}
            {preview?.kind === "text" && preview.text !== undefined && <pre className="p-4 text-xs whitespace-pre-wrap break-words">{preview.text}</pre>}
            {preview?.kind === "image" && preview.url && <img src={preview.url} alt={preview.attachment.filename} className="mx-auto max-h-full max-w-full object-contain" />}
            {preview?.kind === "pdf" && preview.url && <iframe title={`Preview ${preview.attachment.filename}`} src={preview.url} sandbox="" className="h-full w-full" />}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closePreview}>Close</Button>
            {preview && <Button onClick={() => openAttachment(preview.attachment)}><Download className="mr-1.5 h-4 w-4" /> Download</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
};

function ResizeHandle({ label, value, min, max, onChange, side = "right" }: {
  label: string; value: number; min: number; max: number; onChange: (value: number) => void; side?: "left" | "right";
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const direction = side === "right" ? 1 : -1;
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, width: value };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    onChange(drag.current.width + (event.clientX - drag.current.x) * direction);
  };
  const keyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    onChange(value + (event.key === "ArrowRight" ? 16 : -16) * direction);
  };
  return <div role="separator" tabIndex={0} aria-label={`${label}; use arrow keys`} aria-orientation="vertical"
    aria-valuenow={value} aria-valuemin={min} aria-valuemax={max}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }}
    onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={keyDown}
    className={cn("absolute inset-y-0 z-10 w-0.5 cursor-col-resize touch-none select-none before:absolute before:-left-[3px] before:inset-y-0 before:w-2 before:content-[''] hover:bg-[hsl(var(--admin-accent))]/40 focus-visible:bg-[hsl(var(--admin-accent))]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--admin-accent))]", side === "right" ? "right-0" : "left-0")} />;
}

function CsvPreview({ text }: { text: string }) {
  const rows = parseCsvPreview(text);
  return <div className="min-w-max text-xs">
    <table className="border-collapse">
      <tbody>{rows.map((cells, rowIndex) => <tr key={rowIndex}>
        <th scope="row" className="sticky left-0 border border-slate-200 bg-slate-100 px-2 py-1 text-right font-normal text-slate-500">{rowIndex + 1}</th>
        {cells.slice(0, 40).map((value, columnIndex) => <td key={columnIndex} className="max-w-64 whitespace-nowrap border border-slate-200 px-2 py-1">{value}</td>)}
      </tr>)}</tbody>
    </table>
    {rows.length === 200 && <p className="p-2 text-slate-600">Showing the first 200 rows. Download for the full file.</p>}
  </div>;
}

function RibbonButton({ icon: Icon, label, onClick, disabled }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick} disabled={disabled} className="gap-1.5">
      <Icon className="h-4 w-4" /> <span className="hidden lg:inline">{label}</span>
    </Button>
  );
}

function MailboxGroup({ account, active, activeFolderId, folders, onOpen, onFolder, onManage, collapsedFolders, onToggleFolder }: {
  account: EmailAccount;
  active: boolean;
  activeFolderId: number | null;
  folders: EmailFolder[];
  onOpen: () => void;
  onFolder: (id: number) => void;
  onManage: () => void;
  collapsedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1 rounded-md pr-1 hover:bg-[hsl(var(--admin-accent))]/5">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-1 px-1 py-1.5 text-left text-[13px] font-semibold" title={account.address}>
          {active ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{account.displayName}</span>
          {account.isShared ? <Users className="h-3 w-3 shrink-0 text-[hsl(var(--admin-muted-fg))]" aria-label="Shared mailbox" /> : null}
        </button>
        {account.canManage ? (
          <button type="button" onClick={onManage} aria-label={`Manage ${account.address}`} className="rounded p-1 opacity-60 hover:opacity-100">
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {account.lastError ? <p className="px-6 pb-1 text-[11px] text-destructive">Can't sync: {account.lastError}</p> : null}
      {active && !account.lastSyncAt && !account.lastError ? <p className="px-6 pb-1 text-[11px] text-[hsl(var(--admin-muted-fg))]">First sync in progress…</p> : null}
      {active ? folders.filter((folder) => ![...collapsedFolders].some((key) => key.startsWith(`${account.code}:`) && folder.path.startsWith(`${key.slice(account.code.length + 1)}.`))).map((folder) => {
        const hasChildren = folders.some((other) => other.path.startsWith(`${folder.path}.`));
        return <FolderButton key={folder.folder_id} folder={folder} active={folder.folder_id === activeFolderId}
          hasChildren={hasChildren} expanded={!collapsedFolders.has(`${account.code}:${folder.path}`)} onToggle={() => onToggleFolder(`${account.code}:${folder.path}`)}
          onClick={() => onFolder(folder.folder_id)} />;
      }) : null}
    </div>
  );
}

function FolderButton({ folder, active, onClick, hasChildren, expanded, onToggle }: {
  folder: EmailFolder; active: boolean; onClick: () => void; hasChildren: boolean; expanded: boolean; onToggle: () => void;
}) {
  const Icon = FOLDER_ICONS[folder.special_use ?? ""] ?? Folder;
  const depth = Math.max(0, folder.path.split(".").length - 2);
  return (
    <div className={cn("flex w-full items-center rounded-md pr-2 hover:bg-[hsl(var(--admin-accent))]/5", active && "bg-[hsl(var(--admin-accent))]/10 font-semibold")}
      style={{ paddingLeft: `${4 + depth * 12}px` }}>
      {hasChildren ? <button type="button" onClick={onToggle} aria-label={`${expanded ? "Collapse" : "Expand"} ${folder.display_name}`}
        aria-expanded={expanded} className="flex h-7 w-5 shrink-0 items-center justify-center rounded hover:bg-[hsl(var(--admin-accent))]/15">
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button> : <span className="w-5 shrink-0" />}
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1.5 text-left text-sm">
        <span className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{folder.display_name}</span></span>
        {folder.unread_count ? <span className="text-xs font-semibold tabular-nums text-[hsl(var(--admin-accent))]">{folder.unread_count}</span> : null}
      </button>
    </div>
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
        <Input id="email-bridge-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Leave blank to use the cloud relay automatically" />
      </label>
      <Button size="sm" onClick={save}>Save and retry</Button>
    </div>
  );
}

export default EmailPage;
