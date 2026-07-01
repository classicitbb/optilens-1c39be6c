import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useContacts, useContactTags, useContactTagLinks, useIndustries, useSaveContact, useDeleteContact, useSetContactTags, type Contact } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, ChevronDown, ChevronLeft, ChevronRight, Building2, User, X, Trash2, Settings, Upload, Download, ShieldCheck, Kanban, BadgeDollarSign, Mic, MicOff, ImageIcon, ExternalLink } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSignedDataFileUrl } from "@/hooks/useSignedDataFileUrl";

const BusinessCardPreview = ({ url, fileName }: { url: string; fileName: string | null }) => {
  const signed = useSignedDataFileUrl(url);
  return (
    <>
      <img
        src={signed ?? undefined}
        alt="Business card"
        className="w-24 h-16 rounded border object-cover"
        style={{ borderColor: "hsl(215 25% 88%)" }}
      />
      <div className="space-y-1">
        {signed && (
          <a href={signed} target="_blank" rel="noreferrer" className="text-xs underline inline-flex items-center gap-1">
            View full image <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {fileName && (
          <p className="text-[11px]" style={{ color: "hsl(215 15% 50%)" }}>
            {fileName}
          </p>
        )}
      </div>
    </>
  );
};
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { COUNTRY_OPTIONS, ensureOption, getCityOptionsByCountry, getStateOptionsByCountry } from "@/lib/locationOptions";

type FilterMode = "all" | "companies" | "persons" | "customers";
type GroupByMode = "none" | "country";
type ImportPreviewStatus = "ready" | "duplicate" | "invalid";
type ImportPreviewRow = {
  rowNumber: number;
  displayName: string;
  row: Record<string, string | boolean | null>;
  linkedName: ReturnType<typeof splitLinkedContactName>;
  status: ImportPreviewStatus;
  reason?: string;
};

type SpeechRecognitionErrorCode = "aborted" | "audio-capture" | "bad-grammar" | "language-not-supported" | "network" | "no-speech" | "not-allowed" | "phrases-not-supported" | "service-not-allowed";

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: SpeechRecognitionErrorCode }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

const DICTATION_LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Español" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "it-IT", label: "Italiano" },
  { value: "pt-BR", label: "Português (Brasil)" },
];

const LEAD_SOURCES = [
  { value: "not_specified", label: "Not specified" },
  { value: "lead_form", label: "Lead Form" },
  { value: "new_business_application", label: "New Business Application" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "walk_in", label: "Walk-in" },
  { value: "phone_inquiry", label: "Phone Inquiry" },
  { value: "trade_show", label: "Trade Show" },
  { value: "other", label: "Other" },
];

const PIPELINE_STAGES = ["New", "Prospect", "Qualified", "Active Customer", "Inactive"];

const CONTACT_IMPORT_FIELDS = [
  "name",
  "is_company",
  "email",
  "phone",
  "street",
  "street2",
  "city",
  "state",
  "zip",
  "country_code",
  "tax_id",
  "website",
  "salesperson",
  "notes",
] as const;

type ContactImportField = typeof CONTACT_IMPORT_FIELDS[number];

const FIELD_ALIASES: Record<string, ContactImportField> = {
  name: "name",
  fullname: "name",
  full_name: "name",
  contact_name: "name",
  company_name: "name",
  iscompany: "is_company",
  is_company: "is_company",
  company: "is_company",
  email: "email",
  email_address: "email",
  phone: "phone",
  phone_number: "phone",
  mobile: "phone",
  street: "street",
  address: "street",
  address1: "street",
  street2: "street2",
  address2: "street2",
  city: "city",
  state: "state",
  province: "state",
  zip: "zip",
  postal: "zip",
  postal_code: "zip",
  country: "country_code",
  country_code: "country_code",
  tax_id: "tax_id",
  taxid: "tax_id",
  website: "website",
  web: "website",
  salesperson: "salesperson",
  sales_person: "salesperson",
  notes: "notes",
};

const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
};

const parseCsvText = (text: string): string[][] => {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current.trim()) rows.push(parseCsvLine(current));
      current = "";
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      continue;
    }
    current += char;
  }
  if (current.trim()) rows.push(parseCsvLine(current));
  return rows;
};

const normalizeBoolean = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y";
};

const isBooleanLike = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return ["true", "false", "1", "0", "yes", "no", "y", "n"].includes(normalized);
};

const normalizeValue = (value?: string | null) => (value ?? "").trim().toLowerCase();

const getDuplicateKey = (row: { name?: string | null; email?: string | null; phone?: string | null }) => {
  const email = normalizeValue(row.email);
  if (email) return `email:${email}`;
  const name = normalizeValue(row.name);
  const phone = normalizeValue(row.phone);
  if (name && phone) return `name_phone:${name}|${phone}`;
  if (name) return `name:${name}`;
  return "";
};

const getImportDuplicateKey = (row: { name?: string | null; email?: string | null; phone?: string | null }) => {
  const email = normalizeValue(row.email);
  if (email) return `email:${email}`;
  const name = normalizeValue(row.name);
  const phone = normalizeValue(row.phone);
  if (name && phone) return `name_phone:${name}|${phone}`;
  return "";
};

const splitLinkedContactName = (name: string) => {
  const [companyName, ...personParts] = name.split(",");
  const personName = personParts.join(",").trim();
  if (!companyName?.trim() || !personName) return null;
  return {
    companyName: companyName.trim(),
    personName,
  };
};

const emptyContact = (isCompany: boolean): Partial<Contact> => ({
  name: "",
  is_company: isCompany,
  email: "",
  phone: "",
  street: "",
  street2: "",
  city: "",
  state: "",
  zip: "",
  country_code: "",
  tax_id: "",
  website: "",
  industry_id: null,
  notes: "",
  salesperson: "",
  parent_id: null,
  is_archived: false,
  avatar_url: "",
  business_card_image_url: null,
  business_card_uploaded_at: null,
  business_card_file_name: null,
  is_customer: false,
  lead_source: "",
  pipeline_stage: "New",
});

const EMPTY_CONTACTS: Contact[] = [];
const EMPTY_STRING_LIST: string[] = [];

