# Lockfile Refresh Instructions

This repository uses a single automation lockfile strategy:

- **Canonical lockfile:** `package-lock.json`
- **Canonical installer:** `npm ci`
- **Canonical build check:** `npm run build`
- **Canonical CI runtime:** Node 20 (`actions/setup-node`)

## When to refresh lock state

Refresh `package-lock.json` whenever dependencies in `package.json` change.

## Refresh workflow

Run from repository root:

```bash
rm -rf node_modules
npm install
npm ci
npm run build
```

- `npm install` updates `package-lock.json` to match dependency manifest changes.
- `npm ci` validates that the lockfile is consistent and reproducible.
- `npm run build` verifies the canonical build path.

## Bun note (local-only)

Bun can be used for local experimentation, but Bun lock state is **not** used for CI/Lovable automation. Do not rely on Bun lockfiles for reproducible CI installs.

## Expected outcome

- `package-lock.json` fully represents dependency resolution for automation.
- `npm ci` and `npm run build` pass consistently under Node 20.
