# Lockfile Refresh Instructions

This repository uses a strict single-lockfile policy with **npm as the source of truth**:

- **Required lockfile:** `package-lock.json`
- **Forbidden lockfile:** `bun.lockb`
- **Required installer:** `npm ci`
- **Canonical build check:** `npm run build`
- **Supported CI runtimes:** Node `20.x` and `22.x`

## When to refresh lock state

Refresh `package-lock.json` whenever dependencies in `package.json` change.

## Refresh workflow

Run from repository root:

```bash
rm -rf node_modules bun.lockb
npm install
npm ci
npm run build
```

- `npm install` updates `package-lock.json` to match dependency manifest changes.
- `npm ci` is the required install command for deterministic local + CI installs.
- `npm run build` verifies the canonical build path.
- If `bun.lockb` is present, remove it before committing.

## Guardrail (CI + PR checks)

`npm run qa:lockfiles` fails when lockfile policy is violated (missing `package-lock.json` or present `bun.lockb`).

## Expected outcome

- `package-lock.json` fully represents dependency resolution for automation.
- `bun.lockb` is absent from the repository.
- `npm ci` and `npm run build` pass consistently under the supported Node LTS majors.
