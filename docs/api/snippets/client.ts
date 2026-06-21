// Drop-in TypeScript client for talking to Classic Visions api-v1 from any
// external app (Deno, Node 20+, browsers via a server proxy, etc.).
//
// See ../external-sync-guide.md for the full contract.
//
// Usage:
//   const cv = makeClient({
//     baseUrl: "https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/api-v1",
//     apiKey:  process.env.OPTILENS_API_KEY!,
//   });
//   const list = await cv.list("catalog_live", { limit: 50, order: "updated_at.desc" });
//   await cv.patch("lenses", "<id>", { base_price: 14.0 });

export type ClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
};

export type ListQuery = {
  limit?: number;          // default 50, max 500
  offset?: number;
  order?: string;          // "col.asc" | "col.desc"
};

export type ListResponse<T> = { data: T[]; count: number; limit: number; offset: number };
export type SingleResponse<T> = { data: T };

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, msg: string) { super(msg); }
}

export function makeClient(opts: ClientOptions) {
  const f = opts.fetchImpl ?? fetch;
  const headers = (hasBody: boolean) => ({
    "x-api-key": opts.apiKey,
    ...(hasBody ? { "content-type": "application/json" } : {}),
  });

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await f(`${opts.baseUrl}${path}`, {
      method,
      headers: headers(body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    if (!res.ok) {
      const msg = (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>))
        ? String((parsed as { error: unknown }).error)
        : res.statusText;
      throw new ApiError(res.status, parsed, `${method} ${path} → ${res.status}: ${msg}`);
    }
    return parsed as T;
  }

  function qs(q: ListQuery = {}): string {
    const p = new URLSearchParams();
    if (q.limit != null)  p.set("limit",  String(q.limit));
    if (q.offset != null) p.set("offset", String(q.offset));
    if (q.order)          p.set("order",  q.order);
    const s = p.toString();
    return s ? `?${s}` : "";
  }

  return {
    list<T = Record<string, unknown>>(resource: string, q?: ListQuery) {
      return call<ListResponse<T>>("GET", `/${resource}${qs(q)}`);
    },
    get<T = Record<string, unknown>>(resource: string, id: string | number) {
      return call<SingleResponse<T>>("GET", `/${resource}/${id}`);
    },
    create<T = Record<string, unknown>>(resource: string, row: Record<string, unknown>) {
      return call<SingleResponse<T>>("POST", `/${resource}`, row);
    },
    patch<T = Record<string, unknown>>(resource: string, id: string | number, patch: Record<string, unknown>) {
      return call<SingleResponse<T>>("PATCH", `/${resource}/${id}`, patch);
    },
    softDelete(resource: string, id: string | number) {
      return call<SingleResponse<Record<string, unknown>>>("PATCH", `/${resource}/${id}`, { is_active: false });
    },
  };
}
