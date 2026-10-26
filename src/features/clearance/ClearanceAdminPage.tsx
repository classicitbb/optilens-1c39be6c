import {useEffect,useState} from "react";
import {useLocation,Link} from "react-router";
import {supabase} from "@/integrations/supabase/client";
import {groupFamilies,type ClearanceSnapshot} from "./model";
import "./clearance.css";
export default function ClearanceAdminPage(){
  const {hash}=useLocation();return <CatalogueManager key={hash} token={hash.slice(1)}/>;
}
function CatalogueManager({token}:{token:string}){
  const validToken=/^[A-Za-z0-9_-]{43}$/.test(token);
  const [snapshot,setSnapshot]=useState<ClearanceSnapshot|null>(null),[disabled,setDisabled]=useState<Set<string>>(new Set());
  const [error,setError]=useState(""),[pending,setPending]=useState<string|null>(null),[search,setSearch]=useState("");
  useEffect(()=>{
    let active=true;
    if(!validToken)return;
    supabase.functions.invoke("clearance-catalogue",{body:{action:"admin-list",token}}).then(({data,error})=>{
      if(!active)return;
      if(error||!Array.isArray(data?.snapshot?.items)){setError("The catalogue could not be loaded.");return;}
      setSnapshot(data.snapshot);setDisabled(new Set(data.disabled));
    }).catch(()=>{if(active)setError("The catalogue could not be loaded.");});
    return()=>{active=false;};
  },[token,validToken]);
  async function toggle(key:string){
    if(pending)return;setPending(key);setError("");
    const next=!disabled.has(key);
    try{
      const {data,error}=await supabase.functions.invoke("clearance-catalogue",{body:{action:"set-visibility",token,familyKey:key,disabled:next}});
      if(error||data?.ok!==true){setError("Visibility was not saved. Please retry.");return;}
      setDisabled(previous=>{const updated=new Set(previous);if(next)updated.add(key);else updated.delete(key);return updated;});
    }catch{setError("Visibility was not saved. Please retry.");}finally{setPending(null);}
  }
  const families=groupFamilies(snapshot?.items||[]).filter(f=>[f.material,f.manufacturer,f.design,f.option].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <main className="cc"><h1>Clearance visibility</h1><p>Hide or restore complete lens families in this clearance catalogue. Inventory and source catalogue status stay unchanged.</p>
    <Link to={"/clearance#"+token}>View catalogue</Link><p role="status">{validToken?error:"Open Manage catalogue from the private catalogue link."}</p>
    <label className="cc-admin-search">Find a lens family<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <div className="cc-admin-list">{families.map(f=><div className="cc-admin-row" key={f.key}><div><strong>{f.design} · {f.option}</strong><p>{f.material} · {f.manufacturer} · {f.family}</p></div>
      <button type="button" disabled={pending!==null} aria-pressed={!disabled.has(f.key)} onClick={()=>void toggle(f.key)}>
        {pending===f.key?"Saving…":disabled.has(f.key)?"Show family":"Hide family"}</button></div>)}</div>
    {validToken&&!snapshot&&!error&&<p>Loading catalogue…</p>}
  </main>;
}
