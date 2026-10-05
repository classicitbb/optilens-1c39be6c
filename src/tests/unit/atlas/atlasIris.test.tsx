import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import IrisPanel from "@/features/atlas/iris/IrisPanel";
import { registerAtlasHost } from "@/features/atlas/host";
import { textToBlocks, toInlineText } from "@/features/atlas/iris/irisBlocks";
import { IRIS_ACTIONS } from "@/features/atlas/iris/irisActions";
import { canonicalToTiptapDoc, tiptapDocToCanonical } from "@/lib/wikiCanonical";

const page = { id: "p1", title: "Returns process", text: "Pack the item. Print the label. Send it back." };

const setup = (overrides: Partial<React.ComponentProps<typeof IrisPanel>> = {}) => {
  const props: React.ComponentProps<typeof IrisPanel> = {
    request: null,
    page,
    search: vi.fn().mockResolvedValue([{ pageId: "p2", spaceId: "wiki", title: "Shipping rates", slug: "shipping-rates", status: "published", snippet: "Rates.", rank: 1 }]),
    pageText: () => "Rates by carrier.",
    pagePath: (hit) => `/atlas/wiki/${hit.slug}`,
    route: "/atlas/wiki/returns",
    canEdit: true,
    onAccept: vi.fn().mockReturnValue(true),
    onDraftEntry: vi.fn().mockResolvedValue(undefined),
    onDraftPage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <IrisPanel {...props} />
    </MemoryRouter>,
  );
  return props;
};

describe("Iris panel", () => {
  beforeEach(() => {
    registerAtlasHost({
      iris: { ask: vi.fn().mockResolvedValue({ text: "- [ ] Pack the item\n- [ ] Print the label", citations: [{ id: "p2", title: "Shipping rates", path: "/atlas/wiki/shipping-rates" }] }) },
    });
  });

  it("offers a reply as a proposal; nothing is applied until Accept", async () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Turn steps into checklist" }));
    expect(await screen.findByText("Proposed addition to this page")).toBeTruthy();
    expect(props.onAccept).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(props.onAccept).toHaveBeenCalledTimes(1));
    const proposal = (props.onAccept as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(proposal.apply).toBe("append");
    expect(proposal.blocks[0]).toMatchObject({ type: "todo" });
    expect(await screen.findByText(/Accepted/)).toBeTruthy();
  });

  it("Discard changes nothing", async () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));
    fireEvent.click(await screen.findByRole("button", { name: "Discard" }));
    expect(props.onAccept).not.toHaveBeenCalled();
    expect(await screen.findByText(/Nothing was changed/)).toBeTruthy();
  });

  it("shows context chips and cites sources that open the source page", async () => {
    setup();
    expect(screen.getByText("Page: Returns process")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));
    const chip = await screen.findByRole("link", { name: /Shipping rates/ });
    expect(chip.getAttribute("href")).toBe("/atlas/wiki/shipping-rates");
    expect(screen.getByText("Search results: 1")).toBeTruthy();
  });

  it("shows an error state, keeps the page untouched, and can try again", async () => {
    registerAtlasHost({ iris: { ask: vi.fn().mockResolvedValueOnce(null).mockResolvedValue({ text: "Fine.", citations: [] }) } });
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(props.onAccept).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect((await screen.findAllByText("Fine.")).length).toBeGreaterThan(0);
  });

  it("is paused offline: no calls, the page stays editable", async () => {
    const ask = vi.fn();
    registerAtlasHost({ iris: { ask } });
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    setup();
    expect(screen.getByText(/You're offline/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Summarize" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Send" }) as HTMLButtonElement).disabled).toBe(true);
    expect(ask).not.toHaveBeenCalled();
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  });

  it("offers selection actions only with a selection, and a replace proposal carries its range", async () => {
    const props = setup({ request: { selection: "Teh item is packed", range: { from: 3, to: 21 }, nonce: 1 } });
    expect(await screen.findByText("Selection: 18 characters")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Improve writing" }));
    await screen.findByText("Proposed replacement for your selection");
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(props.onAccept).toHaveBeenCalled());
    expect((props.onAccept as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ apply: "replace", range: { from: 3, to: 21 } });
  });

  it("read-only users get answers but no proposals", async () => {
    setup({ canEdit: false });
    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));
    await screen.findByText(/Pack the item/);
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
  });
});

describe("Iris reply conversion", () => {
  it("preserves document formatting through the editor round trip", () => {
    const blocks = textToBlocks("# Procedure\n\n**Check** the *frame* and `ID`.\n\n- Main\n  - Nested\n\n| Step | Result |\n| --- | --- |\n| **One** | Ready |\n\n- [x] **Verified**\n\n---\n\n```text\n# literal code\n- [ ] literal task\n```");
    expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "list", "table", "todo", "divider", "code"]);
    expect(blocks[2]).toMatchObject({ depths: [0, 1] });
    expect(blocks[4]).toMatchObject({ items: [{ checked: true, children: [{ type: "strong" }] }] });
    expect(blocks[6]).toMatchObject({ text: "# literal code\n- [ ] literal task" });
    const restored = tiptapDocToCanonical(canonicalToTiptapDoc({ blocks }));
    expect(restored.blocks.map((block) => block.type)).toEqual(blocks.map((block) => block.type));
    expect(restored.blocks[1]).toMatchObject({ children: expect.arrayContaining([{ type: "strong", children: [{ type: "text", text: "Check" }] }]) });
  });

  it("renders replies and proposals as rich text and accepts the same formatted blocks", async () => {
    registerAtlasHost({ iris: { ask: vi.fn().mockResolvedValue({ text: "## Check frame\n\n**Inspect** carefully.\n\n- Verify fit", citations: [] }) } });
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));
    await screen.findByText("Proposed addition to this page");
    expect(screen.getAllByRole("heading", { name: "Check frame" })).toHaveLength(2);
    expect(screen.getAllByText("Inspect").every((node) => node.closest("strong"))).toBe(true);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(props.onAccept).toHaveBeenCalledWith(expect.objectContaining({ blocks: textToBlocks("## Check frame\n\n**Inspect** carefully.\n\n- Verify fit") }));
  });
  it("turns checklist lines into a to-do block and the rest into canonical blocks", () => {
    const blocks = textToBlocks("Intro line\n\n- [ ] One\n- [x] Two");
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "todo"]);
    expect(blocks[1]).toMatchObject({ items: [{ checked: false }, { checked: true }] });
  });

  it("flattens Markdown for an inline replacement", () => {
    expect(toInlineText("**Bold** and *soft*\n- item")).toBe("Bold and soft item");
  });

  it("defines every action once with a prompt", () => {
    expect(new Set(IRIS_ACTIONS.map((action) => action.id)).size).toBe(IRIS_ACTIONS.length);
    for (const action of IRIS_ACTIONS) expect(action.prompt({ title: "T", selection: "S" }).length).toBeGreaterThan(0);
  });
});
