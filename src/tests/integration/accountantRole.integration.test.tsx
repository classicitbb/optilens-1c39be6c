import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { screen } from "@testing-library/dom";
import { render } from "@testing-library/react";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";

const authState = vi.hoisted(() => ({ user: { id: "acct-1" } as null | { id: string }, loading: false }));
const roleState = vi.hoisted(() => ({ hasAccess: false, isAccountant: true, isLoading: false }));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ ...roleState }) }));

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

const renderAt = (initial: string) =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <LocationProbe />
      <Routes>
        <Route path="/admin/*" element={<AdminProtectedRoute><div>Admin Surface</div></AdminProtectedRoute>} />
        <Route path="/ops/*" element={<AdminProtectedRoute><div>Ops Surface</div></AdminProtectedRoute>} />
        <Route path="/atlas/*" element={<AdminProtectedRoute><div>Atlas Surface</div></AdminProtectedRoute>} />
        <Route path="/copilot" element={<AdminProtectedRoute><div>Copilot Surface</div></AdminProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );

describe("accountant route boundaries", () => {
  it.each([
    "/admin/finance/costings",
    "/admin/finance/statements",
    "/admin/finance/payment-activity",
    "/admin/finance/walk-in-payments",
    "/admin/finance/payroll",
    "/admin/finance/assets/runs",
  ])("opens %s", (p) => {
    renderAt(p);
    expect(screen.getByText("Admin Surface")).toBeInTheDocument();
  });

  it.each(["/admin", "/admin/", "/admin/dashboard"])("sends %s to Finance", (p) => {
    renderAt(p);
    expect(screen.getByTestId("location").textContent).toBe("/admin/finance/costings");
  });

  it.each([
    "/admin/settings/users",
    "/admin/pricing/catalog",
    "/admin/crm/contacts",
    "/admin/orders",
    "/admin/website/store",
    "/admin/financex",
    "/admin/email",
    "/ops/jobs",
    "/atlas/wiki",
    "/copilot",
  ])("blocks %s", (p) => {
    renderAt(p);
    expect(screen.getByText("Not Authorized")).toBeInTheDocument();
  });
});

describe("accountant role wiring", () => {
  it("is a customer for customer-side checks and finance-only for staff checks", () => {
    const hook = read("src/hooks/useUserRole.ts");
    expect(hook).toContain('isCustomer: role === "customer" || role === "accountant"');
    expect(hook).toMatch(/hasAccess: role === "admin" \|\| role === "operator" \|\| role === "office_admin" \|\| role === "viewer",/);
  });

  it("does not become an operator in the database", () => {
    const migration = read("supabase/migrations/20261109120100_accountant_role.sql");
    expect(migration).toContain("OR (_role = 'customer' AND role = 'accountant')");
    expect(migration).not.toMatch(/has_edit_role\(_user_id uuid\)/);
    expect(migration).toContain("role IN ('admin', 'office_admin', 'accountant')");
    expect(read("supabase/migrations/20261109120000_accountant_role_enum.sql")).toContain("ADD VALUE IF NOT EXISTS 'accountant'");
  });

  it("grants only finance features", () => {
    const migration = read("supabase/migrations/20261109120100_accountant_role.sql");
    const grants = [...migration.matchAll(/\('accountant'::app_role, '([a-z-]+)'/g)].map((m) => m[1]).sort();
    expect(grants).toEqual(["costings", "hr", "integrations", "payroll"]);
  });

  it("lets the finance guards admit accountants", () => {
    expect(read("src/features/admin/hr/HrRoute.tsx")).toContain('realRole !== "accountant"');
    expect(read("src/features/admin/finance/assets/AssetsRoute.tsx")).toContain('realRole !== "accountant"');
  });
});
