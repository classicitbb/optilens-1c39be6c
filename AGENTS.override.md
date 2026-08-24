# Agent Continuity Entry Point

Read these files before working:

1. `AGENTS.md` — existing project-specific engineering rules.
2. `STATUS.md` — current work, known failures, and protected areas.
3. `docs/agent/PROJECT_KNOWLEDGE.md` — durable architecture and commands.
4. `docs/agent/INTEGRATIONS.md` — service and cross-repository boundaries.
5. `docs/agent/HANDOFF.md` — exact continuation state.

Update the context files in the same change whenever work reveals a material command, environment-variable **name**, service, connector, data source, constraint, or architectural decision. Never store values, credentials, private infrastructure identifiers, or access instructions in Git.

If work is incomplete, update `HANDOFF.md` with current state, affected files, tests run, failure/blocker, approval required, and one exact executable next action. If complete, remove stale continuation steps and set `Status: Complete — no active handoff`.

Operate autonomously for routine reversible repository work. Verify connectors with a harmless read before use. Pause for production deployment, destructive operations, production data writes, credential/permission changes, authentication or authorization changes, billing, public publishing, or access outside the task.
