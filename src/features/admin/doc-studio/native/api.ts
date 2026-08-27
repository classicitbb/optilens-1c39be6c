import { supabase } from "@/integrations/supabase/client";
import type {
  CustomerOption,
  EmailContact,
  JsonRecord,
  StudioFileDetail,
  StudioFileSummary,
} from "./types";

interface ApiError extends Error {
  status?: number;
}

async function invoke<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  body?: JsonRecord,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(
    `docstudio-api/v2/${path}`,
    {
      method,
      body,
    },
  );
  if (error) {
    const failure = new Error(error.message) as ApiError;
    failure.status = error.context?.status;
    throw failure;
  }
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    const failure = new Error(data.error) as ApiError;
    failure.status = typeof data.status === "number" ? data.status : undefined;
    throw failure;
  }
  return data as T;
}

export const docStudioApi = {
  workspace: async () =>
    (await invoke<{ files: StudioFileSummary[] }>("my-files")).files ?? [],
  file: async (id: string) =>
    (
      await invoke<{ file: StudioFileDetail }>(
        `files/${encodeURIComponent(id)}`,
      )
    ).file,
  billing: async (id: string) =>
    (
      await invoke<{ document: StudioFileDetail }>(
        `billing-documents/${encodeURIComponent(id)}`,
      )
    ).document,
  saveFile: async (payload: JsonRecord, id?: string) =>
    id
      ? (
          await invoke<{ file: StudioFileDetail }>(
            `files/${encodeURIComponent(id)}`,
            "PUT",
            payload,
          )
        ).file
      : (await invoke<{ file: StudioFileDetail }>("files", "POST", payload))
          .file,
  autosaveFile: async (id: string, payload: JsonRecord) =>
    (
      await invoke<{ file: StudioFileDetail }>(
        `files/${encodeURIComponent(id)}/autosave`,
        "POST",
        payload,
      )
    ).file,
  saveBilling: async (payload: JsonRecord, id?: string) =>
    id
      ? (
          await invoke<{ document: StudioFileDetail }>(
            `billing-documents/${encodeURIComponent(id)}`,
            "PUT",
            payload,
          )
        ).document
      : (
          await invoke<{ document: StudioFileDetail }>(
            "billing-documents",
            "POST",
            payload,
          )
        ).document,
  autosaveBilling: async (id: string, payload: JsonRecord) =>
    (
      await invoke<{ document: StudioFileDetail }>(
        `billing-documents/${encodeURIComponent(id)}/autosave`,
        "POST",
        payload,
      )
    ).document,
  delete: async (file: StudioFileSummary) => {
    const path = file.kind === "billing" ? "billing-documents" : "files";
    await invoke(`${path}/${encodeURIComponent(file.id)}`, "DELETE");
  },
  customers: async () =>
    (await invoke<{ customers: CustomerOption[] }>("pl/customers")).customers ??
    [],
  emailDefaults: async () =>
    invoke<{ from: string; replyTo: string; displayName?: string }>(
      "email/defaults",
    ),
  emailContacts: async () =>
    (await invoke<{ contacts: EmailContact[] }>("email/contacts")).contacts ??
    [],
  sendEmail: async (payload: JsonRecord) =>
    invoke<{ ok: true; messageIds: string[] }>("email/send", "POST", payload),
};
