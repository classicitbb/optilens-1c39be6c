# OptiLens

## Canonical environment (Lovable + CI)

To reduce non-deterministic dependency and build behavior, this repository standardizes on **npm** with the **npm lockfile** and uses **Node 20** as the canonical CI runtime.

- Canonical CI Node: `20.x` (pinned in `.nvmrc`)
- Supported local/runtime Node majors: `20.x` and `22.x`
- npm: `10.x`
- Canonical lockfile for automation: `package-lock.json`
- Canonical install command: `npm ci`
- Canonical build command: `npm run build`
- Runtime guard: `preinstall` runs `scripts/check-runtime.mjs` and exits with a clear error when Node/npm are out of range

Use this required flow locally and in automation:

```bash
nvm use
npm ci
npm run build
```

If you are running in a Lovable/container environment that already provides Node 22, keep npm on `10.x`. CI still validates the repository on Node 20.


## Proxy-safe npm wrapper

Some container/CI environments inject a deprecated `npm_config_http_proxy` variable that causes this warning on every npm command:

```
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
```

Use `./scripts/npm-clean.sh` to run npm without that deprecated env var while preserving proxy support:

```bash
./scripts/npm-clean.sh ci
./scripts/npm-clean.sh run build
```

CI workflows in this repo use the wrapper by default.

## Local development

```bash
nvm use
npm ci
npm run dev
```

## Lockfile policy

This repository uses **npm as the single source of truth** for dependency resolution.

- Keep `package-lock.json` committed.
- Do not add `bun.lockb`.
- Run `npm ci` for all local/CI installs.

## How can I edit this code?

There are several ways of editing your application.

### Use Lovable

Visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

### Edit a file directly in GitHub

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

### Use GitHub Codespaces

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes. To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
