# Developer Workflow Help

## PR quality guardrails
Run the PR checks locally before opening a pull request:

```bash
npm run qa:pr-checks
```

## Doc symmetry guard
The doc symmetry guard validates mapped documentation changes for code updates.

### Allowed override
Use only for exceptional cases with mandatory rationale:
- Add a changed file under `docs/bugs/` with filename containing `doc-symmetry-exception` and include:
  - `Doc-Symmetry-Override: true`
  - `Rationale: <required explanation>`
- Or set PR label `docs-exception` and include `Doc-Symmetry-Rationale: ...` in PR body metadata.
