Doc-Symmetry-Override: true
Rationale: This Rx order change is local source work awaiting release approval. The generated release ledger marks new changelog entries as production releases and increments the app version, so release artifacts must wait for the authorized publish. User help, runtime docs, bug notes, and agent context are updated here.


Update 2026-10-01 (Phase 1a): the new `src/features/rx-order/domain/` modules (parse, normalise, validate, catalog, price, payload, schema) and their characterisation tests are not wired into any screen yet — the form still runs on the existing engine — so there is nothing user-visible to document. Their behaviour is recorded in `src/features/rx-order/CONTEXT.md` and `STATUS.md`; release notes and help follow when the React form ships.

Update 2026-10-01 (Phase 1b): the React form (`src/features/rx-order/form/`) is reachable only from the admin test bench (`/admin/orders/rx-test`, behind a Form switch) and the dev bench; customers still cannot open any Rx form. Nothing user-facing changes until it replaces the previous form, at which point release notes and help are written.
