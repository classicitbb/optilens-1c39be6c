# OptiLens

## Canonical environment (Lovable + CI)

To reduce non-deterministic dependency and build behavior, this repository standardizes on **Node 20 + npm** with the **npm lockfile**.

- Node: `20.x`
- npm: `10.x`
- Canonical lockfile for automation: `package-lock.json`
- Canonical install command: `npm ci`
- Canonical build command: `npm run build`

Use this flow locally and in automation:

```bash
npm ci
npm run build
```

## Local development

```bash
npm ci
npm run dev
```

## Bun usage

Bun is supported as an **optional local-only workflow** for individual developers. CI and Lovable do not use Bun for install/build validation, and Bun lock state is not part of the canonical automation path.

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
