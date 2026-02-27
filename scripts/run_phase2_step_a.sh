#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Set DATABASE_URL to your Supabase Postgres connection string, then re-run."
  exit 1
fi

echo "Applying Phase 2 migration..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260226190000_phase2_database_foundation.sql

echo "Running Step A verification queries..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/phase2_step_a_verify.sql

echo "Step A complete."
