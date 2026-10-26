import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router";
import { useUserRole } from "@/hooks/useUserRole";
import Seo from "@/components/seo/Seo";
import {callCatalogue} from "./transport";
import ClearanceMatrices from "./ClearanceMatrices";
import { groupFamilies, type ClearanceSnapshot } from "./model";
import "./clearance.css";
export default function ClearanceCataloguePage() {
  const {hash}=useLocation();
  return <CatalogueReader key={hash} token={hash.slice(1)}/>;
}
function CatalogueReader({token}:{token:string}) {
  const {isAdmin}=useUserRole();
  const validToken=/^[A-Za-z0-9_-]{43}$/.test(token);
  const [snapshotToken,setSnapshotToken]=useState("");
  const [snapshot,setSnapshot]=useState<ClearanceSnapshot|null>(null),[failed,setFailed]=useState(false),[now,setNow]=useState(Date.now);
  const [search,setSearch]=useState(""),[family,setFamily]=useState("");
  useEffect(()=>{
    let active=true,pending=false;
    async function load() {
      if(!validToken||pending)return;pending=true;
      try {
        const {data,error}=await callCatalogue({action:"read",token});
        if(active){setNow(Date.now());if(error||!Array.isArray((data as ClearanceSnapshot | null)?.items)){setSnapshot(null);setFailed(true);}else{setSnapshot(data as ClearanceSnapshot);setSnapshotToken(token);setFailed(false);}}
      }catch{if(active){setSnapshot(null);setFailed(true);}}finally{pending=false;}
    }
    void load();const interval=window.setInterval(()=>{if(active)setNow(Date.now());void load();},60000);
    return()=>{active=false;window.clearInterval(interval);};
  },[token,validToken]);
  const current=validToken&&snapshotToken===token&&snapshot&&new Date(snapshot.expiresAt).getTime()>now?snapshot:null;
  const families=useMemo(()=>{
    const needle=search.trim().toLowerCase();
    return groupFamilies((current?.items||[]).filter(item=>(!family||item.family===family)&&[item.name,item.sku,item.skuRight,item.skuLeft,item.description].join(" ").toLowerCase().includes(needle)));
  },[current,family,search]);
  const options=[...new Set(current?.items.map(item=>item.family)||[])].sort();
  const pairs=families.filter(f=>f.unit==="pairs").reduce((s,f)=>s+f.quantity,0),eaches=families.filter(f=>f.unit==="each").reduce((s,f)=>s+f.quantity,0);
  return <main className="cc">
    <Seo title="Lens clearance | Classic Visions" description="Private lens clearance catalogue." canonicalPath="/clearance" noindex/>
    <header className="cc-header"><span>CLASSIC VISIONS</span><span>Private clearance catalogue</span></header>
    <section className="cc-intro"><p className="cc-eyebrow">Available collection</p><h1>Lens clearance</h1>
      <p>Complete pairs for multifocals. Individual lenses for single vision. Prices in Barbados dollars.</p>
      {current&&<p className="cc-updated">Stock checked {new Date(current.asOf).toLocaleString("en-BB",{timeZone:"America/Barbados"})} (Barbados time)</p>}</section>
    {!validToken?<p role="status">Open this page using the private catalogue link supplied to you.</p>:!current?
      <p role="status">{failed||snapshot?"This catalogue is unavailable or its stock update has expired. Please request a current link.":"Checking availability…"}</p>:
      <><div className="cc-filters"><label>Search lenses<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Material, manufacturer, design or colour"/></label>
        <label>Lens family<select value={family} onChange={e=>setFamily(e.target.value)}><option value="">All lens families</option>{options.map(o=><option key={o}>{o}</option>)}</select></label></div>
        <p className="cc-count" role="status">{families.length} lens families · {pairs.toLocaleString()} pairs · {eaches.toLocaleString()} individual lenses</p>
        {families.length?families.map(f=><ClearanceMatrices key={f.key} family={f}/>):<p>No lenses match this selection.</p>}
        <p className="cc-terms">Quantities are subject to confirmation and are not reserved by viewing this page. Unmatched multifocal lenses are excluded. A dash means no availability.</p></>}
    {isAdmin&&validToken&&<footer className="cc-admin-link"><Link to={"/admin/clearance#"+token}>Manage catalogue</Link></footer>}
  </main>;
}
