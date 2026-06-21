#!/usr/bin/env bash
# Worked curl examples against api-v1. Set BASE and KEY first.
#
#   export BASE="https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/api-v1"
#   export KEY="<your api key>"

set -euo pipefail

: "${BASE:?set BASE}"
: "${KEY:?set KEY}"

H_AUTH=(-H "x-api-key: $KEY")
H_JSON=(-H "content-type: application/json")

echo "--- API root (lists resources) ---"
curl -sS "${H_AUTH[@]}" "$BASE/" | head -c 400; echo

echo "--- Swagger UI is at $BASE/docs ---"
echo "--- OpenAPI spec is at $BASE/openapi.json ---"

echo "--- Unified product list (10 newest by update) ---"
curl -sS "${H_AUTH[@]}" "$BASE/catalog_live?limit=10&order=updated_at.desc"

echo
echo "--- List suppliers (reference data) ---"
curl -sS "${H_AUTH[@]}" "$BASE/suppliers?limit=20&order=name.asc"

echo
echo "--- Create a lens (replace ids with real ones) ---"
# curl -sS -X POST "${H_AUTH[@]}" "${H_JSON[@]}" \
#   -d '{
#     "sku": "CV-1.60-AR-DEMO",
#     "name": "Demo 1.60 AR",
#     "base_price": 12.5,
#     "supplier_id": "00000000-0000-0000-0000-000000000000",
#     "material_id": "00000000-0000-0000-0000-000000000000",
#     "lenstype_id": "00000000-0000-0000-0000-000000000000",
#     "mftype_id":  "00000000-0000-0000-0000-000000000000",
#     "web_enabled": true,
#     "show_in_ws_pricelist": true,
#     "is_active": true
#   }' \
#   "$BASE/lenses"

echo "--- Update a price ---"
# curl -sS -X PATCH "${H_AUTH[@]}" "${H_JSON[@]}" \
#   -d '{"base_price": 13.25}' \
#   "$BASE/lenses/<id>"

echo "--- Soft-delete ---"
# curl -sS -X PATCH "${H_AUTH[@]}" "${H_JSON[@]}" \
#   -d '{"is_active": false}' \
#   "$BASE/lenses/<id>"
