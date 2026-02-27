# Lockfile Refresh Instructions (after removing `@tiptap/extension-mention`)

This repo had install/build failures because `@tiptap/extension-mention` pulled `@tiptap/suggestion`, which is blocked in some environments.

## What changed
- Removed `@tiptap/extension-mention` from `package.json` because it is not currently imported in `src/`.

## How to refresh lockfile
Run these commands from repo root:

```bash
rm -rf node_modules
npm install
```

Then verify:

```bash
npm run build
```

## If your environment still blocks npm registry access
Use one of these:
1. Configure your npm proxy/allowlist for required scoped packages.
2. Use your organization's approved internal registry mirror.
3. If your team standard is Bun, regenerate lock state via Bun and align CI accordingly.

## Expected outcome
- `node_modules/.bin/vite` is restored.
- `npm run build` and `npm run dev` can execute in environments with registry access.
