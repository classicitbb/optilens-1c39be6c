import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import searchProductsTool from "./tools/search-products";
import listOrdersTool from "./tools/list-my-orders";
import getOrderTool from "./tools/get-order";
import listStatementsTool from "./tools/list-statements";
import getStatementTool from "./tools/get-statement";
import getAccountBalanceTool from "./tools/get-account-balance";
import listQuotesTool from "./tools/list-quotes";
import getQuoteTool from "./tools/get-quote";
import listSupportTicketsTool from "./tools/list-support-tickets";
import getSupportTicketTool from "./tools/get-support-ticket";
import createSupportTicketTool from "./tools/create-support-ticket";
import replyToSupportTicketTool from "./tools/reply-to-support-ticket";
import searchKnowledgeBaseTool from "./tools/search-knowledge-base";
import searchCrmTool from "./tools/search-crm";
import listCrmTasksTool from "./tools/list-crm-tasks";
import createCrmTaskTool from "./tools/create-crm-task";
import listOpportunitiesTool from "./tools/list-opportunities";
import listPricelistsTool from "./tools/list-pricelists";
import listShipmentsTool from "./tools/list-shipments";

// Build the OAuth issuer from the project ref so it stays the direct
// `supabase.co` host that JWKS discovery advertises. `VITE_SUPABASE_PROJECT_ID`
// is inlined by Vite at build time, keeping this entry import-safe (no runtime
// env read, no throw at module top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "classic-visions-mcp",
  title: "Classic Visions",
  version: "0.2.0",
  instructions: [
    "Tools for the Classic Visions optical platform (wholesale lenses, coatings and optical supplies).",
    "Every call acts as the signed-in user and row-level security decides what is visible: customers see only their own account data, staff see the wider CRM, catalog and operations data.",
    "Start with `whoami` to learn the caller's roles and linked customer accounts.",
    "Billing: `get_account_balance`, `list_statements`, `get_statement`. Orders: `list_orders`, `get_order`. Quotes: `list_quotes`, `get_quote`.",
    "Support: `list_support_tickets`, `get_support_ticket`, `create_support_ticket`, `reply_to_support_ticket`.",
    "Catalog and knowledge: `search_products`, `list_pricelists`, `search_knowledge_base`.",
    "Staff operations: `search_crm`, `list_crm_tasks`, `create_crm_task`, `list_opportunities`, `list_shipments`.",
    "Never quote or invent prices that did not come from these tools, and never promise discounts, credit terms or delivery dates.",
  ].join(" "),
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoamiTool,
    searchProductsTool,
    listOrdersTool,
    getOrderTool,
    listStatementsTool,
    getStatementTool,
    getAccountBalanceTool,
    listQuotesTool,
    getQuoteTool,
    listSupportTicketsTool,
    getSupportTicketTool,
    createSupportTicketTool,
    replyToSupportTicketTool,
    searchKnowledgeBaseTool,
    searchCrmTool,
    listCrmTasksTool,
    createCrmTaskTool,
    listOpportunitiesTool,
    listPricelistsTool,
    listShipmentsTool,
  ],
});
