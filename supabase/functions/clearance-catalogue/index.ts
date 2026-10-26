import {createClient} from "npm:@supabase/supabase-js@2.112.3";
import {createHandler} from "./handler.ts";
import {familyKey,visibleSnapshot} from "./contract.ts";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
async function exclusions(hash:string){
  const {data,error}=await db.from("clearance_catalogue_exclusions").select("family_key").eq("token_hash",hash).eq("disabled",true);
  if(error)throw Error("Visibility unavailable");return (data||[]).map(row=>row.family_key);
}
async function storedSnapshot(hash:string){
  const {data,error}=await db.from("clearance_catalogue_snapshots").select("snapshot").eq("token_hash",hash).maybeSingle();
  if(error)throw Error("Read failed");return data?.snapshot||null;
}
Deno.serve(createHandler({
  async admin(authorization){
    if(!authorization.startsWith("Bearer "))return null;
    const {data,error}=await db.auth.getUser(authorization.slice(7));
    if(error||!data.user)return null;
    const {data:role,error:roleError}=await db.from("user_roles").select("role").eq("user_id",data.user.id).maybeSingle();
    if(roleError)throw Error("Role unavailable");
    return role?.role==="admin"?data.user.id:null;
  },
  async adminList(hash){
    const snapshot=await storedSnapshot(hash);if(!snapshot)return null;
    return {snapshot,disabled:await exclusions(hash)};
  },
  async setVisibility(hash,key,disabled,actor){
    const snapshot=await storedSnapshot(hash);
    if(!snapshot||!Array.isArray(snapshot.items)||!snapshot.items.some((item:Record<string,unknown>)=>familyKey(item)===key))return false;
    const {error}=await db.from("clearance_catalogue_exclusions").upsert({token_hash:hash,family_key:key,disabled,updated_by:actor,updated_at:new Date().toISOString()},{onConflict:"token_hash,family_key"});
    if(error)throw Error("Visibility update failed");return true;
  },
  async read(hash){
    const {data,error}=await db.from("clearance_catalogue_snapshots").select("snapshot").eq("token_hash",hash).eq("is_active",true).gt("expires_at",new Date().toISOString()).maybeSingle();
    if(error)throw Error("Read failed");
    return data?visibleSnapshot(data.snapshot,await exclusions(hash)):null;
  },
  async authorize(apiKey){
    const {data,error}=await db.rpc("verify_api_key",{p_token:apiKey});if(error)throw Error("Authorization failed");
    const key=Array.isArray(data)?data[0]:data;
    return !key?"invalid":Array.isArray(key.scopes)&&key.scopes.includes("catalog:write")?"allowed":"denied";
  },
  async publish(hash,snapshot){
    const {data,error}=await db.rpc("publish_clearance_catalogue",{p_token_hash:hash,p_snapshot:snapshot});
    if(error)throw Error("Publish failed");return data===true;
  },
  async revoke(hash){
    const {error}=await db.from("clearance_catalogue_snapshots").update({is_active:false,updated_at:new Date().toISOString()}).eq("token_hash",hash);
    if(error)throw Error("Revocation failed");
  }
}));
