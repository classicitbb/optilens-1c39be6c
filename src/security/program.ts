export type IncidentRunbook = {
  key: "credential_leak" | "account_takeover" | "service_role_exposure" | "data_exfiltration";
  name: string;
  declarationThresholdMinutes: number;
  evidenceSources: string[];
  containmentSteps: string[];
  eradicationSteps: string[];
  recoverySteps: string[];
  communicationSteps: string[];
};

export const INCIDENT_RUNBOOKS: IncidentRunbook[] = [
  {
    key: "credential_leak",
    name: "Credential leak response",
    declarationThresholdMinutes: 15,
    evidenceSources: ["security_audit_events", "security_alerts", "provider audit trail", "secret manager logs"],
    containmentSteps: [
      "Revoke leaked credential and all derived sessions.",
      "Enable emergency deny-list rules for affected endpoints.",
      "Rotate related downstream provider keys before restoring traffic.",
    ],
    eradicationSteps: [
      "Locate source of leak (repo, logs, ticket, CI output) and purge retained copies.",
      "Backfill security_audit_events with scope of impacted calls.",
    ],
    recoverySteps: [
      "Issue new scoped keys using least privilege defaults.",
      "Validate all dependent integrations in read-only mode before full enablement.",
    ],
    communicationSteps: [
      "Open P1 incident channel with security + platform on-call.",
      "Notify impacted stakeholders within one hour with blast radius summary.",
    ],
  },
  {
    key: "account_takeover",
    name: "Account takeover response",
    declarationThresholdMinutes: 10,
    evidenceSources: ["auth provider logs", "security_audit_events", "admin action timeline"],
    containmentSteps: [
      "Force password reset + revoke refresh tokens for affected account(s).",
      "Temporarily block suspicious source IP/network if confidence is high.",
      "Disable privileged role assignments pending review.",
    ],
    eradicationSteps: [
      "Identify compromised vector (phishing, credential stuffing, token theft).",
      "Close exploit path and harden affected controls.",
    ],
    recoverySteps: [
      "Restore least-privilege access and confirm MFA enrollment.",
      "Monitor auth anomalies for 72 hours after account restoration.",
    ],
    communicationSteps: [
      "Notify account owner and security lead immediately.",
      "Issue post-incident summary including unauthorized actions performed.",
    ],
  },
  {
    key: "service_role_exposure",
    name: "Service-role exposure response",
    declarationThresholdMinutes: 5,
    evidenceSources: ["CI/CD secret manager logs", "security_alerts", "security_audit_events"],
    containmentSteps: [
      "Trigger break-glass process and rotate service-role key immediately.",
      "Suspend non-essential edge-function deployments until rotation complete.",
      "Invalidate existing JWT signing keys if data writes are suspected.",
    ],
    eradicationSteps: [
      "Purge key material from code, artifacts, and messaging history.",
      "Confirm no additional broad-scope keys are exposed in adjacent systems.",
    ],
    recoverySteps: [
      "Restore service with newly scoped key and monitored canary traffic.",
      "Run targeted data integrity checks on privileged tables.",
    ],
    communicationSteps: [
      "Declare executive-visible security incident.",
      "File compliance notifications based on jurisdictional requirements.",
    ],
  },
  {
    key: "data_exfiltration",
    name: "Data exfiltration response",
    declarationThresholdMinutes: 10,
    evidenceSources: ["database audit trails", "egress monitoring", "security_audit_events", "DLP alerts"],
    containmentSteps: [
      "Isolate affected credentials and disable suspicious data export paths.",
      "Apply temporary row-level lockdown for sensitive domains.",
      "Capture forensic snapshot of implicated systems.",
    ],
    eradicationSteps: [
      "Patch control gaps enabling exfiltration.",
      "Confirm attacker persistence has been removed.",
    ],
    recoverySteps: [
      "Re-enable data access progressively with enhanced monitoring.",
      "Validate legal hold and preservation requirements before cleanup.",
    ],
    communicationSteps: [
      "Engage legal, privacy, and customer communications workflows.",
      "Issue required breach notifications within statutory windows.",
    ],
  },
];

export type SecurityActivity = {
  key: "quarterly_threat_modeling" | "quarterly_dependency_sast_review" | "annual_external_pen_test" | "remediation_sla_tracking";
  cadence: "quarterly" | "annual" | "continuous";
  owner: string;
  slaDays?: number;
  evidenceArtifact: string;
};

export const SECURITY_ACTIVITY_SCHEDULE: SecurityActivity[] = [
  {
    key: "quarterly_threat_modeling",
    cadence: "quarterly",
    owner: "Security Architecture",
    evidenceArtifact: "docs/security/threat-modeling/<yyyy-q#>.md",
  },
  {
    key: "quarterly_dependency_sast_review",
    cadence: "quarterly",
    owner: "AppSec",
    evidenceArtifact: "docs/security/dependency-audit-triage.md",
  },
  {
    key: "annual_external_pen_test",
    cadence: "annual",
    owner: "Security Engineering",
    evidenceArtifact: "docs/security/external-pen-test/<yyyy>.md",
  },
  {
    key: "remediation_sla_tracking",
    cadence: "continuous",
    owner: "Engineering Managers",
    slaDays: 30,
    evidenceArtifact: "docs/security/remediation-sla-ledger.md",
  },
];

export const SECRET_POLICY = {
  prohibited: ["hardcoded secrets", "shared unscoped service keys", "long-lived break-glass keys"],
  controls: {
    scopedKeys: "Every key must map to a minimal privilege role and single workload.",
    rotationCadence: "Standard keys rotate every 90 days; break-glass keys rotate after each use and every 30 days minimum.",
    breakGlass: "Break-glass requires incident ticket, dual approval, and mandatory post-use rotation audit.",
  },
};
