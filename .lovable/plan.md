## Plan

1. Deploy `scotia-payment` and `scotia-return` edge functions via `supabase--deploy_edge_functions`. Deploy success confirms they compiled (Deno bundling runs at deploy time; a compile error fails the deploy).
2. Set the `SCOTIA_SITE_ORIGIN` function secret to `https://classicvisions.net` (the production site) using `secrets--set_secret`.
3. Report deploy status back.

## Question before proceeding

The default is `https://classicvisions.net`, but you mentioned it should match wherever you're testing (Vercel preview, staging, etc.). Should I use `https://classicvisions.net` or a different URL (e.g. a preview/staging domain)?