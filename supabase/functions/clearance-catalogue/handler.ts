import {isLinkToken,parseSnapshot,tokenHash} from "./contract.ts";
type Dependencies={
  admin?:(authorization:string)=>Promise<string|null>;
  adminList?:(hash:string)=>Promise<unknown|null>;
  setVisibility?:(hash:string,familyKey:string,disabled:boolean,actor:string)=>Promise<boolean>;
  read:(hash:string)=>Promise<unknown|null>;
  authorize:(key:string)=>Promise<"allowed"|"invalid"|"denied">;
  publish:(hash:string,snapshot:ReturnType<typeof parseSnapshot>)=>Promise<boolean>;
  revoke:(hash:string)=>Promise<void>;
};
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,x-client-info,content-type,x-api-key","Access-Control-Allow-Methods":"POST,OPTIONS"};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow","Referrer-Policy":"no-referrer"}});}
export function createHandler(deps:Dependencies) {
  return async(req:Request)=>{
    if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
    if(req.method!=="POST")return json({error:"Method not allowed"},405);
    try {
      if(Number(req.headers.get("content-length")||0)>8*1024*1024)return json({error:"Payload too large"},413);
      const raw=await req.text();if(new TextEncoder().encode(raw).byteLength>8*1024*1024)return json({error:"Payload too large"},413);
      let body:Record<string,unknown>;try{body=JSON.parse(raw);}catch{return json({error:"Invalid request"},400);}
      if(!body||typeof body!=="object")return json({error:"Invalid request"},400);
      if(body.action==="admin-list"||body.action==="set-visibility"){
        const actor=deps.admin?await deps.admin(req.headers.get("authorization")||""):null;
        if(!actor)return json({error:"Administrator access required"},403);
        if(!isLinkToken(body.token))return json({error:"Catalogue unavailable"},404);
        const hash=await tokenHash(body.token);
        if(body.action==="admin-list"){
          const result=deps.adminList?await deps.adminList(hash):null;
          return result?json(result):json({error:"Catalogue unavailable"},404);
        }
        if(typeof body.familyKey!=="string"||body.familyKey.length>3000||typeof body.disabled!=="boolean")return json({error:"Invalid family selection"},400);
        const accepted=deps.setVisibility?await deps.setVisibility(hash,body.familyKey,body.disabled,actor):false;
        return accepted?json({ok:true}):json({error:"Family unavailable"},404);
      }
      if(body.action==="read"){
        if(!isLinkToken(body.token))return json({error:"Catalogue unavailable"},404);
        const snapshot=await deps.read(await tokenHash(body.token));
        return snapshot?json(snapshot):json({error:"Catalogue unavailable"},404);
      }
      if(body.action!=="publish"&&body.action!=="revoke")return json({error:"Invalid action"},400);
      const key=req.headers.get("x-api-key");if(!key)return json({error:"Missing API key"},401);
      const permission=await deps.authorize(key);
      if(permission==="invalid")return json({error:"Invalid or revoked API key"},401);
      if(permission!=="allowed")return json({error:"Insufficient scope"},403);
      if(typeof body.tokenHash!=="string"||!/^[a-f0-9]{64}$/.test(body.tokenHash))return json({error:"Invalid link hash"},400);
      if(body.action==="revoke"){await deps.revoke(body.tokenHash);return json({ok:true});}
      let snapshot;try{snapshot=parseSnapshot(body.snapshot);}catch{return json({error:"Invalid catalogue snapshot"},400);}
      const accepted=await deps.publish(body.tokenHash,snapshot);
      return accepted?json({ok:true,asOf:snapshot.asOf,items:snapshot.items.length}):json({error:"Link revoked or snapshot older than current publication"},409);
    }catch{return json({error:"Catalogue temporarily unavailable"},503);}
  };
}
