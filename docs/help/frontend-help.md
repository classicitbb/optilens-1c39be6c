# Frontend Help Docs

Support-facing notes for the frontend runtime.

## 2026-04-13 — LED PRO page and admin support notes

- New customer-facing page: `LED PRO` at `/lenses/led-pro`.
- If a user asks where to find LED PRO content, direct them through the Lifestyle Lenses menu, the lens design guide, or search for `LED PRO` on the public site.
- If LED PRO route checks fail in CI, verify both the registry entry `public.lenses.led-pro` and the runtime route declaration in `src/routes/public/PublicRoutes.tsx`.
- SLA policy descriptions in admin now pass through the shared rich-text sanitizer before display; if formatting disappears, inspect the stored HTML rather than bypassing sanitization.
- PDF preview should now open from a defined 100% manual zoom baseline; if operators report unexpected scale on first load, start investigation in `src/components/admin/PdfPreviewShell.tsx`.
