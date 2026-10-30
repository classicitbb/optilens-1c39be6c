import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";
import { TRAINING_HUB_PATH } from "@/help/trainingHub";

describe("admin training hub route accessibility", () => {
  it("registers the canonical training hub route in the route registry", () => {
    expect(
      APP_ROUTE_REGISTRY.find(
        (route) => route.id === "admin.settings.training" && route.path === TRAINING_HUB_PATH && route.status === "active",
      ),
    ).toBeTruthy();
  });

  it("declares the runtime route for /admin/settings/training", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/routes/admin/AdminRoutes.tsx"), "utf8");
    expect(source).toContain('const TrainingHubPage = lazyWithRetry(() => import("@/pages/admin/settings/TrainingHubPage"));');
    expect(source).toContain('<Route path="settings/training" element={<TrainingHubPage />} />');
  });

  it("adds Tours & Training navigation inside the settings app", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/features/admin/core/config/apps.ts"), "utf8");
    expect(source).toContain("{ label: 'Tours & Training', route: '/admin/settings/training'");
  });
});
