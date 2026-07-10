// OpenAPI 3.1 spec for the Classic Visions external API (api-v1).
// Served publicly at GET /functions/v1/api-v1/openapi.json.

export function buildOpenApiSpec(serverUrl: string) {
  const resources = [
    { name: "catalog", description: "Price catalog rows. Writes are routed into the calling key's draft pricelist version (never the live catalog)." },
    { name: "contacts", description: "CRM contacts." },
    { name: "customers", description: "Customer accounts." },
    { name: "orders", description: "Customer orders." },
    { name: "lenses", description: "Lens products. Cost fields (base_price, cost) are stripped from all responses." },
    { name: "supplies", description: "Supply products. Cost fields (base_price, cost) are stripped from all responses." },
    { name: "addons", description: "Lens add-ons. Cost field is stripped from all responses." },
    { name: "moonshot_rocks", description: "Moonshot quarterly rocks (OKRs)." },
    { name: "moonshot_todos", description: "Moonshot to-dos." },
  ];

  const paths: Record<string, any> = {};

  for (const r of resources) {
    const tag = r.name;
    paths[`/${r.name}`] = {
      get: {
        tags: [tag],
        summary: `List ${r.name}`,
        description: r.description,
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 500 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          { name: "order", in: "query", schema: { type: "string", default: "created_at.desc" }, description: "Format: column.asc or column.desc" },
        ],
        responses: {
          "200": {
            description: "List response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { type: "object", additionalProperties: true } },
                    count: { type: "integer", nullable: true },
                    limit: { type: "integer" },
                    offset: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: [tag],
        summary: `Create ${r.name}`,
        description: r.name === "catalog"
          ? "Inserts a row into the API key's draft pricelist version. Repeated calls reuse the same draft until it is published."
          : `Insert a new ${r.name} row.`,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", additionalProperties: true },
            },
          },
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "object", additionalProperties: true },
                    ...(r.name === "catalog" ? { draft_pricelist_version_id: { type: "string", format: "uuid" } } : {}),
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    };

    paths[`/${r.name}/{id}`] = {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: {
        tags: [tag],
        summary: `Get ${r.name} by id`,
        responses: {
          "200": {
            description: "Single record",
            content: {
              "application/json": {
                schema: { type: "object", properties: { data: { type: "object", additionalProperties: true } } },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      patch: {
        tags: [tag],
        summary: `Update ${r.name}`,
        description: r.name === "catalog"
          ? "Updates a row only if it belongs to this key's draft pricelist version."
          : `Update fields on a ${r.name} row.`,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", additionalProperties: true },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated",
            content: {
              "application/json": {
                schema: { type: "object", properties: { data: { type: "object", additionalProperties: true } } },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    };
  }

  const errorSchema = {
    type: "object",
    properties: { error: { type: "string" }, detail: { type: "string" } },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Classic Visions API",
      version: "1.0.0",
      description:
        "External REST API for the Classic Visions / OptiLens platform. Auth via per-integration API keys sent in the `x-api-key` header. Cost fields are never returned for product resources. Catalog writes are routed into a per-key draft pricelist version and never touch the live catalog.",
    },
    servers: [{ url: serverUrl }],
    security: [{ ApiKeyAuth: [] }],
    tags: resources.map((r) => ({ name: r.name, description: r.description })),
    paths,
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
      },
      responses: {
        BadRequest: { description: "Invalid request", content: { "application/json": { schema: errorSchema } } },
        Unauthorized: { description: "Missing or invalid API key", content: { "application/json": { schema: errorSchema } } },
        Forbidden: { description: "Key lacks the required scope", content: { "application/json": { schema: errorSchema } } },
        NotFound: { description: "Resource not found", content: { "application/json": { schema: errorSchema } } },
      },
    },
  };
}

export const SWAGGER_UI_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Classic Visions API — Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>body{margin:0;background:#fafafa}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.addEventListener('load', () => {
      window.ui = SwaggerUIBundle({
        url: './openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    });
  </script>
</body>
</html>`;
