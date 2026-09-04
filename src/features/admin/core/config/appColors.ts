/** Accent colour per admin app / shortcut, shared by the launcher and the dashboard tiles. */
export const APP_COLORS: Record<string, string> = {
  launchpad: "hsl(172 72% 40%)",
  copilot: "hsl(188 78% 42%)",
  pricing: "hsl(215 65% 50%)",
  contacts: "hsl(168 76% 42%)",
  leads: "hsl(38 92% 50%)",
  crm: "hsl(280 60% 55%)",
  helpdesk: "hsl(14 85% 55%)",
  website: "hsl(200 60% 50%)",
  docstudio: "hsl(250 55% 58%)",
  knowledge: "hsl(140 50% 45%)",
  settings: "hsl(215 15% 50%)",
  activities: "hsl(280 60% 55%)",
  "rx-order": "hsl(200 60% 50%)",
  "stock-order": "hsl(24 80% 52%)",
  "home-page": "hsl(172 72% 40%)",
};

export const appColor = (key: string) => APP_COLORS[key] ?? "hsl(215 15% 50%)";
