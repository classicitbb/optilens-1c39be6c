# Rich content formatting for assistant/copilot responses

Make AI responses render markdown tables, code blocks, lists, and inline formatting properly instead of showing raw pipe/text. The selected prescription transcription on `/copilot` is a markdown table that currently renders as plain text because `react-markdown` is used without `remark-gfm`.

## What changes

1. Create a shared `RichMarkdown` renderer
   - Path: `src/components/content/RichMarkdown.tsx`
   - Wraps `react-markdown` with `remark-gfm` (tables, strikethrough, task lists, autolinks)
   - Adds consistent prose styling for headings, paragraphs, lists, tables, blockquotes, inline code, and fenced code blocks
   - Uses the app’s 0px-radius design tokens (no hardcoded colors)
   - Supports `tone="assistant" | "user"` like the current CopilotMarkdown

2. Replace standalone markdown usage
   - Update `src/features/admin/copilot/CopilotMarkdown.tsx` to delegate to `RichMarkdown`, preserving its current tone/classes
   - Update `src/components/assistant/CompanionAssistant.tsx` to use `RichMarkdown` for `message.kind === "text"` and `result.answer`
   - Update `src/features/admin/helpdesk/components/TicketMessageBubble.tsx` and `TicketOpeningMessage.tsx` to use `RichMarkdown`
   - Leave `src/pages/RepoHealth.tsx` on plain `ReactMarkdown` (it renders repo docs, not assistant responses)

3. Backend prompt consistency
   - In `supabase/functions/portal-copilot/prompts.ts` and `supabase/functions/companion-assistant/index.ts`, ensure the system prompt asks for markdown formatting when returning structured data (tables, code, lists) without inventing prices or facts

4. Tests
   - Add `src/tests/unit/RichMarkdown.unit.test.tsx` verifying a markdown table renders `<table>`, fenced code renders `<pre><code>`, and inline code renders `<code>`
   - Update existing tests if imports changed

## Verification

- `npm run build` passes
- Vitest unit tests pass
- A copilot response containing a markdown table renders as an HTML table with styled cells
- Inline code and fenced code blocks render with monospace styling and dark preformatted backgrounds
