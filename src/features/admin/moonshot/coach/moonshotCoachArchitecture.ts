export type MoonshotCoachSource =
  | "moonshot_meetings"
  | "moonshot_issues"
  | "moonshot_rocks"
  | "moonshot_scorecards"
  | "moonshot_business_plan"
  | "moonshot_strategic_notes"
  | "moonshot_org_chart"
  | "moonshot_one_on_ones"
  | "moonshot_right_person_right_seat";

export type MoonshotCoachModuleId =
  | "moonshot_coach_ui"
  | "moonshot_coach_orchestration"
  | "moonshot_coach_intent"
  | "moonshot_coach_retrieval"
  | "moonshot_coach_policy"
  | "moonshot_coach_attribution"
  | "moonshot_coach_analytics";

export interface MoonshotCoachModuleBoundary {
  id: MoonshotCoachModuleId;
  owner: "client" | "server";
  responsibility: string;
  inputs: string[];
  outputs: string[];
}

export interface MoonshotCoachArchitecture {
  productBoundary: string;
  workspaceBoundary: string;
  navigationScope: string[];
  permissionScope: string[];
  retrievalSources: MoonshotCoachSource[];
  retrievalPolicies: string[];
  analyticsBoundaries: string[];
  guardrails: string[];
  moduleBoundaries: MoonshotCoachModuleBoundary[];
}

export const MOONSHOT_COACH_ARCHITECTURE: MoonshotCoachArchitecture = {
  productBoundary:
    "Moonshot coaching runs as a leadership-and-management product boundary, separate from customer, support, pricing, and operations assistants.",
  workspaceBoundary:
    "Coach context is restricted to Moonshot workspace artifacts and Moonshot route surfaces under /admin/moonshot.",
  navigationScope: [
    "/admin/moonshot/dashboard",
    "/admin/moonshot/workspace",
    "/admin/moonshot/meetings",
    "/admin/moonshot/scorecards",
    "/admin/moonshot/rocks",
    "/admin/moonshot/issues",
    "/admin/moonshot/business-plan",
    "/admin/moonshot/tools",
    "/admin/moonshot/tools/org-chart",
    "/admin/moonshot/tools/one-on-ones",
    "/admin/moonshot/tools/right-person-right-seat",
  ],
  permissionScope: [
    "Use Moonshot leadership permissions only.",
    "Do not inherit CRM, helpdesk, pricing, or operations permissions.",
    "Block retrieval when user cannot view the requested Moonshot artifact.",
  ],
  retrievalSources: [
    "moonshot_meetings",
    "moonshot_issues",
    "moonshot_rocks",
    "moonshot_scorecards",
    "moonshot_business_plan",
    "moonshot_strategic_notes",
    "moonshot_org_chart",
    "moonshot_one_on_ones",
    "moonshot_right_person_right_seat",
  ],
  retrievalPolicies: [
    "Never retrieve from customer, support, pricing, CRM, or operational corpora.",
    "Rank evidence by meeting recency, issue ownership, and rock/scorecard status impact, with org-seat and 1:1 context when people-management coaching is requested.",
    "Return source-linked excerpts so coaching guidance is always attributable.",
  ],
  analyticsBoundaries: [
    "Track Moonshot coach usage in a dedicated analytics namespace.",
    "Do not mix Moonshot coaching telemetry with leads, helpdesk, or commerce funnels.",
    "Report leadership coaching outcomes (decision velocity, issue closure cadence, rock completion confidence) separately.",
  ],
  guardrails: [
    "All model and retrieval calls execute in server modules only.",
    "Responses must cite Moonshot-only evidence before recommendations are returned.",
    "Policy validation failure blocks coaching output and returns a safe escalation message.",
    "Shared infrastructure patterns are allowed, but data access policies remain Moonshot-specific.",
  ],
  moduleBoundaries: [
    {
      id: "moonshot_coach_ui",
      owner: "client",
      responsibility: "Render Moonshot coach within Moonshot shell surfaces and send scoped user queries.",
      inputs: ["moonshot session context", "coach response dto"],
      outputs: ["coach query event", "ui feedback event"],
    },
    {
      id: "moonshot_coach_orchestration",
      owner: "server",
      responsibility: "Coordinate intent, retrieval, policy, attribution, and analytics for each coaching turn.",
      inputs: ["coach query", "moonshot auth context"],
      outputs: ["coach answer", "answer mode", "analytics payload"],
    },
    {
      id: "moonshot_coach_intent",
      owner: "server",
      responsibility: "Classify leadership and management intents such as meeting prep, blocker coaching, and priority alignment.",
      inputs: ["normalized query", "moonshot role context"],
      outputs: ["intent family", "confidence"],
    },
    {
      id: "moonshot_coach_retrieval",
      owner: "server",
      responsibility: "Retrieve ranked evidence only from Moonshot sources with strict corpus allow-listing.",
      inputs: ["intent", "query", "moonshot permissions"],
      outputs: ["ranked moonshot snippets", "coverage score"],
    },
    {
      id: "moonshot_coach_policy",
      owner: "server",
      responsibility: "Apply Moonshot-specific policy checks and block out-of-scope responses.",
      inputs: ["retrieval result", "intent confidence", "authorization"],
      outputs: ["policy verdict", "approved answer plan"],
    },
    {
      id: "moonshot_coach_attribution",
      owner: "server",
      responsibility: "Attach Moonshot evidence citations in deterministic precedence order.",
      inputs: ["answer plan", "retrieved snippets"],
      outputs: ["citation bundle", "source summary"],
    },
    {
      id: "moonshot_coach_analytics",
      owner: "server",
      responsibility: "Record Moonshot-only coaching quality, adoption, and outcome telemetry.",
      inputs: ["answer mode", "response latency", "feedback"],
      outputs: ["moonshot analytics events"],
    },
  ],
};
