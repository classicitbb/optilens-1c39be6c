# Runtime error logging (toast + browser errors)

This project now captures lightweight runtime failures in a one-line format so QA and Codex can quickly spot regressions.

## What gets logged

- Destructive/error toasts emitted via `useToast`.
- Unhandled browser errors (`window.error`).
- Unhandled promise rejections (`window.unhandledrejection`).

Each log entry includes:

- `timestamp`
- `source`
- `title`
- `detail` (if available)
- `route`

## Where logs are stored

- Browser `localStorage` key: `optilens.runtime_error_log`
- Maximum retained entries: `100`

## Where to view logs in Admin

- Open: `/admin/settings/runtime-errors`
- Use **Refresh** to pull latest entries from local storage.
- Use **Clear log** to remove entries.

## One-line console output for automation

Each captured runtime issue also writes to console as:

```text
[runtime-error] <ISO timestamp> | <source> | <title> | <detail> | <route>
```

This allows automated browser test runs to scrape failures quickly.

## Important note on “self-fixing by Codex”

Codex can only fix issues after being run against collected logs (or CI artifacts). This logging pipeline enables that loop by making runtime failures structured and easy to ingest.
