import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { screen } from "@testing-library/dom";
import { render } from "@testing-library/react";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";

const authState = vi.hoisted(() => ({ user: { id: "admin-1" } as null | { id: string }, loading: false }));
const roleState = vi.hoisted(() => ({ hasAccess: true, isLoading: false }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ ...roleState }),
}));

const RuntimeFlowHarness = () => (
  <Routes>
    <Route path="/" element={<div>Public Landing</div>} />
    <Route path="/store" element={<div>Storefront</div>} />
    <Route
      path="/admin/dashboard"
      element={
        <AdminProtectedRoute>
          <div>Admin Dashboard</div>
        </AdminProtectedRoute>
      }
    />
  </Routes>
);

describe("critical runtime flows (e2e)", () => {
  it("serves critical public flow", () => {
    authState.user = null;
    roleState.hasAccess = false;

    render(
      <MemoryRouter initialEntries={["/store"]}>
        <RuntimeFlowHarness />
      </MemoryRouter>
    );

    expect(screen.getByText("Storefront")).toBeInTheDocument();
  });

  it("serves admin flow for authorized admin", () => {
    authState.user = { id: "admin-1" };
    roleState.hasAccess = true;

    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <RuntimeFlowHarness />
      </MemoryRouter>
    );

    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
  });
});
