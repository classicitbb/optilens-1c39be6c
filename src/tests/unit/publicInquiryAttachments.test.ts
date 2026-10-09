import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitPublicInquiry } from "@/lib/publicInquiry";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
const submission = { inquiryType: "assistant_request", name: "Visitor", email: "visitor@example.com", message: "Please help", pageSlug: "/", startedAt: "2026-10-09T12:00:00Z" };

describe("public request attachments", () => {
  beforeEach(() => invoke.mockReset());
  it("sends documents, images and audio with the request as multipart files", async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    const files = [new File(["pdf"], "request.pdf", { type: "application/pdf" }), new File(["image"], "photo.png", { type: "image/png" }), new File(["audio"], "voice.mp3", { type: "audio/mpeg" })];
    await submitPublicInquiry({ ...submission, files });
    const body = invoke.mock.calls[0][1].body as FormData;
    expect(JSON.parse(String(body.get("submission")))).toEqual(submission);
    expect(body.getAll("files").map((file) => (file as File).name)).toEqual(files.map((file) => file.name));
  });
  it("rejects unsupported files before creating a request", async () => {
    await expect(submitPublicInquiry({ ...submission, files: [new File(["exe"], "run.exe", { type: "application/x-msdownload" })] })).rejects.toThrow("not a supported");
    expect(invoke).not.toHaveBeenCalled();
  });
  it("preserves text-only clients and returns attachment failure separately from saved request", async () => {
    invoke.mockResolvedValue({ data: { success: true, attachmentError: "Upload failed" }, error: null });
    expect(await submitPublicInquiry(submission)).toEqual({ success: true, attachmentError: "Upload failed" });
    expect(invoke.mock.calls[0][1].body.message).toBe(submission.message);
  });
});
