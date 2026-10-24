import { useEffect, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Archive, CalendarCheck, Download, ExternalLink, Flag, Folder, Forward, Image as ImageIcon, Inbox, Mail, MailOpen, Paperclip,
  ChevronDown, ChevronRight, MoreHorizontal, PanelRightClose, PanelRightOpen, Plus, RefreshCw, Reply, ReplyAll, Search, Send, Settings2, Star, Trash2, Users, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { emailBridge, getEmailBridgeUrl, type EmailAccount, type EmailFolder, type EmailMessage } from "@/lib/emailBridge";
import {
  useCrmContactByEmail, useEmailFolders, useEmailFolderSets, useEmailMessage, useEmailMessages, useEmailStatus, useInvalidateEmail, useMoveEmail, useSetEmailFlags,
} from "@/features/admin/email/useEmail";
import { useEmailToTask } from "@/features/admin/email/useEmailToTask";
import { EmailBody } from "@/features/admin/email/EmailBody";
import { SpreadsheetPreview } from "@/components/files/SpreadsheetPreview";
import PdfViewer from "@/components/pdf/PdfViewer";
import { attachmentPreviewKind } from "@/features/admin/email/attachmentPreview";
import { ImagePreviewDialog } from "@/components/account/ImagePreviewDialog";
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

type AttachmentPreview = { attachment: EmailMessage["attachments"][number]; kind?: "image" | "pdf" | "csv" | "text" | "xlsx"; url?: string; text?: string; file?: Blob; loading?: boolean; error?: string };

type Favorite = { account: string; folderId: number };
const FAVORITES_KEY = "optilens.email.favoriteFolders";
const FOLDER_DRAG_TYPE = "application/x-optilens-email-folder";

const loadFavorites = (): Favorite[] => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((item) => typeof item?.account === "string" && typeof item?.folderId === "number") : [];
  } catch {
    return [];
  }
};

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
  // Each mailbox opens and closes on its own; the active one opens when it becomes active.
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(() => new Set());
  const toggleAccount = (code: string) => setExpandedAccounts((current) => {
    const next = new Set(current);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });
  const [favorites, setFavorites] = useState<Favorite[]>(loadFavorites);
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

  const [openedAccount, setOpenedAccount] = useState<string | null>(null);
  if (accountCode && accountCode !== openedAccount) {
    setOpenedAccount(accountCode);
    setExpandedAccounts((current) => new Set(current).add(accountCode));
  }

  const isFavorite = (code: string, id: number) => favorites.some((item) => item.account === code && item.folderId === id);
  const updateFavorites = (next: Favorite[]) => {
    setFavorites(next);
    try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch { /* storage blocked: favorites last for this visit */ }
  };
  const addFavorite = (code: string, id: number) => { if (!isFavorite(code, id)) updateFavorites([...favorites, { account: code, folderId: id }]); };
  const toggleFavorite = (code: string, id: number) => updateFavorites(isFavorite(code, id)
    ? favorites.filter((item) => !(item.account === code && item.folderId === id))
    : [...favorites, { account: code, folderId: id }]);
  const favoriteAccounts = [...new Set(favorites.map((item) => item.account))].filter((code) => accounts.some((row) => row.code === code));
  const favoriteFolders = useEmailFolderSets(favoriteAccounts);
  const favoriteItems = favorites.flatMap((item) => {
    const owner = accounts.find((row) => row.code === item.account);
    const folder = favoriteFolders[favoriteAccounts.indexOf(item.account)]?.data?.find((row) => row.folder_id === item.folderId);
    return owner && folder ? [{ account: owner, folder }] : [];
  });

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

  const saveFile = (file: Blob, filename: string) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const openAttachment = async (attachment: EmailMessage["attachments"][number]) => {
    try {
      saveFile(await emailBridge.downloadAttachment(attachment), attachment.filename);
    } catch (error) {
      toast({ title: "Couldn't open the attachment", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  // Double-click: show the file in its own browser tab when the browser can display it, otherwise download it
  // so the computer opens it in the default program.
  const openOutside = async (attachment: EmailMessage["attachments"][number]) => {
    const detected = attachmentPreviewKind(attachment.filename, attachment.content_type);
    const viewType = !detected || detected.kind === "xlsx" ? null : "type" in detected ? detected.type : "text/plain;charset=utf-8";
    // The tab opens now, inside the double-click, so the popup blocker allows it; the file fills it once downloaded.
    const tab = viewType ? window.open("", "_blank") : null;
    try {
      const file = await emailBridge.downloadAttachment(attachment);
      if (tab && viewType) {
        const url = URL.createObjectURL(new Blob([file], { type: viewType }));
        tab.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        saveFile(file, attachment.filename);
      }
    } catch (error) {
      tab?.close();
      toast({ title: "Couldn't open the attachment", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  const previewAttachment = async (attachment: EmailMessage["attachments"][number]) => {
    const requestId = ++previewRequest.current;
    setPreview({ attachment, loading: true });
    try {
      const file = await emailBridge.downloadAttachment(attachment);
      if (requestId !== previewRequest.current) return;
      const detected = attachmentPreviewKind(attachment.filename, attachment.content_type || file.type);
      if (detected && (detected.kind === "image" || detected.kind === "pdf")) {
        const typed = new Blob([file], { type: detected.type });
        setPreview({ attachment, kind: detected.kind, url: URL.createObjectURL(typed), file: detected.kind === "pdf" ? typed : undefined });
      } else if (detected && (detected.kind === "csv" || detected.kind === "xlsx")) {
        // The viewer reports files over its size limit itself.
        setPreview({ attachment, kind: detected.kind, file });
      } else if (detected && file.size <= 1024 * 1024) {
        const text = await file.text();
        if (requestId === previewRequest.current) setPreview({ attachment, kind: detected.kind, text });
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
          <FavoritesBin items={favoriteItems} activeAccount={accountCode} activeFolderId={folderId}
            onOpen={(code, id) => selectFolder(code, id)} onRemove={(code, id) => toggleFavorite(code, id)} onAdd={addFavorite} />
          {orderedAccounts.map((row) => (
            <MailboxGroup key={row.code} account={row} activeFolderId={row.code === accountCode ? folderId : null}
              onOpen={() => { if (row.code === accountCode) toggleAccount(row.code); else selectAccount(row.code); }}
              expanded={expandedAccounts.has(row.code)} onToggle={() => toggleAccount(row.code)}
              isFavorite={(id) => isFavorite(row.code, id)} onToggleFavorite={(id) => toggleFavorite(row.code, id)}
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
                      <button key={attachment.attachment_id} type="button" onClick={() => previewAttachment(attachment)} onDoubleClick={() => openOutside(attachment)}
                        title="Click to preview, double-click to open outside the email client"
                        className={cn("inline-flex items-center gap-2 rounded-md border border-[hsl(var(--admin-border))] px-2.5 py-1.5 text-left text-xs hover:border-[hsl(var(--admin-accent))]",
                          preview?.attachment.attachment_id === attachment.attachment_id && "border-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent))]/10")}>
                        <Paperclip className="h-3.5 w-3.5" />
                        <span><span className="font-medium">{attachment.filename}</span><br /><span className="text-[hsl(var(--admin-muted-fg))]">{formatBytes(attachment.size_bytes)}</span></span>
                      </button>
                    ))}
                  </div>
                )}
                {preview ? (
                  <div className="flex min-h-[420px] flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={closePreview}>← Back to email</Button>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{preview.attachment.filename}</span>
                      <Button variant="outline" size="sm" onClick={() => openOutside(preview.attachment)}><ExternalLink className="mr-1.5 h-4 w-4" /> Open</Button>
                      <Button size="sm" onClick={() => openAttachment(preview.attachment)}><Download className="mr-1.5 h-4 w-4" /> Download</Button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[hsl(var(--admin-border))] bg-white text-slate-900">
                      {preview.loading && <p className="p-4 text-sm">Loading preview…</p>}
                      {preview.error && <p className="p-4 text-sm">{preview.error}</p>}
                      {(preview.kind === "csv" || preview.kind === "xlsx") && preview.file && <SpreadsheetPreview file={preview.file} format={preview.kind} />}
                      {preview.kind === "text" && preview.text !== undefined && <pre className="p-4 text-xs whitespace-pre-wrap break-words">{preview.text}</pre>}
                      {preview.kind === "image" && preview.url && <img src={preview.url} alt={preview.attachment.filename} className="block h-full w-full object-contain p-2" />}
                      {preview.kind === "pdf" && preview.url && <PdfViewer url={preview.url} file={preview.file} title={`Preview ${preview.attachment.filename}`} downloadName={preview.attachment.filename} className="h-full border-0" />}
                    </div>
                  </div>
                ) : (
                  <>
                    {hasRemoteImages(current.body_html) && !showImages && (
                      <div className="flex items-center gap-2 rounded-md bg-[hsl(var(--admin-accent))]/10 px-3 py-2 text-xs">
                        <ImageIcon className="h-4 w-4" /> Pictures in this email are blocked to protect your privacy.
                        <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => setImagesShownFor(messageId)}>Show pictures</Button>
                      </div>
                    )}
                    <EmailBody html={current.body_html} text={current.body_text} showImages={showImages} />
                  </>
                )}
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

function RibbonButton({ icon: Icon, label, onClick, disabled }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick} disabled={disabled} className="gap-1.5">
      <Icon className="h-4 w-4" /> <span className="hidden lg:inline">{label}</span>
    </Button>
  );
}

function FavoritesBin({ items, activeAccount, activeFolderId, onOpen, onRemove, onAdd }: {
  items: { account: EmailAccount; folder: EmailFolder }[];
  activeAccount: string | null;
  activeFolderId: number | null;
  onOpen: (account: string, id: number) => void;
  onRemove: (account: string, id: number) => void;
  onAdd: (account: string, id: number) => void;
}) {
  const [over, setOver] = useState(false);
  const accepts = (event: ReactDragEvent<HTMLDivElement>) => event.dataTransfer.types.includes(FOLDER_DRAG_TYPE);
  const drop = (event: ReactDragEvent<HTMLDivElement>) => {
    setOver(false);
    if (!accepts(event)) return;
    event.preventDefault();
    try {
      const dropped = JSON.parse(event.dataTransfer.getData(FOLDER_DRAG_TYPE));
      if (typeof dropped?.account === "string" && typeof dropped?.folderId === "number") onAdd(dropped.account, dropped.folderId);
    } catch {
      // Not one of our folders.
    }
  };
  return (
    <div className={cn("mb-2 rounded-md border border-dashed border-transparent pb-1", over && "border-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent))]/10")}
      onDragOver={(event) => { if (accepts(event)) { event.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)} onDrop={drop}>
      <div className="flex items-center gap-1 px-1 py-1.5 text-[13px] font-semibold"><Star className="h-3.5 w-3.5 shrink-0" /> Favorites</div>
      {items.length === 0 ? <p className="px-2 pb-1 text-[11px] leading-snug text-[hsl(var(--admin-muted-fg))]">Drag a folder here, or click its star, to keep it handy.</p> : null}
      {items.map(({ account, folder }) => {
        const Icon = FOLDER_ICONS[folder.special_use ?? ""] ?? Folder;
        const active = account.code === activeAccount && folder.folder_id === activeFolderId;
        return (
          <div key={`${account.code}:${folder.folder_id}`} className={cn("group flex w-full items-center rounded-md pl-2 pr-2 hover:bg-[hsl(var(--admin-accent))]/5", active && "bg-[hsl(var(--admin-accent))]/10 font-semibold")}>
            <button type="button" onClick={() => onOpen(account.code, folder.folder_id)} title={`${folder.display_name} · ${account.address}`}
              className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1.5 text-left text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{folder.display_name}<span className="font-normal text-[hsl(var(--admin-muted-fg))]"> · {account.displayName}</span></span>
              </span>
              {folder.unread_count ? <span className="text-xs font-semibold tabular-nums text-[hsl(var(--admin-accent))]">{folder.unread_count}</span> : null}
            </button>
            <button type="button" onClick={() => onRemove(account.code, folder.folder_id)} aria-label={`Remove ${folder.display_name} from favorites`}
              className="ml-1 rounded p-0.5 hover:bg-[hsl(var(--admin-accent))]/15"><Star className="h-3.5 w-3.5 fill-current" /></button>
          </div>
        );
      })}
    </div>
  );
}

function MailboxGroup({ account, expanded, activeFolderId, onOpen, onToggle, onFolder, onManage, collapsedFolders, onToggleFolder, isFavorite, onToggleFavorite }: {
  account: EmailAccount;
  expanded: boolean;
  activeFolderId: number | null;
  onOpen: () => void;
  onToggle: () => void;
  onFolder: (id: number) => void;
  onManage: () => void;
  collapsedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  isFavorite: (id: number) => boolean;
  onToggleFavorite: (id: number) => void;
}) {
  // Each mailbox loads its own folders while open, so several can be open at once.
  const folders = useEmailFolders(expanded ? account.code : null).data ?? [];
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1 rounded-md pr-1 hover:bg-[hsl(var(--admin-accent))]/5">
        <button type="button" onClick={onToggle} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${account.displayName}`}
          className="flex h-7 w-5 shrink-0 items-center justify-center rounded hover:bg-[hsl(var(--admin-accent))]/15">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-1 py-1.5 text-left text-[13px] font-semibold" title={account.address}>
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
      {expanded && !account.lastSyncAt && !account.lastError ? <p className="px-6 pb-1 text-[11px] text-[hsl(var(--admin-muted-fg))]">First sync in progress…</p> : null}
      {expanded ? folders.filter((folder) => ![...collapsedFolders].some((key) => key.startsWith(`${account.code}:`) && folder.path.startsWith(`${key.slice(account.code.length + 1)}.`))).map((folder) => {
        const hasChildren = folders.some((other) => other.path.startsWith(`${folder.path}.`));
        return <FolderButton key={folder.folder_id} folder={folder} active={folder.folder_id === activeFolderId}
          hasChildren={hasChildren} expanded={!collapsedFolders.has(`${account.code}:${folder.path}`)} onToggle={() => onToggleFolder(`${account.code}:${folder.path}`)}
          onClick={() => onFolder(folder.folder_id)} accountCode={account.code}
          favorite={isFavorite(folder.folder_id)} onToggleFavorite={() => onToggleFavorite(folder.folder_id)} />;
      }) : null}
    </div>
  );
}

function FolderButton({ folder, active, onClick, hasChildren, expanded, onToggle, accountCode, favorite, onToggleFavorite }: {
  folder: EmailFolder; active: boolean; onClick: () => void; hasChildren: boolean; expanded: boolean; onToggle: () => void;
  accountCode: string; favorite: boolean; onToggleFavorite: () => void;
}) {
  const Icon = FOLDER_ICONS[folder.special_use ?? ""] ?? Folder;
  const depth = Math.max(0, folder.path.split(".").length - 2);
  return (
    <div draggable onDragStart={(event) => {
        event.dataTransfer.setData(FOLDER_DRAG_TYPE, JSON.stringify({ account: accountCode, folderId: folder.folder_id }));
        event.dataTransfer.effectAllowed = "copy";
      }}
      className={cn("group flex w-full items-center rounded-md pr-2 hover:bg-[hsl(var(--admin-accent))]/5", active && "bg-[hsl(var(--admin-accent))]/10 font-semibold")}
      style={{ paddingLeft: `${4 + depth * 12}px` }}>
      {hasChildren ? <button type="button" onClick={onToggle} aria-label={`${expanded ? "Collapse" : "Expand"} ${folder.display_name}`}
        aria-expanded={expanded} className="flex h-7 w-5 shrink-0 items-center justify-center rounded hover:bg-[hsl(var(--admin-accent))]/15">
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button> : <span className="w-5 shrink-0" />}
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center justify-between gap-2 py-1.5 text-left text-sm">
        <span className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{folder.display_name}</span></span>
        {folder.unread_count ? <span className="text-xs font-semibold tabular-nums text-[hsl(var(--admin-accent))]">{folder.unread_count}</span> : null}
      </button>
      <button type="button" onClick={onToggleFavorite} aria-pressed={favorite} aria-label={`${favorite ? "Remove" : "Add"} ${folder.display_name} ${favorite ? "from" : "to"} favorites`}
        className={cn("ml-1 rounded p-0.5 hover:bg-[hsl(var(--admin-accent))]/15 focus-visible:opacity-100 group-hover:opacity-100", favorite ? "opacity-100" : "opacity-0")}>
        <Star className={cn("h-3.5 w-3.5", favorite && "fill-current")} />
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
