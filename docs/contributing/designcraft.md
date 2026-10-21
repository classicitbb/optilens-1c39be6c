# DesignCraft integration

DesignCraft (`C:\Program Files\DesignCraft\`) is a local page-layout app with a headless CLI. We use it to produce print-ready and shareable files (PDF, HTML, PPTX, EPUB, IDML) from `.designcraft`, IDML, or InDesign files.

All connections go through `scripts/designcraft.mjs`, which finds the CLI (override with `DESIGNCRAFT_CLI`).

| Connection | How | Notes |
|---|---|---|
| Health check | `npm run designcraft:doctor` | CLI version, roots, app port |
| One-shot export | `npm run designcraft -- export <file\|--sample> <print\|share> [out.pdf\|html\|pptx\|epub\|idml]` | Default output `output/designcraft/<name>-<preset>.pdf` (git-ignored) |
| MCP server (agents) | `.mcp.json` entry `designcraft`; `npm run designcraft:mcp` | Headless, confined: reads the repo, writes only `output/designcraft/` |
| Live app control | set `DESIGNCRAFT_APP_PORT`, then MCP and `app` use `--connect` | Needs the DesignCraft app open; roots do not apply |
| Raw CLI | `npm run designcraft -- <run\|script\|commands\|describe\|app\|...>` | Passed straight to `designcraft-cli` |

Presets: `print` = crop/bleed marks + bleed + PDF/X-4; `share` = compressed images + tagged (accessible) PDF. Preset options apply to PDF only.

Env: `DESIGNCRAFT_CLI`, `DESIGNCRAFT_READ_ROOT`, `DESIGNCRAFT_WRITE_ROOT`, `DESIGNCRAFT_APP_PORT`.

Discover commands: `npm run designcraft -- commands export` and `... describe file.exportPdf`.
