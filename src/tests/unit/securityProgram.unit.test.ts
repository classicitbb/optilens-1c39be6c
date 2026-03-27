import { describe, expect, it } from "vitest";
import { INCIDENT_RUNBOOKS, SECURITY_ACTIVITY_SCHEDULE, SECRET_POLICY } from "@/security/program";

describe("security program governance", () => {
  it("defines all required incident response runbooks with executable phases", () => {
    const requiredRunbooks = ["credential_leak", "account_takeover", "service_role_exposure", "data_exfiltration"];
    expect(INCIDENT_RUNBOOKS.map((runbook) => runbook.key).sort()).toEqual(requiredRunbooks.sort());

    for (const runbook of INCIDENT_RUNBOOKS) {
      expect(runbook.declarationThresholdMinutes).toBeGreaterThan(0);
      expect(runbook.evidenceSources.length).toBeGreaterThan(0);
      expect(runbook.containmentSteps.length).toBeGreaterThan(1);
      expect(runbook.eradicationSteps.length).toBeGreaterThan(0);
      expect(runbook.recoverySteps.length).toBeGreaterThan(0);
      expect(runbook.communicationSteps.length).toBeGreaterThan(0);
    }
  });

  it("tracks recurring security activities and SLA ownership", () => {
    const requiredActivities = [
      "quarterly_threat_modeling",
      "quarterly_dependency_sast_review",
      "annual_external_pen_test",
      "remediation_sla_tracking",
    ];

    expect(SECURITY_ACTIVITY_SCHEDULE.map((item) => item.key).sort()).toEqual(requiredActivities.sort());
    expect(SECURITY_ACTIVITY_SCHEDULE.every((item) => item.owner.length > 0)).toBe(true);

    const remediationTracking = SECURITY_ACTIVITY_SCHEDULE.find((item) => item.key === "remediation_sla_tracking");
    expect(remediationTracking?.slaDays).toBeLessThanOrEqual(30);
  });

  it("enforces secrets policy controls", () => {
    expect(SECRET_POLICY.prohibited).toContain("hardcoded secrets");
    expect(SECRET_POLICY.controls.scopedKeys).toMatch(/minimal privilege/i);
    expect(SECRET_POLICY.controls.rotationCadence).toMatch(/90 days/i);
    expect(SECRET_POLICY.controls.breakGlass).toMatch(/dual approval/i);
  });
});
