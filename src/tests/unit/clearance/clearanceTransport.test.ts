import {beforeEach,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{rpc:mocks.rpc}}));
import {callCatalogue} from "@/features/clearance/transport";
beforeEach(()=>mocks.rpc.mockReset());
it("reads only through the capability RPC",async()=>{
  mocks.rpc.mockResolvedValue({data:{items:[]},error:null});
  await callCatalogue({action:"read",token:"test-link"});
  expect(mocks.rpc).toHaveBeenCalledWith("clearance_read",{p_token:"test-link"});
});
it("normalizes family tuples for admin visibility without losing commas in names",async()=>{
  const tuple=["CR39","Maker","Regular","Gray, SRC","Single Vision"];
  mocks.rpc.mockResolvedValue({data:{snapshot:{items:[]},disabled:[tuple]},error:null});
  const result=await callCatalogue({action:"admin-list",token:"test-link"});
  expect((result.data as {disabled:string[]}).disabled).toEqual([JSON.stringify(tuple)]);
  mocks.rpc.mockResolvedValue({data:{ok:true},error:null});
  await callCatalogue({action:"set-visibility",token:"test-link",familyKey:JSON.stringify(tuple),disabled:true});
  expect(mocks.rpc).toHaveBeenLastCalledWith("clearance_manage",{p_token:"test-link",p_action:"set-visibility",p_family_key:tuple,p_disabled:true});
});
