# Classic Visions MCP and ChatGPT Live

## Implementation

Version 0.5.0 extends the existing OAuth-protected Streamable HTTP server rather
than creating a second permission system. The source definition registers 28 tools.
The installed Lovable adapter uses the MCP TypeScript SDK and serves protected
resource metadata plus the MCP protocol from the existing Edge Function.

The existing tools cover CRM, products, orders, accounts, statements, quotes,
helpdesk, shipments, knowledge, website content resources and Portal Copilot.
`admin_list_resources` describes the supported registry; it is not an access grant.
Actual record access uses the caller's verified OAuth token and existing RLS.
No service-role credential is used by the MCP database client.

`review_crm_organization` reads only contact category, archive status, pipeline,
stage and customer-account link fields. It returns counts, not personal details.
The review is bounded to 500 rows by default, up to 1,000. The response distinguishes
the total visible count from reviewed rows; breakdowns cover only reviewed rows.
An empty collection may reflect row-level filtering and does not prove access.

Writes retain existing behavior: supported ordinary changes execute immediately;
deletions and price-bearing changes return approval proposals. A proposal is not
a completed change. Existing customer-facing actions use Portal Copilot approvals.
This release does not add arbitrary SQL, deployment, permission management or
unrestricted website publishing tools.

## Verified on November 20, 2026

The configured live endpoint returns HTTP 200 for protected-resource metadata
and HTTP 401 with a metadata challenge for anonymous MCP initialization. This
supersedes the historical function-not-found note. It does not establish user
sign-in, which tool version is deployed, or availability in ChatGPT.

Run `npm run mcp:check` with `MCP_SERVER_URL` set in the execution environment.
It performs anonymous metadata and initialization checks only, does not accept
tokens, and does not create business records. A pass is a transport/authentication
discovery check, not an authenticated functional test.

## Release and connection

The production deployment and authentication steps require user approval under
the repository's instructions. Source changes and generated output are local.

1. Generate the function with `npm run mcp:generate`, using the existing
   `SUPABASE_PROJECT_REF` configuration. Do not paste configuration values into docs.
2. Review the generated `supabase/functions/mcp/index.ts` and release only that
   function through the existing deployment workflow. Do not deploy unrelated
   functions or change OAuth/RLS configuration as part of this release.
3. Run `npm run qa:edge-smoke` after deployment, then `npm run mcp:check`.
4. In the host's supported plugin connection flow, use the actual existing MCP
   endpoint, complete OAuth personally, and select the plugin in the chat.
   Avoid duplicate plugin installations or repeated uninstall/reinstall attempts.
5. Verify `whoami`, then resource discovery, then `review_crm_organization`.
   Compare live tool discovery with the 28-tool source definition. Never create
   a contact, ticket, order, message or payment merely to test the connection.

## Voice behavior

OpenAI's current ChatGPT Voice guidance says Live can use plugins and connected
apps available to the account. Availability depends on account, workspace,
client and connection state. On web and mobile, approvals must be reviewed on
screen; spoken approval is not supported. A server alone cannot enable a host
feature or grant additional access. Confirm Live, tool discovery and a harmless
read in the target client before describing voice control as verified.

Examples after connection: “Review how our contacts are organized,” “Find this
customer's open orders,” and “Show the editable website content resources.”
For writes, resolve the exact record and intended fields, then report the tool's
actual result or approval proposal.

Sources checked November 20, 2026:

- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/api/docs/mcp
- https://help.openai.com/en/articles/20001274-chatgpt-voice
