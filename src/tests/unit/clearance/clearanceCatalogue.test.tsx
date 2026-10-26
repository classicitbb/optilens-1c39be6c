import {beforeEach,describe,it,expect,vi} from "vitest";
import {render,screen,waitFor,fireEvent} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {readFileSync} from "node:fs";
import {webcrypto} from "node:crypto";
import ClearanceAdminPage from "@/features/clearance/ClearanceAdminPage";
import ClearanceCataloguePage from "@/features/clearance/ClearanceCataloguePage";
import {groupFamilies,type ClearanceItem} from "@/features/clearance/model";
import {APP_ROUTE_REGISTRY} from "@/config/routeRegistry";
import {parseSnapshot,tokenHash,visibleSnapshot,familyKey} from "../../../../supabase/functions/clearance-catalogue/contract";
import {createHandler} from "../../../../supabase/functions/clearance-catalogue/handler";
const mocks=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{functions:{invoke:mocks.invoke}}}));
const item:ClearanceItem={sku:"001",description:"Blank",name:"CR39 Maker Regular Clear",material:"CR39",manufacturer:"Maker",family:"Single Vision",design:"Regular",option:"Clear",diameter:65,base:1,addPower:-0.5,verticalAxis:"Sphere",horizontalAxis:"Cylinder",unit:"each",quantity:7,priceBbd:4.5};
const snapshot=()=>({currency:"BBD" as const,asOf:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),items:[item]});
vi.mock("@/hooks/useUserRole",()=>({useUserRole:()=>({isAdmin:false})}));
const token="x".repeat(43);
beforeEach(()=>{vi.stubGlobal("crypto",webcrypto);mocks.invoke.mockReset();mocks.invoke.mockResolvedValue({data:snapshot(),error:null});});
describe("clearance website",()=>{
  it("requires a private link and does not call the reader without one",async()=>{
    render(<MemoryRouter initialEntries={["/clearance"]}><ClearanceCataloguePage/></MemoryRouter>);
    expect(screen.getByText(/using the private catalogue link/)).toBeInTheDocument();expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("renders the supplied optical matrix and filters safely",async()=>{
    render(<MemoryRouter initialEntries={["/clearance#"+token]}><ClearanceCataloguePage/></MemoryRouter>);
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader",{name:"-0.50"})).toBeInTheDocument();
    expect(screen.getByRole("rowheader",{name:"+1.00"})).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();expect(screen.getByText("BBD 4.50")).toBeInTheDocument();
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content","noindex,nofollow");
    fireEvent.change(screen.getByRole("searchbox"),{target:{value:"unmatched"}});
    expect(screen.getByText("No lenses match this selection.")).toBeInTheDocument();
  });
  it("does not show expired or revoked snapshots",async()=>{
    mocks.invoke.mockResolvedValue({data:{...snapshot(),expiresAt:new Date(Date.now()-1000).toISOString()},error:null});
    render(<MemoryRouter initialEntries={["/clearance#"+token]}><ClearanceCataloguePage/></MemoryRouter>);
    await waitFor(()=>expect(screen.getByText(/stock update has expired/)).toBeInTheDocument());
    expect(screen.queryByRole("table")).toBeNull();
  });
  it("registers a hidden standalone route with no sitemap entry",()=>{
    expect(APP_ROUTE_REGISTRY.find(r=>r.path==="/clearance")).toMatchObject({status:"hidden",navGroup:"none",layout:"standalone-shell"});
    const sitemap=readFileSync("public/sitemap.xml","utf8");expect(sitemap).not.toContain("/clearance");
    expect(readFileSync("src/App.tsx","utf8")).toContain('path="/clearance" element={<ClearanceRoute');
  });
  it("does not combine unlike material/manufacturer/design/colour/diameter",()=>{
    const families=groupFamilies([item,{...item,diameter:70},{...item,option:"Gray"},{...item,manufacturer:"Other"}]);
    expect(families).toHaveLength(3);expect(families[0].grids).toHaveLength(2);
  });
});
describe("clearance receiver",()=>{
  it("validates units and removes all private fields",()=>{
    const parsed=parseSnapshot({...snapshot(),review:{private:true},items:[{...item,unitCost:100,itemId:"secret"}]});
    expect(parsed.items[0]).not.toHaveProperty("unitCost");expect(parsed).not.toHaveProperty("review");
    expect(()=>parseSnapshot({...snapshot(),items:[{...item,family:"Progressive",unit:"each"}]})).toThrow();
    expect(()=>parseSnapshot({...snapshot(),items:[{...item,quantity:0}]})).toThrow();
  });
  it("hashes link tokens and requires a scoped key before publication",async()=>{
    const read=vi.fn().mockResolvedValue(snapshot()),publish=vi.fn().mockResolvedValue(true),revoke=vi.fn();
    const handler=createHandler({read,publish,revoke,authorize:async()=> "denied"});
    const request=(body:unknown,key?:string)=>new Request("https://example.invalid",{method:"POST",headers:key?{"x-api-key":key}:{},body:JSON.stringify(body)});
    expect((await handler(request({action:"read",token:"bad"}))).status).toBe(404);expect(read).not.toHaveBeenCalled();
    const result=await handler(request({action:"read",token}));
    expect(result.status).toBe(200);expect(read).toHaveBeenCalledWith(await tokenHash(token));
    expect((await handler(request({action:"publish"}))).status).toBe(401);
    expect((await handler(request({action:"publish"},"invalid-scope"))).status).toBe(403);expect(publish).not.toHaveBeenCalled();
    expect((await handler(request({action:"revoke"},"invalid-scope"))).status).toBe(403);expect(revoke).not.toHaveBeenCalled();
  });
  it("a revoked or older publication remains rejected",async()=>{
    const handler=createHandler({read:async()=>null,publish:async()=>false,revoke:async()=>{},authorize:async()=>"allowed"});
    const response=await handler(new Request("https://example.invalid",{method:"POST",headers:{"x-api-key":"test"},body:JSON.stringify({action:"publish",tokenHash:"a".repeat(64),snapshot:snapshot()})}));
    expect(response.status).toBe(409);
    expect(readFileSync("supabase/migrations/20261026192422_private_clearance_catalogue.sql","utf8")).toContain("WHERE public.clearance_catalogue_snapshots.is_active");
  });
});

it("family exclusions are applied server-side and remain isolated from source snapshots",()=>{
  const full=snapshot();
  expect(visibleSnapshot(full,[familyKey(item as unknown as Record<string,unknown>)]).items).toHaveLength(0);
  expect(full.items).toHaveLength(1);
});
it("non-admins cannot change catalogue visibility even with a valid private link",async()=>{
  const setVisibility=vi.fn();
  const handler=createHandler({read:async()=>null,publish:async()=>false,revoke:async()=>{},authorize:async()=>"allowed",admin:async()=>null,setVisibility});
  const response=await handler(new Request("https://example.invalid",{method:"POST",headers:{authorization:"Bearer not-admin"},body:JSON.stringify({action:"set-visibility",token,familyKey:familyKey(item as unknown as Record<string,unknown>),disabled:true})}));
  expect(response.status).toBe(403);expect(setVisibility).not.toHaveBeenCalled();
});
it("an admin can hide and restore a family without changing stock",async()=>{
  mocks.invoke.mockResolvedValueOnce({data:{snapshot:snapshot(),disabled:[]},error:null})
    .mockResolvedValue({data:{ok:true},error:null});
  render(<MemoryRouter initialEntries={["/admin/clearance#"+token]}><ClearanceAdminPage/></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button",{name:"Hide family"}));
  expect(await screen.findByRole("button",{name:"Show family"})).toBeInTheDocument();
  expect(mocks.invoke).toHaveBeenLastCalledWith("clearance-catalogue",{body:{action:"set-visibility",token,familyKey:familyKey(item as unknown as Record<string,unknown>),disabled:true}});
  fireEvent.click(screen.getByRole("button",{name:"Show family"}));
  expect(await screen.findByRole("button",{name:"Hide family"})).toBeInTheDocument();
});
it("server checks admin identity before accepting a family visibility change",async()=>{
  const setVisibility=vi.fn().mockResolvedValue(true);
  const handler=createHandler({read:async()=>null,publish:async()=>false,revoke:async()=>{},authorize:async()=>"allowed",admin:async()=>"admin-test",setVisibility});
  const key=familyKey(item as unknown as Record<string,unknown>);
  const response=await handler(new Request("https://example.invalid",{method:"POST",headers:{authorization:"Bearer admin-test"},body:JSON.stringify({action:"set-visibility",token,familyKey:key,disabled:true})}));
  expect(response.status).toBe(200);expect(setVisibility).toHaveBeenCalledWith(await tokenHash(token),key,true,"admin-test");
});