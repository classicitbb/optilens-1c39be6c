import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import { FillFromPhoto } from "@/features/rx-order/form/FillFromPhoto";
import type { RxCatalog } from "@/features/rx-order/form/types";

const mocks = vi.hoisted(() => ({ create: vi.fn(), read: vi.fn(), row: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } } }));
vi.mock("@/features/rx-capture/api", () => ({
  createCaptureJob: mocks.create,
  readCapture: mocks.read,
  captureJobs: () => ({ select: () => ({ eq: () => ({ single: mocks.row }) }) }),
}));

const catalog = {
  materials: [], designs: [], colours: [], combos: [], treatments: [], clashes: [], lensPrice: () => 100, hasPriceSource: true,
  blockUnpricedOrders: false, surchargeRules: DEFAULT_SURCHARGE_RULES, accountCountry: "BB", pricesVisible: true,
} as unknown as RxCatalog;

const draft = {
  schema: "cv.rxorder/1", orderNo: null, createdAt: "2026-10-01T00:00:00Z", reference: null, patient: { first: "Ann", last: "Lee" },
  job: { scope: "uncut", eyes: "pair", vision: "sv", purpose: "dist" }, frame: { name: "", mount: "", source: "", a: null, b: null, ed: null, dbl: null },
  lens: { material: "", design: "", colour: "" }, split: false, rx: { od: { sph: -2, cyl: -0.5, axis: 90 }, os: { sph: -1, cyl: -0.5, axis: 80 } },
  treatments: [], delivery: { service: "std", method: "", notes: "" }, flags: [{ path: "rx.od.sph", reason: "faint" }],
};

const setup = (over: Partial<Parameters<typeof FillFromPhoto>[0]> = {}) => {
  const onFilled = vi.fn();
  const onError = vi.fn();
  const view = render(<FillFromPhoto accountId={7} accountName="Acme" hasEntries={false} catalog={catalog} onFilled={onFilled} onError={onError} {...over} />);
  const choose = (file: File) => fireEvent.change(view.container.querySelector("input[type=file]")!, { target: { files: [file] } });
  return { onFilled, onError, choose };
};
const photo = () => new File(["x"], "sheet.jpg", { type: "image/jpeg" });

describe("FillFromPhoto", () => {
  beforeEach(() => { mocks.create.mockResolvedValue("job-1"); mocks.read.mockResolvedValue(undefined); mocks.row.mockResolvedValue({ data: { status: "ready", draft, error: null }, error: null }); });
  afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

  it("uploads, reads, and fills the form with the flags carried over", async () => {
    const { onFilled, choose } = setup();
    choose(photo());
    await waitFor(() => expect(onFilled).toHaveBeenCalled());
    expect(mocks.create).toHaveBeenCalledWith(expect.any(File), 7, "u1");
    expect(mocks.read).toHaveBeenCalledWith("job-1");
    const [values, jobId] = onFilled.mock.calls[0];
    expect(jobId).toBe("job-1");
    expect(values.patient).toEqual({ first: "Ann", last: "Lee" });
    expect(values.accountId).toBe(7);
    expect(values.rx.od.sph).toBe("-2.00");
    expect(values.flags).toEqual([{ path: "rx.od.sph", reason: "faint" }]);
  });

  it("asks before replacing what is already entered, and stops if they decline", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onFilled, choose } = setup({ hasEntries: true });
    choose(photo());
    await Promise.resolve();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(onFilled).not.toHaveBeenCalled();
  });

  it("refuses a file that is not a photo or PDF without uploading it", async () => {
    const { onError, choose } = setup();
    choose(new File(["x"], "a.txt", { type: "text/plain" }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/photo or a PDF/)));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("says why when the sheet could not be read, and leaves the form alone", async () => {
    mocks.row.mockResolvedValue({ data: { status: "failed", draft: null, error: "That PDF could not be read — try a photo of it." }, error: null });
    const { onFilled, onError, choose } = setup();
    choose(photo());
    await waitFor(() => expect(onError).toHaveBeenCalledWith("That PDF could not be read — try a photo of it."));
    expect(onFilled).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /fill from photo/i })).toBeEnabled();
  });
});
