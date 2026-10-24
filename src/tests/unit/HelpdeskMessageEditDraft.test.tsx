import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HelpdeskMessageAuthorControls } from "@/components/account/HelpdeskMessageActions";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn() } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

const Message = () => (
  <HelpdeskMessageAuthorControls ticketId="t1" messageId="m1" body="Original text" audience="the customer">
    {({ editor, actions }) => <div>{editor ?? <p>Original text</p>}{actions}</div>}
  </HelpdeskMessageAuthorControls>
);

describe("HelpdeskMessageAuthorControls edit drafts", () => {
  beforeEach(() => window.localStorage.clear());

  it("reopens an unsaved edit with its text after a remount", () => {
    const { unmount } = render(<Message />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText("Edit message"), { target: { value: "Changed but not saved" } });
    unmount();

    render(<Message />);
    expect((screen.getByLabelText("Edit message") as HTMLTextAreaElement).value).toBe("Changed but not saved");
  });

  it("forgets the draft once the edit is cancelled", () => {
    const { unmount } = render(<Message />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText("Edit message"), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    unmount();

    render(<Message />);
    expect(screen.queryByLabelText("Edit message")).toBeNull();
  });
});
