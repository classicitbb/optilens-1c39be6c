export type AutomaticOrderKind = "rx" | "stock";
export const isAutomaticDispatchAction = (action: string) => action === "send" || action === "auto-dispatch";
/** A batch sends each eligible row once. Failed or ambiguous sends are recorded,
 * never retried here; the outbox claim determines whether another worker may send. */
export async function dispatchAutomaticBatch(
  load: (kind: AutomaticOrderKind) => Promise<string[]>,
  send: (kind: AutomaticOrderKind, id: string) => Promise<number>,
) {
  const candidates = await Promise.all((["rx", "stock"] as const).map(async (kind) =>
    (await load(kind)).slice(0, 2).map((id) => ({ kind, id })),
  ));
  return Promise.all(candidates.flat().map(async ({ kind, id }) => ({ kind, id, status: await send(kind, id) })));
}
