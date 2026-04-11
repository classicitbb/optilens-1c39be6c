import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import Auth from "@/pages/Auth";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  toast: vi.fn(),
  insert: vi.fn(),
  oAuth: vi.fn(),
  authState: {
    user: null as null | { id: string; email?: string; user_metadata?: Record<string, unknown> },
  },
}));

vi.mock("@/assets/clean_logo_smooth.svg", () => ({ default: "logo.svg" }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.authState.user,
    signIn: mocks.signIn,
    signUp: mocks.signUp,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock("@/integrations/lovable/index", () => ({
  lovable: {
    auth: {
      signInWithOAuth: mocks.oAuth,
    },
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: mocks.insert,
    }),
  },
}));

const renderAuth = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/store" element={<div>Store Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("Auth page onboarding flow", () => {
  beforeEach(() => {
    mocks.authState.user = null;
    mocks.signIn.mockReset();
    mocks.signUp.mockReset();
    mocks.toast.mockReset();
    mocks.insert.mockReset();
    mocks.oAuth.mockReset();
    mocks.signIn.mockResolvedValue({ error: null });
    mocks.signUp.mockResolvedValue({ error: null });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.oAuth.mockResolvedValue({ error: null });
  });

  it("renders the welcome chooser for signup without a preset audience", () => {
    renderAuth("/auth?mode=signup");

    expect(screen.getByText("Choose the path that fits you best.")).toBeInTheDocument();
    expect(screen.getByText("Optical store, clinic, lab, or business buyer")).toBeInTheDocument();
    expect(screen.getByText("Individual visitor looking for lens guidance")).toBeInTheDocument();
  });

  it("completes professional product signup and shows expectation panel", async () => {
    renderAuth("/auth?mode=signup&audience=professional&redirect=%2Fstore");

    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Jordan Smith" } });
    fireEvent.change(screen.getByLabelText("Phone Number"), { target: { value: "+1 246 555 0101" } });
    fireEvent.change(screen.getByLabelText("Business Name"), { target: { value: "Vision Center" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jordan@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret12" } });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Tell us what you want to do first.")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Products"));
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(mocks.signUp).toHaveBeenCalledWith("jordan@example.com", "secret12", expect.objectContaining({
        fullName: "Jordan Smith",
        phone: "+1 246 555 0101",
        organizationName: "Vision Center",
        audience: "professional",
        interestIntent: "products",
      }));
    });

    await waitFor(() => {
      expect(mocks.insert).toHaveBeenCalled();
      expect(screen.getByText("Onboarding Complete")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Request Trade Follow-up" })).toBeInTheDocument();
    });
  });

  it("signs in and returns to the requested route", async () => {
    renderAuth("/auth?mode=signin&redirect=%2Fstore");

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "existing@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret12" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mocks.signIn).toHaveBeenCalledWith("existing@example.com", "secret12");
      expect(screen.getByText("Store Page")).toBeInTheDocument();
    });
  });
});
