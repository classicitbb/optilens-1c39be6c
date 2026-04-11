import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { screen } from "@testing-library/dom";
import { render } from "@testing-library/react";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import { createAuthHref } from "@/lib/authFlow";

const authState = vi.hoisted(() => ({ user: null as null | { id: string }, loading: false }));
const roleState = vi.hoisted(() => ({ hasAccess: false, isLoading: false }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ ...roleState }),
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const GuardedApp = () => (
  <>
    <LocationProbe />
    <Routes>
      <Route path="/auth" element={<div>Auth Screen</div>} />
      <Route path="/" element={<div>Public Home</div>} />
      <Route
        path="/admin/*"
        element={
          <AdminProtectedRoute>
            <div>Admin Surface</div>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/moonshot/*"
        element={
          <AdminProtectedRoute>
            <div>Moonshot Surface</div>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/ops/*"
        element={
          <AdminProtectedRoute>
            <div>Ops Surface</div>
          </AdminProtectedRoute>
        }
      />
    </Routes>
  </>
);

describe("admin route authorization boundaries", () => {

  it("renders loading state while auth role checks are pending", () => {
    authState.user = null;
    authState.loading = true;
    roleState.hasAccess = false;
    roleState.isLoading = true;

    const { container } = render(
      <MemoryRouter initialEntries={["/admin/settings"]}>
        <GuardedApp />
      </MemoryRouter>
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
  it.each(["/admin/settings", "/admin/website/store", "/admin/website/store/variants/lens/demo", "/admin/pricing/compare", "/admin/moonshot/workspace", "/ops/jobs"])(
    "redirects unauthenticated traffic away from %s",
    (path) => {
      authState.user = null;
      authState.loading = false;
      roleState.hasAccess = false;
      roleState.isLoading = false;

      render(
        <MemoryRouter initialEntries={[path]}>
          <GuardedApp />
        </MemoryRouter>
      );

      expect(screen.getByText("Auth Screen")).toBeInTheDocument();
      expect(screen.getByTestId("location").textContent).toContain(createAuthHref({ mode: "signin", redirect: path }));
    }
  );

  it.each(["/admin/settings", "/admin/website/store", "/admin/website/store/variants/lens/demo", "/admin/pricing/compare", "/admin/moonshot/workspace", "/ops/jobs"])(
    "renders forbidden state for authenticated non-admin at %s",
    (path) => {
      authState.user = { id: "u-1" };
      authState.loading = false;
      roleState.hasAccess = false;
      roleState.isLoading = false;

      render(
        <MemoryRouter initialEntries={[path]}>
          <GuardedApp />
        </MemoryRouter>
      );

      expect(screen.getByText("Not Authorized")).toBeInTheDocument();
    }
  );
});
