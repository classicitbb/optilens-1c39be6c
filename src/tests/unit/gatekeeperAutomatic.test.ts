import { describe, expect, it, vi } from "vitest";
import { dispatchAutomaticBatch, isAutomaticDispatchAction } from "../../../supabase/functions/_shared/gatekeeperAutoDispatch";
describe("automatic Gatekeeper delivery", () => {
  it("restricts the worker token to dispatch and send, never settings, credentials or status-pull", () => {
    expect(["auto-dispatch","send"].every(isAutomaticDispatchAction)).toBe(true);
    for (const action of ["connect","refresh-contracts","preview","pull-statuses",""]) expect(isAutomaticDispatchAction(action)).toBe(false);
  });
  it("bounds both queues and never replays rejected or ambiguous deliveries", async () => {
    const load=vi.fn(async (kind: string) => kind==="rx" ? ["r1","r2","r3"] : ["s1"]);
    const send=vi.fn(async (_kind: string,id: string) => id==="r1" ? 502 : id==="r2" ? 409 : 200);
    const outcomes=await dispatchAutomaticBatch(load,send);
    expect(outcomes).toEqual([{kind:"rx",id:"r1",status:502},{kind:"rx",id:"r2",status:409},{kind:"stock",id:"s1",status:200}]);
    expect(send).toHaveBeenCalledTimes(3);
    expect(send).not.toHaveBeenCalledWith("rx","r3");
  });
});
