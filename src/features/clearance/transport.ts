import {supabase} from "@/integrations/supabase/client";
type RpcClient={rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:unknown}>};
export async function callCatalogue({action,token,familyKey,disabled}:{action:string;token:string;familyKey?:string;disabled?:boolean}){
  const client=supabase as unknown as RpcClient;
  if(action==="read")return client.rpc("clearance_read",{p_token:token});
  const result=await client.rpc("clearance_manage",{p_token:token,p_action:action,p_family_key:familyKey?JSON.parse(familyKey):null,p_disabled:disabled??null});
  if(action==="admin-list"&&result.data&&typeof result.data==="object"){
    const data=result.data as {snapshot:unknown;disabled:unknown[]};
    return {...result,data:{...data,disabled:data.disabled.map(key=>JSON.stringify(key))}};
  }
  return result;
}
