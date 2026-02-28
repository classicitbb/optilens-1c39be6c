import type { OdooPartner } from "./types.ts";

type RpcMode = "xmlrpc" | "jsonrpc";

type OdooClientOptions = {
  baseUrl: string;
  db: string;
  username: string;
  passwordOrToken: string;
  rpcMode?: RpcMode;
};

export class OdooClient {
  private readonly baseUrl: string;
  private readonly db: string;
  private readonly username: string;
  private readonly passwordOrToken: string;
  private readonly rpcMode: RpcMode;
  private uid: number | null = null;

  constructor(options: OdooClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.db = options.db;
    this.username = options.username;
    this.passwordOrToken = options.passwordOrToken;
    this.rpcMode = options.rpcMode ?? "jsonrpc";
  }

  private async jsonRpc(service: string, method: string, args: unknown[]): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: Date.now() }),
    });
    if (!response.ok) throw new Error(`JSON-RPC HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error?.data?.message ?? payload.error?.message ?? "JSON-RPC error");
    return payload.result;
  }

  private async xmlAuthenticate(): Promise<number> {
    const body = `<?xml version="1.0"?><methodCall><methodName>authenticate</methodName><params>
      <param><value><string>${this.db}</string></value></param>
      <param><value><string>${this.username}</string></value></param>
      <param><value><string>${this.passwordOrToken}</string></value></param>
      <param><value><struct></struct></value></param>
    </params></methodCall>`;

    const response = await fetch(`${this.baseUrl}/xmlrpc/2/common`, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body,
    });
    const xml = await response.text();
    const intResult = xml.match(/<(?:int|i4)>(-?\d+)<\/(?:int|i4)>/);
    if (!intResult) throw new Error("Failed XML-RPC authentication");
    return Number(intResult[1]);
  }

  async authenticate(): Promise<number> {
    if (this.uid) return this.uid;
    this.uid = this.rpcMode === "xmlrpc"
      ? await this.xmlAuthenticate()
      : Number(await this.jsonRpc("common", "login", [this.db, this.username, this.passwordOrToken]));

    if (!this.uid) throw new Error("Failed to authenticate with Odoo");
    return this.uid;
  }

  private async executeKw<T>(model: string, method: string, positionalArgs: unknown[], keywordArgs?: Record<string, unknown>): Promise<T> {
    const uid = await this.authenticate();
    const result = await this.jsonRpc("object", "execute_kw", [
      this.db,
      uid,
      this.passwordOrToken,
      model,
      method,
      positionalArgs,
      keywordArgs ?? {},
    ]);
    return result as T;
  }

  async searchReadPartners(writeDateGt: string | null, limit: number): Promise<OdooPartner[]> {
    const domain = writeDateGt ? [["write_date", ">", writeDateGt]] : [];
    return this.executeKw<OdooPartner[]>("res.partner", "search_read", [domain], {
      fields: ["id", "write_date", "name", "is_company", "parent_id", "type", "email", "phone", "mobile", "website", "street", "street2", "city", "state_id", "zip", "country_id", "vat", "active"],
      order: "write_date asc,id asc",
      limit,
    });
  }

  async createPartner(values: Record<string, unknown>): Promise<number> {
    return this.executeKw<number>("res.partner", "create", [values]);
  }

  async writePartner(partnerId: number, values: Record<string, unknown>): Promise<boolean> {
    return this.executeKw<boolean>("res.partner", "write", [[partnerId], values]);
  }
}