const ContactsPage = () => {
  const { data: contactsData, isLoading } = useContacts();
  const contacts = contactsData ?? EMPTY_CONTACTS;
  const { data: tags = [] } = useContactTags();
  const { data: industries = [] } = useIndustries();
  const saveContact = useSaveContact();
  const deleteContact = useDeleteContact();
  const setContactTags = useSetContactTags();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<FilterMode>("all");
  const [groupBy, setGroupBy] = useState<GroupByMode>("none");
  const [countryFilter, setCountryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editContact, setEditContact] = useState<Partial<Contact> | null>(null);
  const [initialParentId, setInitialParentId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [collapsedCountryGroups, setCollapsedCountryGroups] = useState<Record<string, boolean>>({});
  const [isDictating, setIsDictating] = useState(false);
  const [dictationSupported, setDictationSupported] = useState(false);
  const [dictationLanguage, setDictationLanguage] = useState<string>(typeof navigator !== "undefined" ? navigator.language : "en-US");

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const transcriptSnapshotRef = useRef("");
  const interimTimerRef = useRef<number | null>(null);
  const pendingTranscriptRef = useRef("");
  const businessCardInputRef = useRef<HTMLInputElement>(null);
  const [businessCardFile, setBusinessCardFile] = useState<File | null>(null);
  const [isUploadingBusinessCard, setIsUploadingBusinessCard] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"archive" | "delete" | null>(null);
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Load tags when editing
  const { data: editTagIdsData } = useContactTagLinks(editContact?.id);
  const editTagIds = editTagIdsData ?? EMPTY_STRING_LIST;

  const { data: linkedContacts = [], isLoading: isLoadingLinkedContacts } = useQuery({
    queryKey: ["contacts-by-parent", editContact?.id],
    queryFn: async () => {
      if (!editContact?.id) return [];
      const { data, error } = await (supabase.from("contacts") as any)
        .select("*")
        .eq("parent_id", editContact.id as any)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Contact[];
    },
    enabled: !!editContact?.id && !!editContact?.is_company,
  });

  // Linked customer record — carries the Innovations account_number that ties
  // this company/customer contact to their ERP account and portal statements.
  const { data: linkedCustomerRecord } = useQuery({
    queryKey: ["contact-customer-record", editContact?.id],
    queryFn: async () => {
      if (!editContact?.id) return null;
      const { data, error } = await (supabase.from("customers") as any)
        .select("id,account_number")
        .eq("contact_id", editContact.id as any)
        .maybeSingle();
      if (error) throw error;
      return data as { id: number; account_number: string | null } | null;
    },
    enabled: !!editContact?.id && !!editContact?.is_customer,
  });
  const [accountNumber, setAccountNumber] = useState("");
  useEffect(() => {
    setAccountNumber(linkedCustomerRecord?.account_number ?? "");
  }, [linkedCustomerRecord?.id, linkedCustomerRecord?.account_number, editContact?.id]);

  const { data: opportunities = [] } = useQuery({
    queryKey: ["contact-opportunity-links"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("opportunities") as any)
        .select("id,contact_id,title")
        .limit(3000);
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; contact_id: string; title: string | null }[];
    },
  });

  const { data: quotePriceProfiles = [] } = useQuery({
    queryKey: ["contact-quote-price-profile-links"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("quotes") as any)
        .select("id,customer_name,contact_name,price_profile_id")
        .not("price_profile_id", "is", null)
        .limit(3000);
      if (error) throw error;
      return (data ?? []) as { id: string; customer_name: string | null; contact_name: string | null; price_profile_id: string | null }[];
    },
  });

  const opportunityCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const opp of opportunities) {
      m.set(opp.contact_id, (m.get(opp.contact_id) ?? 0) + 1);
    }
    return m;
  }, [opportunities]);

  const pricingProfileByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const q of quotePriceProfiles) {
      const profileId = q.price_profile_id ?? undefined;
      if (!profileId) continue;
      const keys = [q.customer_name, q.contact_name].filter(Boolean) as string[];
      for (const k of keys) {
        const key = k.trim().toLowerCase();
        if (key && !m.has(key)) m.set(key, profileId);
      }
    }
    return m;
  }, [quotePriceProfiles]);

  const countryOptions = useMemo(
    () => ensureOption(COUNTRY_OPTIONS, editContact?.country_code),
    [editContact?.country_code],
  );
  const stateOptions = useMemo(
    () => ensureOption(getStateOptionsByCountry(editContact?.country_code), editContact?.state),
    [editContact?.country_code, editContact?.state],
  );
  const cityOptions = useMemo(
    () => ensureOption(getCityOptionsByCountry(editContact?.country_code), editContact?.city),
    [editContact?.country_code, editContact?.city],
  );
  const dictationLanguageOptions = useMemo(() => {
    if (!dictationLanguage) return DICTATION_LANGUAGE_OPTIONS;
    if (DICTATION_LANGUAGE_OPTIONS.some((option) => option.value === dictationLanguage)) {
      return DICTATION_LANGUAGE_OPTIONS;
    }
    return [{ value: dictationLanguage, label: `${dictationLanguage} (Browser default)` }, ...DICTATION_LANGUAGE_OPTIONS];
  }, [dictationLanguage]);

  const countryLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    COUNTRY_OPTIONS.forEach((option) => {
      const canonical = option.value;
      const normalized = normalizeHeader(option.label);
      lookup.set(normalized, canonical);
      lookup.set(normalizeHeader(canonical), canonical);
    });
    lookup.set("usa", "United States");
    lookup.set("us", "United States");
    lookup.set("united_states_of_america", "United States");
    lookup.set("u_s_a", "United States");
    lookup.set("uk", "United Kingdom");
    lookup.set("u_k", "United Kingdom");
    lookup.set("great_britain", "United Kingdom");
    lookup.set("trinidad_and_tobago", "Trinidad & Tobago");
    lookup.set("trinidad_tobago", "Trinidad & Tobago");
    return lookup;
  }, []);

  const countryNameFormatter = useMemo(() => {
    if (typeof Intl === "undefined" || typeof Intl.DisplayNames === "undefined") return null;
    return new Intl.DisplayNames(["en"], { type: "region" });
  }, []);


  const filtered = useMemo(() => {
    let list = contacts;
    if (!showArchived) list = list.filter((c) => !c.is_archived);
    if (filter === "companies") list = list.filter((c) => c.is_company);
    if (filter === "persons") list = list.filter((c) => !c.is_company);
    if (filter === "customers") list = list.filter((c) => c.is_customer);
    if (countryFilter !== "all") list = list.filter((c) => c.country_code === countryFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.email.toLowerCase().includes(s) ||
          c.phone.includes(s) ||
          c.city.toLowerCase().includes(s)
      );
    }
    return list;
  }, [contacts, countryFilter, filter, search, showArchived]);

  const groupedByCountry = useMemo(() => {
    if (groupBy !== "country") return [] as { countryCode: string; contacts: Contact[] }[];
    const groups = new Map<string, Contact[]>();
    for (const contact of filtered) {
      const key = contact.country_code || "No country";
      groups.set(key, [...(groups.get(key) ?? []), contact]);
    }
    return [...groups.entries()]
      .map(([countryCode, items]) => ({ countryCode, contacts: items }))
      .sort((a, b) => a.countryCode.localeCompare(b.countryCode));
  }, [filtered, groupBy]);

  const existingDuplicateKeys = useMemo(() => {
    const keys = new Set<string>();
    contacts.forEach((contact) => {
      const key = getDuplicateKey(contact);
      if (key) keys.add(key);
    });
    return keys;
  }, [contacts]);

  const duplicateKeyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    contacts.forEach((contact) => {
      const key = getDuplicateKey(contact);
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [contacts]);

  useEffect(() => {
    if (groupBy !== "country") return;
    setCollapsedCountryGroups((prev) => {
      const next = { ...prev };
      for (const group of groupedByCountry) {
        if (!(group.countryCode in next)) {
          next[group.countryCode] = true;
        }
      }
      for (const key of Object.keys(next)) {
        if (!groupedByCountry.some((group) => group.countryCode === key)) {
          delete next[key];
        }
      }
      return next;
    });
  }, [groupBy, groupedByCountry]);

  useEffect(() => {
    const contactIdSet = new Set(contacts.map((contact) => contact.id));
    setSelectedContactIds((prev) => prev.filter((id) => contactIdSet.has(id)));
  }, [contacts]);


  const clearInterimTimer = useCallback(() => {
    if (interimTimerRef.current !== null) {
      window.clearTimeout(interimTimerRef.current);
      interimTimerRef.current = null;
    }
  }, []);

  const mergeTranscriptIntoNotes = useCallback((nextTranscript: string) => {
    const trimmed = nextTranscript.trim();
    if (!trimmed) return;

    const previous = transcriptSnapshotRef.current;
    let commonPrefixLength = 0;
    const maxPrefix = Math.min(previous.length, trimmed.length);
    while (commonPrefixLength < maxPrefix && previous[commonPrefixLength] === trimmed[commonPrefixLength]) {
      commonPrefixLength += 1;
    }

    const delta = trimmed.slice(commonPrefixLength).trim();
    transcriptSnapshotRef.current = trimmed;
    if (!delta) return;

    setEditContact((prev) => {
      if (!prev) return prev;
      const notes = prev.notes ?? "";
      const normalizedNotes = notes.trim().replace(/\s+/g, " ").toLowerCase();
      const normalizedDelta = delta.replace(/\s+/g, " ").toLowerCase();
      if (normalizedDelta && normalizedNotes.endsWith(normalizedDelta)) {
        return prev;
      }
      const needsSpacer = notes.length > 0 && !/\s$/.test(notes);
      return { ...prev, notes: `${notes}${needsSpacer ? " " : ""}${delta}` };
    });
  }, []);

  const flushPendingTranscript = useCallback(() => {
    if (!pendingTranscriptRef.current) return;
    mergeTranscriptIntoNotes(pendingTranscriptRef.current);
    pendingTranscriptRef.current = "";
  }, [mergeTranscriptIntoNotes]);

  const queueTranscriptMerge = useCallback((transcript: string, immediate = false) => {
    if (!transcript.trim()) return;
    pendingTranscriptRef.current = transcript;
    clearInterimTimer();

    if (immediate) {
      flushPendingTranscript();
      return;
    }

    interimTimerRef.current = window.setTimeout(() => {
      flushPendingTranscript();
      interimTimerRef.current = null;
    }, 250);
  }, [clearInterimTimer, flushPendingTranscript]);

  const stopDictation = useCallback((showToast = false) => {
    clearInterimTimer();
    flushPendingTranscript();
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    }
    transcriptSnapshotRef.current = "";
    setIsDictating(false);

    if (showToast) {
      toast({ title: "Dictation stopped" });
    }
  }, [clearInterimTimer, flushPendingTranscript, toast]);

  useEffect(() => {
    const speechApi = (window as Window & { SpeechRecognition?: BrowserSpeechRecognitionCtor; webkitSpeechRecognition?: BrowserSpeechRecognitionCtor }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: BrowserSpeechRecognitionCtor }).webkitSpeechRecognition;
    setDictationSupported(!!speechApi);
    if (typeof navigator !== "undefined" && navigator.language) {
      setDictationLanguage(navigator.language);
    }
  }, []);

  useEffect(() => () => stopDictation(), [stopDictation]);

  useEffect(() => {
    if (!editContact) {
      stopDictation();
    }
  }, [editContact, stopDictation]);

  const startDictation = useCallback(() => {
    const speechApi = (window as Window & { SpeechRecognition?: BrowserSpeechRecognitionCtor; webkitSpeechRecognition?: BrowserSpeechRecognitionCtor }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: BrowserSpeechRecognitionCtor }).webkitSpeechRecognition;

    if (!speechApi) {
      toast({
        title: "Dictation unavailable",
        description: "Your browser does not support speech-to-text dictation.",
        variant: "destructive",
      });
      return;
    }

    try {
      transcriptSnapshotRef.current = "";
      const recognition = new speechApi();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = dictationLanguage || (typeof navigator !== "undefined" ? navigator.language : "en-US");

      recognition.onresult = (event) => {
        let fullFinal = "";
        let interim = "";

        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcriptPart = result[0]?.transcript ?? "";
          if (result.isFinal) fullFinal += transcriptPart;
          else interim += transcriptPart;
        }

        const combined = `${fullFinal} ${interim}`.trim();
        queueTranscriptMerge(combined, !interim);
      };

      recognition.onerror = (event) => {
        const errorMessages: Partial<Record<SpeechRecognitionErrorCode, string>> = {
          "not-allowed": "Microphone permission was denied. Please allow microphone access to use dictation.",
          "service-not-allowed": "Microphone access is blocked for this browser profile.",
          "audio-capture": "No microphone was detected. Please connect a microphone and try again.",
          network: "A network error interrupted dictation.",
          "language-not-supported": "The selected language is not supported for dictation in this browser.",
        };

        toast({
          title: "Dictation error",
          description: errorMessages[event.error] ?? "Dictation stopped due to an unexpected speech recognition error.",
          variant: "destructive",
        });
        stopDictation();
      };

      recognition.onend = () => {
        flushPendingTranscript();
        setIsDictating(false);
        recognitionRef.current = null;
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsDictating(true);
    } catch (error: any) {
      toast({
        title: "Unable to start dictation",
        description: error?.message ?? "Speech recognition could not be started in this browser.",
        variant: "destructive",
      });
      stopDictation();
    }
  }, [dictationLanguage, flushPendingTranscript, queueTranscriptMerge, stopDictation, toast]);

  const closeEditDialog = useCallback(() => {
    stopDictation();
    setEditContact(null);
  }, [stopDictation]);

  const companies = contacts.filter((c) => c.is_company);
  const linkedCompany = useMemo(
    () => companies.find((company) => company.id === editContact?.parent_id) ?? null,
    [companies, editContact?.parent_id],
  );

  const peopleLinkedContacts = useMemo(
    () => linkedContacts.filter((contact) => !contact.is_company),
    [linkedContacts],
  );

  const companyIndustryName = (company?: Contact | null) => {
    if (!company?.industry_id) return "Not specified";
    const industry = industries.find((item) => item.id === company.industry_id);
    return industry?.full_name || industry?.name || "Not specified";
  };

  const canAssignParent = (contact: Partial<Contact>, parentId?: string | null) => {
    if (!parentId) return { ok: true };
    if (contact.id === parentId) return { ok: false, message: "A contact cannot be linked to itself." };

    const parent = contacts.find((item) => item.id === parentId);
    if (!parent) return { ok: false, message: "Selected parent company no longer exists." };
    if (!parent.is_company) return { ok: false, message: "Parent link must point to a company." };

    const nextParentById = new Map<string, string | null>();
    contacts.forEach((item) => {
      nextParentById.set(item.id, item.parent_id ?? null);
    });
    if (contact.id) nextParentById.set(contact.id, parentId);

    const visited = new Set<string>(contact.id ? [contact.id] : []);
    let cursor: string | null = parentId;
    while (cursor) {
      if (visited.has(cursor)) {
        return { ok: false, message: "This parent assignment creates a cyclic relationship." };
      }
      visited.add(cursor);
      cursor = nextParentById.get(cursor) ?? null;
    }

    return { ok: true };
  };

  const getOpportunityCount = (contactId?: string | null) => (contactId ? opportunityCounts.get(contactId) ?? 0 : 0);

  const getAssignedPriceProfileId = (contact?: Partial<Contact> | null) => {
    const key = contact?.name?.trim().toLowerCase();
    if (!key) return null;
    return pricingProfileByName.get(key) ?? null;
  };

  const openCrmForContact = (contact: Partial<Contact>, event?: React.MouseEvent) => {
    event?.stopPropagation();
    navigate("/admin/crm/pipeline", { state: { contactId: contact.id, contactName: contact.name } });
  };

  const openPricingForContact = (contact: Partial<Contact>, event?: React.MouseEvent) => {
    event?.stopPropagation();
    const pricingSheetId = getAssignedPriceProfileId(contact);
    if (!pricingSheetId) {
      toast({ title: "No assigned pricelist found", description: "Assign a pricing sheet from Users / customer pricing access first.", variant: "destructive" });
      return;
    }
    navigate("/admin/pricing/catalog", { state: { pricingSheetId, contactName: contact.name } });
  };

  const getStoragePathFromPublicUrl = (url?: string | null) => {
    if (!url) return null;
    const marker = "/storage/v1/object/public/data-files/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  };

  const handleBusinessCardUpload = async () => {
    if (!businessCardFile) {
      toast({ title: "Select an image first", variant: "destructive" });
      return;
    }

    const oldPath = getStoragePathFromPublicUrl(editContact?.business_card_image_url ?? null);
    const contactIdPart = editContact?.id ?? "new";
    const safeName = businessCardFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `contact-business-cards/${contactIdPart}/${Date.now()}-${safeName}`;

    setIsUploadingBusinessCard(true);
    try {
      const { error: uploadError } = await supabase.storage.from("data-files").upload(path, businessCardFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("data-files").getPublicUrl(path);
      setEditContact((prev) => prev ? {
        ...prev,
        business_card_image_url: publicUrlData.publicUrl,
        business_card_uploaded_at: new Date().toISOString(),
        business_card_file_name: businessCardFile.name,
      } : prev);

      if (oldPath && oldPath !== path) {
        await supabase.storage.from("data-files").remove([oldPath]);
      }

      setBusinessCardFile(null);
      if (businessCardInputRef.current) {
        businessCardInputRef.current.value = "";
      }
      toast({ title: "Business card uploaded" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message ?? "Could not upload business card", variant: "destructive" });
    } finally {
      setIsUploadingBusinessCard(false);
    }
  };

  const handleBusinessCardRemove = async () => {
    try {
      const oldPath = getStoragePathFromPublicUrl(editContact?.business_card_image_url ?? null);
      if (oldPath) {
        await supabase.storage.from("data-files").remove([oldPath]);
      }
      setEditContact((prev) => prev ? {
        ...prev,
        business_card_image_url: null,
        business_card_uploaded_at: null,
        business_card_file_name: null,
      } : prev);
      setBusinessCardFile(null);
      if (businessCardInputRef.current) {
        businessCardInputRef.current.value = "";
      }
    } catch (error: any) {
      toast({ title: "Failed to remove image", description: error.message ?? "Please try again.", variant: "destructive" });
    }
  };



  const exportCsv = () => {
    const headers = [...CONTACT_IMPORT_FIELDS];
    const toCsvValue = (value: unknown) => {
      const str = String(value ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };
    const groupedRows = groupedByCountry.flatMap((group) => [
      [toCsvValue(`Country: ${group.countryCode}`), toCsvValue(`Count: ${group.contacts.length}`), ...Array(headers.length - 2).fill("")].join(","),
      ...group.contacts.map((c) => headers.map((h) => toCsvValue((c as any)[h])).join(",")),
    ]);

    const rows = groupBy === "country" ? groupedRows : filtered.map((c) => headers.map((h) => toCsvValue((c as any)[h])).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${filtered.length} contacts` });
  };

  const downloadImportTemplate = () => {
    const headers = [...CONTACT_IMPORT_FIELDS];
    const exampleRows = [
      ["Acme Optical", "true", "info@acmeoptical.com", "+1 246 555 0100", "42 Broad St", "Suite 3", "Bridgetown", "Saint Michael", "BB11000", "BB", "123456", "https://acmeoptical.com", "rjh", "Example company row"],
      ["Jane Doe", "false", "jane.doe@acmeoptical.com", "+1 246 555 0101", "42 Broad St", "", "Bridgetown", "Saint Michael", "BB11000", "BB", "", "", "rjh", "Example person row"],
    ];
    const toCsvValue = (value: unknown) => {
      const str = String(value ?? "");
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const csv = [
      headers.join(","),
      ...exampleRows.map((row) => row.map((value) => toCsvValue(value)).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded contacts import template" });
  };

  const toggleCountryGroup = (countryCode: string) => {
    setCollapsedCountryGroups((prev) => ({
      ...prev,
      [countryCode]: !(prev[countryCode] ?? true),
    }));
  };

  const isAllVisibleSelected = filtered.length > 0 && filtered.every((contact) => selectedContactIds.includes(contact.id));

  const toggleContactSelection = (contactId: string, checked: boolean) => {
    setSelectedContactIds((prev) => checked ? [...prev, contactId] : prev.filter((id) => id !== contactId));
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    if (!checked) {
      setSelectedContactIds((prev) => prev.filter((id) => !filtered.some((contact) => contact.id === id)));
      return;
    }
    setSelectedContactIds((prev) => {
      const merged = new Set(prev);
      filtered.forEach((contact) => merged.add(contact.id));
      return [...merged];
    });
  };

  const renderContactRow = (c: Contact) => (
    <TableRow key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
      <TableCell className="w-10" onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={selectedContactIds.includes(c.id)}
          onCheckedChange={(checked) => toggleContactSelection(c.id, checked === true)}
          aria-label={`Select ${c.name}`}
        />
      </TableCell>
      <TableCell className="font-medium text-xs">
        <div className="flex items-center gap-1.5">
          <span>{c.name}</span>
          {(duplicateKeyCounts.get(getDuplicateKey(c)) ?? 0) > 1 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">Duplicate</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Badge
            className="text-[10px] px-1.5 py-0 h-5 border-0"
            style={{
              background: c.is_company ? "hsl(215 65% 50% / 0.12)" : "hsl(168 76% 42% / 0.12)",
              color: c.is_company ? "hsl(215 65% 50%)" : "hsl(168 76% 42%)",
            }}
          >
            {c.is_company ? "Company" : "Person"}
          </Badge>
          {c.is_customer && (
            <Badge className="text-[10px] px-1.5 py-0 h-5 border-0" style={{ background: "hsl(38 92% 50% / 0.12)", color: "hsl(38 92% 40%)" }}>
              Customer
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs">{c.email}</TableCell>
      <TableCell className="text-xs">{c.phone}</TableCell>
      <TableCell className="text-xs">{c.salesperson}</TableCell>
      <TableCell className="text-xs">{c.city}</TableCell>
      <TableCell className="text-xs">{c.country_code}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {getOpportunityCount(c.id) > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={(e) => openCrmForContact(c, e)}
            >
              <Kanban className="h-3 w-3 mr-1" /> CRM ({getOpportunityCount(c.id)})
            </Button>
          )}
          {getAssignedPriceProfileId(c) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={(e) => openPricingForContact(c, e)}
            >
              <BadgeDollarSign className="h-3 w-3 mr-1" /> Pricelist
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  const normalizeImportedCountry = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const aliasCountry = countryLookup.get(normalizeHeader(trimmed));
    if (aliasCountry) return aliasCountry;
    if (countryNameFormatter && /^[A-Za-z]{2}$/.test(trimmed)) {
      const byCode = countryNameFormatter.of(trimmed.toUpperCase());
      if (byCode) return byCode;
    }
    return trimmed;
  };

  const previewSummary = useMemo(() => {
    const ready = importPreviewRows.filter((row) => row.status === "ready").length;
    const duplicates = importPreviewRows.filter((row) => row.status === "duplicate").length;
    const invalid = importPreviewRows.filter((row) => row.status === "invalid").length;
    return { total: importPreviewRows.length, ready, duplicates, invalid };
  }, [importPreviewRows]);

  const importCsv = () => {
    if (isImporting) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const rows = parseCsvText(text);
      if (rows.length < 2) {
        toast({ title: "CSV must have a header row and at least one data row", variant: "destructive" });
        return;
      }

      const headerFields = rows[0].map((header) => FIELD_ALIASES[normalizeHeader(header)] ?? null);
      if (!headerFields.includes("name")) {
        toast({ title: "CSV must contain a 'name' column", variant: "destructive" });
        return;
      }

      const isCompanyIndex = headerFields.findIndex((field) => field === "is_company");
      const existingImportKeys = new Set<string>();
      const existingContactByName = new Map<string, { id: string; is_company: boolean }>();
      contacts.forEach((contact) => {
        const key = getImportDuplicateKey(contact);
        if (key) existingImportKeys.add(key);
        const nameKey = normalizeValue(contact.name);
        if (nameKey) existingContactByName.set(nameKey, { id: contact.id, is_company: contact.is_company });
      });

      const previewRows = rows.slice(1).map((rawRowValues, offset) => {
        let rowValues = rawRowValues;
        if (isCompanyIndex >= 0 && rawRowValues.length > headerFields.length) {
          const boolIdx = rawRowValues.findIndex((value, idx) => idx >= isCompanyIndex && isBooleanLike(value));
          if (boolIdx > isCompanyIndex) {
            const namePartCount = boolIdx - isCompanyIndex + 1;
            rowValues = [
              rawRowValues.slice(0, namePartCount).join(", ").replace(/\s+/g, " ").trim(),
              ...rawRowValues.slice(boolIdx),
            ];
          }
        }

        const row: Record<string, string | boolean | null> = {};
        headerFields.forEach((field, idx) => {
          if (!field) return;
          const value = (rowValues[idx] ?? "").trim();
          if (field === "is_company") {
            row[field] = normalizeBoolean(value);
            return;
          }
          if (field === "country_code") {
            row[field] = normalizeImportedCountry(value);
            return;
          }
          row[field] = value;
        });

        const rowNumber = offset + 2;
        const rawName = String(row.name ?? "").trim();
        if (!rawName) {
          return { rowNumber, displayName: "(Unnamed contact)", row, linkedName: null, status: "invalid" as const, reason: "Missing name" };
        }
        if (!("is_company" in row)) row.is_company = false;

        const linkedName = splitLinkedContactName(rawName);
        if (linkedName) {
          if (row.is_company === true) {
            return {
              rowNumber,
              displayName: `${linkedName.companyName} ↔ ${linkedName.personName}`,
              row,
              linkedName,
              status: "invalid" as const,
              reason: "Row has company+person in name but is_company is true",
            };
          }
          const linkedPersonKey = normalizeValue(linkedName.personName);
          const existingLinkedPerson = existingContactByName.get(linkedPersonKey);
          if (existingLinkedPerson) {
            return {
              rowNumber,
              displayName: `${linkedName.companyName} ↔ ${linkedName.personName}`,
              row,
              linkedName,
              status: "duplicate" as const,
              reason: "Person name already exists (contacts_name_key)",
            };
          }
          return { rowNumber, displayName: `${linkedName.companyName} ↔ ${linkedName.personName}`, row, linkedName, status: "ready" as const };
        }

        const existingByName = existingContactByName.get(normalizeValue(rawName));
        if (existingByName) {
          return {
            rowNumber,
            displayName: rawName,
            row,
            linkedName: null,
            status: "duplicate" as const,
            reason: "Name already exists",
          };
        }

        const duplicateKey = getImportDuplicateKey({
          name: rawName,
          email: String(row.email ?? ""),
          phone: String(row.phone ?? ""),
        });
        if (duplicateKey && (existingImportKeys.has(duplicateKey))) {
          return { rowNumber, displayName: rawName, row, linkedName: null, status: "duplicate" as const, reason: "Duplicate by email or by name+phone" };
        }
        if (duplicateKey) existingImportKeys.add(duplicateKey);
        return { rowNumber, displayName: rawName, row, linkedName: null, status: "ready" as const };
      });

      setImportPreviewRows(previewRows);
      setIsImportPreviewOpen(true);
    };
    input.click();
  };

  const runImportFromPreview = async () => {
    if (previewSummary.invalid > 0 || previewSummary.duplicates > 0) {
      toast({
        title: "Fix preview issues before importing",
        description: "Import is blocked until all rows are ready.",
        variant: "destructive",
      });
      return;
    }

    const readyRows = importPreviewRows.filter((row) => row.status === "ready");
    if (readyRows.length === 0 || readyRows.length !== importPreviewRows.length) {
      toast({ title: "All rows must be ready before importing", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    let imported = 0;
    let errors = 0;
    let duplicates = 0;
    let linkedRows = 0;
    const issues: string[] = [];
    const importSeenKeys = new Set<string>();
    const existingContactByName = new Map<string, { id: string; is_company: boolean }>();
    contacts.forEach((contact) => {
      const nameKey = normalizeValue(contact.name);
      if (nameKey) existingContactByName.set(nameKey, { id: contact.id, is_company: contact.is_company });
    });
    const existingCompanyByName = new Map<string, string>();
    contacts
      .filter((contact) => contact.is_company)
      .forEach((contact) => {
        existingCompanyByName.set(normalizeValue(contact.name), contact.id);
      });

    const createCompanyFromRow = async (companyName: string, row: Record<string, string | boolean | null>) => {
      const lookupKey = normalizeValue(companyName);
      const existingCompanyId = existingCompanyByName.get(lookupKey);
      if (existingCompanyId) return existingCompanyId;

      const { data: inserted, error } = await (supabase.from("contacts") as any)
        .insert({
          name: companyName,
          is_company: true,
          email: "",
          phone: "",
          street: row.street ?? "",
          street2: row.street2 ?? "",
          city: row.city ?? "",
          state: row.state ?? "",
          zip: row.zip ?? "",
          country_code: row.country_code ?? "",
          tax_id: row.tax_id ?? "",
          website: row.website ?? "",
          salesperson: row.salesperson ?? "",
          notes: row.notes ?? "",
          is_archived: false,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      existingCompanyByName.set(lookupKey, inserted.id);
      imported += 1;
      return inserted.id as string;
    };

    for (const previewRow of readyRows) {
      const row = previewRow.row;
      const rawName = String(row.name ?? "").trim();
      if (!rawName) {
        errors += 1;
        continue;
      }

      const linkedName = previewRow.linkedName;
      if (linkedName) {
        try {
          const companyId = await createCompanyFromRow(linkedName.companyName, row);
          const personRow: Record<string, unknown> = {
            ...row,
            name: linkedName.personName,
            is_company: false,
            parent_id: companyId,
          };
          const linkedPersonKey = normalizeValue(linkedName.personName);

          const personScopedKey = `${getImportDuplicateKey({
            name: linkedName.personName,
            email: String(personRow.email ?? ""),
            phone: String(personRow.phone ?? ""),
          })}|parent:${companyId}`;
          if (!personScopedKey.startsWith("|") && importSeenKeys.has(personScopedKey)) {
            duplicates += 1;
            continue;
          }

          const { error } = await (supabase.from("contacts") as any).insert(personRow as any);
          if (error) {
            errors += 1;
            issues.push(`Row ${previewRow.rowNumber}: ${error.message}`);
            continue;
          }
          imported += 1;
          linkedRows += 1;
          if (linkedPersonKey) existingContactByName.set(linkedPersonKey, { id: "__new__", is_company: false });
          if (!personScopedKey.startsWith("|")) importSeenKeys.add(personScopedKey);
          continue;
        } catch (error: any) {
          errors += 1;
          issues.push(`Row ${previewRow.rowNumber}: ${error?.message ?? "Linked import failed"}`);
          continue;
        }
      }

      const duplicateKey = getImportDuplicateKey({
        name: String(row.name ?? ""),
        email: String(row.email ?? ""),
        phone: String(row.phone ?? ""),
      });
      const rawNameKey = normalizeValue(String(row.name ?? ""));
      if (rawNameKey && existingContactByName.has(rawNameKey)) {
        duplicates += 1;
        continue;
      }
      if (duplicateKey && importSeenKeys.has(duplicateKey)) {
        duplicates += 1;
        continue;
      }

      const { error } = await (supabase.from("contacts") as any).insert(row as any);
      if (error) {
        errors += 1;
        issues.push(`Row ${previewRow.rowNumber}: ${error.message}`);
      } else {
        imported += 1;
        if (rawNameKey) existingContactByName.set(rawNameKey, { id: "__new__", is_company: !!row.is_company });
        if (duplicateKey) importSeenKeys.add(duplicateKey);
      }
    }

    await qc.invalidateQueries({ queryKey: ["contacts"] });
    setIsImporting(false);
    setIsImportPreviewOpen(false);
    setImportPreviewRows([]);
    toast({
      title: `Imported ${imported} contacts${linkedRows ? ` (${linkedRows} linked from name pairs)` : ""}${errors ? `, ${errors} errors` : ""}${duplicates ? `, ${duplicates} duplicates flagged` : ""}`,
      description: issues.length > 0 ? issues.slice(0, 2).join(" ") : undefined,
      variant: errors > 0 ? "destructive" : "default",
    });
  };

  const handleSave = async () => {
    if (!editContact?.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    const parentValidation = canAssignParent(editContact, editContact.parent_id ?? null);
    if (!parentValidation.ok) {
      toast({ title: "Invalid company link", description: parentValidation.message, variant: "destructive" });
      return;
    }

    const nextParentId = editContact.parent_id ?? null;
    try {
      // If new contact, insert and get id back
      let contactId = editContact.id;
      if (!contactId) {
        const { data: inserted, error: insErr } = await (supabase.from("contacts") as any)
          .insert({
            name: editContact.name,
            is_company: editContact.is_company ?? true,
            email: editContact.email ?? "",
            phone: editContact.phone ?? "",
            street: editContact.street ?? "",
            street2: editContact.street2 ?? "",
            city: editContact.city ?? "",
            state: editContact.state ?? "",
            zip: editContact.zip ?? "",
            country_code: editContact.country_code ?? "",
            tax_id: editContact.tax_id ?? "",
            website: editContact.website ?? "",
            industry_id: editContact.industry_id ?? null,
            notes: editContact.notes ?? "",
            salesperson: editContact.salesperson ?? "",
            parent_id: editContact.parent_id ?? null,
            is_archived: editContact.is_archived ?? false,
            avatar_url: editContact.avatar_url ?? "",
            ...(editContact.business_card_image_url ? {
              business_card_image_url: editContact.business_card_image_url,
              business_card_uploaded_at: editContact.business_card_uploaded_at ?? null,
              business_card_file_name: editContact.business_card_file_name ?? null,
            } : {}),
            is_customer: editContact.is_customer ?? false,
            lead_source: editContact.lead_source ?? "",
            pipeline_stage: editContact.pipeline_stage ?? "New",
          } as any)
          .select("id")
          .single();
        if (insErr) throw insErr;
        contactId = inserted.id;
      } else {
        await saveContact.mutateAsync(editContact);
      }

      // Save tags
      if (contactId) {
        await setContactTags.mutateAsync({ contactId, tagIds: selectedTagIds });
      }

      // Auto-create/sync customer record when is_customer is true. Also keeps
      // account_number in sync — this is the sole key that links a website
      // customer's account to their Innovations ERP account and statements.
      if (editContact.is_customer && contactId) {
        const trimmedAccountNumber = accountNumber.trim() || null;
        // Check if customer already linked
        const { data: existing } = await (supabase.from("customers") as any)
          .select("id")
          .eq("contact_id", contactId as any)
          .maybeSingle();
        if (!existing) {
          await (supabase.from("customers") as any).insert({
            name: editContact.name,
            email: editContact.email ?? null,
            phone: editContact.phone ?? null,
            address: [editContact.street, editContact.city, editContact.state, editContact.country_code].filter(Boolean).join(", ") || null,
            type: editContact.is_company ? "Company" : "Person",
            pipeline_stage: editContact.pipeline_stage ?? "Prospect",
            contact_id: contactId,
            account_number: trimmedAccountNumber,
          } as any);
        } else if (trimmedAccountNumber !== (linkedCustomerRecord?.account_number ?? null)) {
          const { error: acctErr } = await (supabase.from("customers") as any)
            .update({ account_number: trimmedAccountNumber })
            .eq("id", existing.id as any);
          if (acctErr) throw acctErr;
        }
      }

      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts-by-parent", initialParentId] });
      qc.invalidateQueries({ queryKey: ["contacts-by-parent", nextParentId] });
      qc.invalidateQueries({ queryKey: ["contact-by-id", initialParentId] });
      qc.invalidateQueries({ queryKey: ["contact-by-id", nextParentId] });
      qc.invalidateQueries({ queryKey: ["customers-list"] });
      toast({ title: editContact.id ? "Contact updated" : "Contact created" });
      closeEditDialog();
      setInitialParentId(null);
      setBusinessCardFile(null);
      if (businessCardInputRef.current) {
        businessCardInputRef.current.value = "";
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContact.mutateAsync(id);
      toast({ title: "Contact deleted" });
      closeEditDialog();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const runBulkAction = async () => {
    if (!bulkAction || selectedContactIds.length === 0) return;
    try {
      if (bulkAction === "archive") {
        const { error } = await (supabase.from("contacts") as any).update({ is_archived: true }).in("id", selectedContactIds as any);
        if (error) throw error;
        toast({ title: `Archived ${selectedContactIds.length} contacts` });
      } else {
        const { error } = await (supabase.from("contacts") as any).delete().in("id", selectedContactIds as any);
        if (error) throw error;
        toast({ title: `Deleted ${selectedContactIds.length} contacts` });
      }
      setSelectedContactIds([]);
      setBulkAction(null);
      await qc.invalidateQueries({ queryKey: ["contacts"] });
    } catch (error: any) {
      toast({ title: "Bulk action failed", description: error.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const purgeArchivedContacts = async () => {
    try {
      const { error } = await (supabase.from("contacts") as any).delete().eq("is_archived", true as any);
      if (error) throw error;
      setIsPurgeDialogOpen(false);
      toast({ title: "Archived contacts purged" });
      await qc.invalidateQueries({ queryKey: ["contacts"] });
    } catch (error: any) {
      toast({ title: "Purge failed", description: error.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const toggleArchiveContact = async (contact: Partial<Contact>) => {
    if (!contact.id) return;
    try {
      const nextArchived = !(contact.is_archived ?? false);
      const { error } = await (supabase.from("contacts") as any)
        .update({ is_archived: nextArchived })
        .eq("id", contact.id as any);
      if (error) throw error;
      setEditContact((prev) => (prev ? { ...prev, is_archived: nextArchived } : prev));
      await qc.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: nextArchived ? "Contact archived" : "Contact unarchived" });
    } catch (error: any) {
      toast({ title: "Archive update failed", description: error.message ?? "Please try again.", variant: "destructive" });
    }
  };

  const openEdit = (contact: Contact) => {
    stopDictation();
    setEditContact(contact);
    setInitialParentId(contact.parent_id ?? null);
    setSelectedTagIds([]);
    setBusinessCardFile(null);
    if (businessCardInputRef.current) {
      businessCardInputRef.current.value = "";
    }
  };

  const openNew = (isCompany: boolean) => {
    stopDictation();
    setEditContact(emptyContact(isCompany));
    setInitialParentId(null);
    setSelectedTagIds([]);
    setBusinessCardFile(null);
    if (businessCardInputRef.current) {
      businessCardInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!editContact?.id) return;

    setSelectedTagIds((prev) => {
      if (prev.length === editTagIds.length && prev.every((id, index) => id === editTagIds[index])) {
        return prev;
      }
      return editTagIds;
    });
  }, [editContact?.id, editTagIds]);

  const getParentName = (parentId: string | null) => {
    if (!parentId) return "";
    return contacts.find((c) => c.id === parentId)?.name ?? "";
  };

  const getContactTags = (contactId: string) => {
    // We'd need tag links for each row - for list view we'll skip expensive queries
    return [];
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <AdminPageHeader icon={Building2} title="Contacts" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Import CSV" onClick={importCsv} disabled={isImporting}>
              <Upload className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Export CSV" onClick={exportCsv}>
              <Download className="h-4 w-4" />
            </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Configuration">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/admin/erp/config/contact-tags">Tags & industries config</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadImportTemplate}>
                <Download className="h-4 w-4 mr-2" /> Download import template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsPurgeDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" /> Purge archived contacts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1" style={{ background: "hsl(168 76% 42%)", color: "white" }}>
                <Plus className="h-3.5 w-3.5" /> New <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openNew(true)}>
                <Building2 className="h-4 w-4 mr-2" /> New Company
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openNew(false)}>
                <User className="h-4 w-4 mr-2" /> New Person
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex items-center border rounded-md overflow-hidden" style={{ borderColor: "hsl(215 25% 88%)" }}>
          {(["all", "companies", "persons", "customers"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium capitalize transition-colors"
              style={{
                background: filter === f ? "hsl(168 76% 42%)" : "transparent",
                color: filter === f ? "white" : "hsl(215 15% 50%)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Archived
        </label>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="h-8 text-xs w-[150px]">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByMode)}>
          <SelectTrigger className="h-8 text-xs w-[130px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No grouping</SelectItem>
            <SelectItem value="country">Country</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[11px]" style={{ color: "hsl(215 15% 50%)" }}>
          Export mirrors current filters and optionally country grouping.
        </span>
        {selectedContactIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[11px]">{selectedContactIds.length} selected</Badge>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setBulkAction("archive")}>Archive selected</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-red-600" onClick={() => setBulkAction("delete")}>Delete selected</Button>
          </div>
        )}
        <span className="text-xs ml-auto" style={{ color: "hsl(215 15% 50%)" }}>
          {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-md flex-1 min-h-0 overflow-hidden" style={{ borderColor: "hsl(215 25% 88%)" }}>
        <div className="h-full overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={isAllVisibleSelected}
                  onCheckedChange={(checked) => toggleSelectAllVisible(checked === true)}
                  aria-label="Select all visible contacts"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Salesperson</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Connections</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                  No contacts found. Click "New" to create one.
                </TableCell>
              </TableRow>
            ) : groupBy === "country" ? (
              groupedByCountry.map((group) => {
                const isCollapsed = collapsedCountryGroups[group.countryCode] ?? true;
                return (
                  <Fragment key={group.countryCode}>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={9}>
                        <button
                          type="button"
                          onClick={() => toggleCountryGroup(group.countryCode)}
                          className="w-full flex items-center justify-between text-xs font-medium"
                          aria-expanded={!isCollapsed}
                        >
                          <span>{group.countryCode}</span>
                          <span>{group.contacts.length} contact{group.contacts.length !== 1 ? "s" : ""} {isCollapsed ? "(collapsed)" : "(expanded)"}</span>
                        </button>
                      </TableCell>
                    </TableRow>
                    {!isCollapsed && group.contacts.map((c) => renderContactRow(c))}
                  </Fragment>
                );
              })
            ) : (
              filtered.map((c) => renderContactRow(c))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <Dialog open={isImportPreviewOpen} onOpenChange={(open) => !isImporting && setIsImportPreviewOpen(open)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Import contacts preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">{previewSummary.total} incoming rows</Badge>
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{previewSummary.ready} ready</Badge>
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{previewSummary.duplicates} duplicates</Badge>
            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">{previewSummary.invalid} invalid</Badge>
          </div>
          <div className="max-h-[55vh] overflow-y-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Status</TableHead>
                  {CONTACT_IMPORT_FIELDS.map((field) => (
                    <TableHead key={field}>{field}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreviewRows.map((row) => (
                  <TableRow key={`${row.rowNumber}-${row.displayName}`}>
                    <TableCell className="text-xs">{row.rowNumber}</TableCell>
                    <TableCell className="text-xs">
                      {row.status === "ready"
                        ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ready</Badge>
                        : row.status === "duplicate"
                          ? <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{row.reason ?? "Duplicate"}</Badge>
                          : <Badge variant="destructive">{row.reason ?? "Invalid"}</Badge>}
                    </TableCell>
                    {CONTACT_IMPORT_FIELDS.map((field) => (
                      <TableCell key={`${row.rowNumber}-${field}`} className="text-xs whitespace-nowrap">
                        {String(row.row[field] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {previewSummary.ready !== previewSummary.total && (
            <p className="text-xs text-amber-600">
              Import is blocked until every row is validated as Ready.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={isImporting} onClick={() => setIsImportPreviewOpen(false)}>Cancel</Button>
            <Button
              type="button"
              disabled={isImporting || previewSummary.ready === 0 || previewSummary.ready !== previewSummary.total}
              onClick={runImportFromPreview}
            >
              {isImporting ? "Importing..." : `Import ${previewSummary.ready} ready records`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editContact} onOpenChange={(v) => !v && closeEditDialog()}>
        <DialogContent className="max-w-[95vw] w-[900px] p-0 gap-0 overflow-hidden flex flex-col" style={{ height: "calc(100svh - 24px)", maxHeight: "calc(100svh - 24px)" }}>
          {editContact && (() => {
            const currentIndex = filtered.findIndex((c) => c.id === editContact.id);
            const canGoPrev = editContact.id && currentIndex > 0;
            const canGoNext = editContact.id && currentIndex >= 0 && currentIndex < filtered.length - 1;
            const goTo = (contact: Contact) => {
              stopDictation();
              setEditContact(contact);
              setInitialParentId(contact.parent_id ?? null);
              setSelectedTagIds([]);
            };

            return (
              <>
                {/* Header with nav */}
                <DialogHeader className="px-4 py-2.5 border-b shrink-0" style={{ borderColor: "hsl(215 25% 88%)" }}>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 text-sm">
                      {editContact.is_company ? <Building2 className="h-4 w-4" style={{ color: "hsl(215 65% 50%)" }} /> : <User className="h-4 w-4" style={{ color: "hsl(168 76% 42%)" }} />}
                      {editContact.id ? "Edit Contact" : editContact.is_company ? "New Company" : "New Person"}
                    </DialogTitle>
                    {editContact.id && (
                      <div className="hidden sm:flex items-center gap-2 mr-4">
                        {getOpportunityCount(editContact.id) > 0 ? (
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => openCrmForContact(editContact)}>
                            <Kanban className="h-3.5 w-3.5 mr-1" />
                            Open CRM ({getOpportunityCount(editContact.id)})
                          </Button>
                        ) : null}
                        {getAssignedPriceProfileId(editContact) ? (
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => openPricingForContact(editContact)}>
                            <BadgeDollarSign className="h-3.5 w-3.5 mr-1" />
                            Open Pricelist
                          </Button>
                        ) : null}
                      </div>
                    )}
                    {editContact.id && (
                      <div className="hidden sm:flex items-center gap-1 mr-8">
                        <span className="text-[10px] mr-1" style={{ color: "hsl(215 15% 55%)" }}>
                          {currentIndex + 1} / {filtered.length}
                        </span>
                        <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                          disabled={!canGoPrev}
                          onClick={() => canGoPrev && goTo(filtered[currentIndex - 1])}>
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                          disabled={!canGoNext}
                          onClick={() => canGoNext && goTo(filtered[currentIndex + 1])}>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogHeader>

                {/* Body with tabs */}
                <Tabs defaultValue="details" className="flex flex-col min-h-0 flex-1">
                  <TabsList className="px-4 pt-2 pb-0 h-auto bg-transparent justify-start gap-2 shrink-0">
                    <TabsTrigger value="details" className="text-xs h-7 px-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Details</TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs h-7 px-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="flex-1 px-4 py-3 m-0 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-2.5 md:h-full">
                      {/* Column 1: Identity */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(215 15% 55%)" }}>Identity</h4>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Name *</label>
                          <Input className="h-7 text-xs" value={editContact.name ?? ""} onChange={(e) => setEditContact({ ...editContact, name: e.target.value })} />
                        </div>
                        <div className="border rounded-md p-2 space-y-1.5" style={{ borderColor: "hsl(var(--border))" }}>
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-[11px] font-semibold">Contact type</Label>
                            <Switch
                              checked={editContact.is_company ?? false}
                              onCheckedChange={(checked) => setEditContact({
                                ...editContact,
                                is_company: checked,
                                parent_id: checked ? null : editContact.parent_id ?? null,
                              })}
                            />
                          </div>
                          <p className="text-[10px]" style={{ color: "hsl(215 15% 55%)" }}>
                            {editContact.is_company ? "Company (can have linked persons)" : "Person (can link to one company)"}
                          </p>
                        </div>
                        {!editContact.is_company && (
                          <div>
                            <label className="text-[11px] font-medium mb-0.5 block">Parent Company</label>
                            <Select value={editContact.parent_id ?? "none"} onValueChange={(v) => setEditContact({ ...editContact, parent_id: v === "none" ? null : v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select company" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {!editContact.is_company && (
                          <div className="border rounded-md p-2 space-y-2" style={{ borderColor: "hsl(var(--border))" }}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold">Linked Company</p>
                              {linkedCompany ? (
                                <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => openEdit(linkedCompany)}>
                                  Open Company
                                </Button>
                              ) : null}
                            </div>
                            {linkedCompany ? (
                              <>
                                <p className="text-xs font-medium">{linkedCompany.name}</p>
                                <p className="text-[10px]" style={{ color: "hsl(215 15% 55%)" }}>
                                  {companyIndustryName(linkedCompany)} · {[linkedCompany.city, linkedCompany.country_code].filter(Boolean).join(", ") || "Location not specified"}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setEditContact({ ...editContact, parent_id: null })}>
                                    Clear
                                  </Button>
                                  <span className="text-[10px]" style={{ color: "hsl(215 15% 55%)" }}>Use Parent Company to reassign.</span>
                                </div>
                              </>
                            ) : (
                              <p className="text-[10px]" style={{ color: "hsl(215 15% 55%)" }}>No company linked. Select one above to assign.</p>
                            )}
                          </div>
                        )}
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Email</label>
                          <Input className="h-7 text-xs" value={editContact.email ?? ""} onChange={(e) => setEditContact({ ...editContact, email: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Phone</label>
                          <Input className="h-7 text-xs" value={editContact.phone ?? ""} onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Website</label>
                          <Input className="h-7 text-xs" value={editContact.website ?? ""} onChange={(e) => setEditContact({ ...editContact, website: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Salesperson</label>
                          <Input className="h-7 text-xs" value={editContact.salesperson ?? ""} onChange={(e) => setEditContact({ ...editContact, salesperson: e.target.value })} />
                        </div>
                      </div>

                      {/* Column 2: Address */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(215 15% 55%)" }}>Address</h4>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Street</label>
                          <Input className="h-7 text-xs" value={editContact.street ?? ""} onChange={(e) => setEditContact({ ...editContact, street: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Street 2</label>
                          <Input className="h-7 text-xs" value={editContact.street2 ?? ""} onChange={(e) => setEditContact({ ...editContact, street2: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Country</label>
                          <Select
                            value={editContact.country_code || "__none"}
                            onValueChange={(v) => {
                              if (v === "__none") {
                                setEditContact({ ...editContact, country_code: "", state: "", city: "" });
                                return;
                              }
                              const nextStateOptions = getStateOptionsByCountry(v);
                              const nextCityOptions = getCityOptionsByCountry(v);
                              setEditContact({
                                ...editContact,
                                country_code: v,
                                state: nextStateOptions.some((opt) => opt.value === (editContact.state ?? "")) ? (editContact.state ?? "") : "",
                                city: nextCityOptions.some((opt) => opt.value === (editContact.city ?? "")) ? (editContact.city ?? "") : "",
                              });
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select country" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none" className="text-xs">Not specified</SelectItem>
                              {countryOptions.map((country) => (
                                <SelectItem key={country.value} value={country.value} className="text-xs">{country.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-medium mb-0.5 block">State</label>
                            <Select value={editContact.state || "__none"} onValueChange={(v) => setEditContact({ ...editContact, state: v === "__none" ? "" : v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select state" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none" className="text-xs">Not specified</SelectItem>
                                {stateOptions.map((state) => (
                                  <SelectItem key={state.value} value={state.value} className="text-xs">{state.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium mb-0.5 block">City</label>
                            <Select value={editContact.city || "__none"} onValueChange={(v) => setEditContact({ ...editContact, city: v === "__none" ? "" : v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select city" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none" className="text-xs">Not specified</SelectItem>
                                {cityOptions.map((city) => (
                                  <SelectItem key={city.value} value={city.value} className="text-xs">{city.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">ZIP</label>
                          <Input className="h-7 text-xs" value={editContact.zip ?? ""} onChange={(e) => setEditContact({ ...editContact, zip: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Tax ID</label>
                          <Input className="h-7 text-xs" value={editContact.tax_id ?? ""} onChange={(e) => setEditContact({ ...editContact, tax_id: e.target.value })} />
                        </div>
                      </div>

                      {/* Column 3: Classification */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(215 15% 55%)" }}>Classification</h4>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Industry</label>
                          <Select value={editContact.industry_id ?? "none"} onValueChange={(v) => setEditContact({ ...editContact, industry_id: v === "none" ? null : v })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select industry" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {industries.map((i) => (<SelectItem key={i.id} value={i.id}>{i.full_name || i.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Lead Source</label>
                          <Select value={editContact.lead_source || "not_specified"} onValueChange={(v) => setEditContact({ ...editContact, lead_source: v })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select source…" /></SelectTrigger>
                            <SelectContent>
                              {LEAD_SOURCES.map((s) => (<SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium mb-0.5 block">Pipeline Stage</label>
                          <Select value={editContact.pipeline_stage ?? "New"} onValueChange={(v) => setEditContact({ ...editContact, pipeline_stage: v })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PIPELINE_STAGES.map((s) => (<SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Customer toggle */}
                        <div className="border rounded-md p-2 space-y-1.5 mt-1" style={{ borderColor: "hsl(var(--border))" }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                              <Label className="text-[11px] font-semibold">Customer</Label>
                            </div>
                            <Switch
                              checked={editContact.is_customer ?? false}
                              onCheckedChange={(checked) => setEditContact({ ...editContact, is_customer: checked, pipeline_stage: checked ? (editContact.pipeline_stage === "New" ? "Prospect" : editContact.pipeline_stage) : editContact.pipeline_stage })}
                            />
                          </div>
                          <p className="text-[10px]" style={{ color: "hsl(215 15% 55%)" }}>
                            {editContact.is_customer ? "Available for pricelist assignments" : "Not a customer"}
                          </p>
                          {editContact.is_company && editContact.is_customer && (
                            <div className="pt-1">
                              <label className="text-[11px] font-medium mb-0.5 block">Account Number</label>
                              <Input
                                className="h-7 text-xs"
                                placeholder="e.g. RETAIL"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                              />
                              <p className="text-[10px] mt-0.5" style={{ color: "hsl(215 15% 55%)" }}>
                                The only field that links this account to Innovations and the customer's online statements.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        {editContact.id && (
                          <div>
                            <label className="text-[11px] font-medium mb-0.5 block">Tags</label>
                            <div className="flex flex-wrap gap-1">
                              {tags.map((tag) => {
                                const selected = selectedTagIds.includes(tag.id);
                                return (
                                  <button
                                    key={tag.id}
                                    onClick={() => setSelectedTagIds((prev) => selected ? prev.filter((t) => t !== tag.id) : [...prev, tag.id])}
                                    className="px-1.5 py-0.5 rounded-full text-[10px] font-medium border transition-all"
                                    style={{
                                      background: selected ? tag.color + "20" : "transparent",
                                      color: selected ? tag.color : "hsl(215 15% 50%)",
                                      borderColor: selected ? tag.color : "hsl(215 25% 88%)",
                                    }}
                                  >
                                    {tag.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {editContact.is_company && (
                          <div className="border rounded-md p-2 space-y-2" style={{ borderColor: "hsl(var(--border))" }}>
                            <div className="flex items-center justify-between">
                              <Label className="text-[11px] font-semibold">Linked Contacts</Label>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{peopleLinkedContacts.length}</Badge>
                            </div>
                            {isLoadingLinkedContacts ? (
                              <p className="text-[10px]" style={{ color: "hsl(215 15% 55%)" }}>Loading linked contacts…</p>
                            ) : peopleLinkedContacts.length === 0 ? (
                              <p className="text-[10px]" style={{ color: "hsl(215 15% 55%)" }}>No people linked to this company.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {peopleLinkedContacts.map((contact) => (
                                  <div key={contact.id} className="border rounded-sm p-1.5" style={{ borderColor: "hsl(215 25% 88%)" }}>
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <p className="text-[11px] font-medium leading-tight">{contact.name}</p>
                                        {!!contact.type && <p className="text-[10px]" style={{ color: "hsl(215 15% 55%)" }}>{contact.type}</p>}
                                      </div>
                                      <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={() => openEdit(contact)}>
                                        Open
                                      </Button>
                                    </div>
                                    <p className="text-[10px] mt-1" style={{ color: "hsl(215 15% 55%)" }}>
                                      {[contact.email, contact.phone].filter(Boolean).join(" · ") || "No contact details"}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="flex-1 px-4 py-3 m-0 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        variant={isDictating ? "destructive" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => (isDictating ? stopDictation(true) : startDictation())}
                      >
                        {isDictating ? <MicOff className="h-3.5 w-3.5 mr-1" /> : <Mic className="h-3.5 w-3.5 mr-1" />}
                        {isDictating ? "Stop dictation" : "Start dictation"}
                      </Button>
                      <Select value={dictationLanguage} onValueChange={setDictationLanguage}>
                        <SelectTrigger className="h-7 text-xs w-[180px]" disabled={!dictationSupported || isDictating}>
                          <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent>
                          {dictationLanguageOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isDictating && (
                        <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "hsl(0 72% 45%)" }}>
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          Recording…
                        </span>
                      )}
                      {!dictationSupported && (
                        <span className="text-[11px]" style={{ color: "hsl(215 15% 55%)" }}>
                          Speech dictation isn’t supported in this browser.
                        </span>
                      )}
                    </div>
                    <Textarea
                      className="text-xs min-h-[120px] resize-none"
                      placeholder="Add notes about this contact…"
                      value={editContact.notes ?? ""}
                      onChange={(e) => setEditContact({ ...editContact, notes: e.target.value })}
                    />
                    <div className="border rounded-md p-3 space-y-2" style={{ borderColor: "hsl(var(--border))" }}>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Business card image
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          ref={businessCardInputRef}
                          type="file"
                          accept="image/*"
                          className="text-xs h-8 max-w-sm"
                          onChange={(e) => setBusinessCardFile(e.target.files?.[0] ?? null)}
                          disabled={isUploadingBusinessCard}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={handleBusinessCardUpload}
                          disabled={!businessCardFile || isUploadingBusinessCard}
                        >
                          {isUploadingBusinessCard ? "Uploading..." : "Upload"}
                        </Button>
                        {editContact.business_card_image_url && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={handleBusinessCardRemove}
                            disabled={isUploadingBusinessCard}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      {editContact.business_card_image_url ? (
                        <div className="flex items-center gap-3">
                          <BusinessCardPreview url={editContact.business_card_image_url} fileName={editContact.business_card_file_name} />
                        </div>
                      ) : (
                        <p className="text-[11px]" style={{ color: "hsl(215 15% 50%)" }}>
                          No business card uploaded yet.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t shrink-0" style={{ borderColor: "hsl(215 25% 88%)" }}>
                  <div>
                    {editContact.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => toggleArchiveContact(editContact)}
                        >
                          {editContact.is_archived ? "Unarchive" : "Archive"}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" style={{ color: "hsl(0 72% 51%)" }} onClick={() => handleDelete(editContact.id!)}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={closeEditDialog}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs" style={{ background: "hsl(168 76% 42%)", color: "white" }} onClick={handleSave} disabled={saveContact.isPending}>
                      {saveContact.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      <AlertDialog open={bulkAction !== null} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bulkAction === "delete" ? "Delete selected contacts?" : "Archive selected contacts?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "delete"
                ? `This permanently deletes ${selectedContactIds.length} selected contacts. This action cannot be undone.`
                : `This archives ${selectedContactIds.length} selected contacts. Archived contacts stay hidden until "Archived" is enabled.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runBulkAction} className={bulkAction === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}>
              {bulkAction === "delete" ? "Delete contacts" : "Archive contacts"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge all archived contacts?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every archived contact for testing cleanup. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={purgeArchivedContacts} className="bg-destructive hover:bg-destructive/90">Purge archived</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContactsPage;
