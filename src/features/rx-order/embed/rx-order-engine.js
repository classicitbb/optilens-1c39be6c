 
// ══════════════════════════════════════════════════════════════════════════
// Rx Order Form engine — ported VERBATIM from rx-order-form-prototype.html
// (v3). The UI, on-screen flow, validation, OMA tracing, coach, clash logic
// and quote behaviour are the prototype's own code, unchanged except for:
//   • DOM access scoped to the embed root (CSS scoped under .cv-rx-embed)
//   • document/window listeners tracked so React can unmount cleanly
//   • an ADAPTER seam: live accounts/catalog/pricing data in, order events out
// Do not refactor this file for style; fidelity to the prototype is the point.
// ══════════════════════════════════════════════════════════════════════════
export function createRxOrderEngine(rootEl, ADAPTER) {
ADAPTER = ADAPTER || {};
const __docL=[], __winL=[];
const docListen=(t,f,o)=>{ document.addEventListener(t,f,o); __docL.push([t,f,o]); };
const winListen=(t,f,o)=>{ window.addEventListener(t,f,o); __winL.push([t,f,o]); };
const $=s=>rootEl.querySelector(s), $$=s=>Array.from(rootEl.querySelectorAll(s));

"use strict";
/* $ / $$ are provided by the embed wrapper, scoped to rootEl */

/* ---------- reference data ---------- */
const BRANCHES=[
  {id:'b1',code:'BT',name:'Bridgetown Optical — Broad St',info:'Main account · #C-1042 · courier Tue & Fri',cur:'BBD',prices:true},
  {id:'b2',code:'WC',name:'Bridgetown Optical — Warrens',info:'Branch · #C-1042-W · courier Wed',cur:'BBD',prices:true},
  {id:'b3',code:'SP',name:'Speightstown Eyecare',info:'Linked account · #C-1188 · pricing not enabled',cur:'XCD',prices:false}
];
const MATERIALS=[
  {id:'1.50',n:'1.50 CR-39',up:0},{id:'1.56',n:'1.56 Mid-index',up:9},
  {id:'1.59',n:'1.59 Polycarbonate',up:16},{id:'1.60',n:'1.60 High-index',up:24},
  {id:'1.67',n:'1.67 High-index',up:46},{id:'1.74',n:'1.74 Ultra high-index',up:88}
];
const DESIGNS=[
  {id:'sv-sph', n:'Single vision spherical', v:'sv', base:22},
  {id:'sv-asph',n:'Single vision aspheric',  v:'sv', base:34},
  {id:'sv-free',n:'Single vision freeform',  v:'sv', base:52},
  {id:'sv-af',  n:'Anti-fatigue',            v:'sv', base:66, needsAdd:true},
  {id:'mf-ft28',n:'Bifocal FT28',            v:'mf', base:34},
  {id:'mf-rnd', n:'Bifocal round seg',       v:'mf', base:31},
  {id:'pg-std', n:'Progressive Standard',    v:'mf', base:62, prog:true},
  {id:'pg-enh', n:'Progressive Enhanced HD', v:'mf', base:94, prog:true},
  {id:'pg-prem',n:'Progressive Premium freeform', v:'mf', base:142, prog:true}
];
const COLOURS=[
  {id:'clear',n:'Clear',up:0},
  {id:'ph-grey',n:'Photochromic Grey',up:64},
  {id:'ph-brown',n:'Photochromic Brown',up:64},
  {id:'ph-xtra',n:'Photochromic XTRActive Grey',up:82},
  {id:'pol-grey',n:'Polarised Grey',up:41},
  {id:'pol-brown',n:'Polarised Brown',up:41}
];
/* the catalogue matrix — which material / design / colour combinations actually exist */
const MATRIX={
  '1.50':{d:['sv-sph','sv-asph','mf-ft28','mf-rnd','pg-std','pg-enh'], c:['clear','ph-grey','ph-brown','pol-grey','pol-brown']},
  '1.56':{d:['sv-sph','sv-asph','sv-af','pg-std','pg-enh'],            c:['clear','ph-grey','ph-brown']},
  '1.59':{d:['sv-sph','sv-asph','sv-af','pg-std','pg-enh'],            c:['clear','ph-grey','ph-brown','ph-xtra','pol-grey']},
  '1.60':{d:['sv-asph','sv-free','sv-af','pg-std','pg-enh','pg-prem'], c:['clear','ph-grey','ph-brown','ph-xtra']},
  '1.67':{d:['sv-asph','sv-free','pg-enh','pg-prem'],                  c:['clear','ph-grey','ph-brown']},
  '1.74':{d:['sv-asph','sv-free','pg-prem'],                           c:['clear']}
};
const COMBOS=(()=>{ const out=[];
  Object.entries(MATRIX).forEach(([m,v])=>v.d.forEach(d=>v.c.forEach(c=>out.push({m,d,c}))));
  return out; })();

const TREAT=[
  {id:'ar-std', c:'Anti-reflective', n:'Standard AR', d:'AR + hard coat, 12-month warranty', p:19, grp:'ar', pop:true},
  {id:'ar-prem',c:'Anti-reflective', n:'Premium AR',  d:'Hydrophobic + oleophobic, 24-month', p:34, grp:'ar', pop:true},
  {id:'ar-blue',c:'Anti-reflective', n:'Blue-cut AR', d:'Filters high-energy visible light', p:44, grp:'ar', pop:true},
  {id:'ar-fog', c:'Anti-reflective', n:'Anti-fog AR', d:'Permanent anti-fog top layer', p:39, grp:'ar'},
  {id:'ar-night',c:'Anti-reflective',n:'Night-drive AR', d:'Reduces headlight flare', p:47, grp:'ar'},
  {id:'hc-std', c:'Hard coats', n:'Hard coat', d:'Scratch resistance', p:7, grp:'hc', pop:true},
  {id:'hc-prem',c:'Hard coats', n:'Premium hard coat', d:'Higher abrasion rating', p:12, grp:'hc'},
  {id:'hc-static',c:'Hard coats', n:'Anti-static layer', d:'Repels dust', p:9},
  {id:'mr-flash',c:'Mirror finishes', n:'Silver flash', d:'Light 20% mirror', p:48, grp:'mr'},
  {id:'mr-silver',c:'Mirror finishes', n:'Full silver mirror', d:'Full-coverage mirror', p:66, grp:'mr'},
  {id:'mr-gold',c:'Mirror finishes', n:'Gold mirror', d:'Warm-tone mirror', p:58, grp:'mr'},
  {id:'mr-blue',c:'Mirror finishes', n:'Blue mirror', d:'Cool-tone mirror', p:58, grp:'mr'},
  {id:'mr-green',c:'Mirror finishes', n:'Green mirror', d:'Neutral-tone mirror', p:58, grp:'mr'},
  {id:'tn-solid',c:'Tints', n:'Solid tint', d:'Any shade to 85%', p:13, grp:'tn', pop:true},
  {id:'tn-grad', c:'Tints', n:'Gradient tint', d:'Fades top to bottom', p:17, grp:'tn'},
  {id:'tn-dgrad',c:'Tints', n:'Double gradient', d:'Dark top and bottom', p:21, grp:'tn'},
  {id:'tn-fash', c:'Tints', n:'Fashion tint', d:'Light cosmetic tint to 25%', p:15, grp:'tn'},
  {id:'tn-uv',   c:'Tints', n:'UV-blocking tint', d:'Tint with UV400 built in', p:18, grp:'tn'},
  {id:'sp-uv',  c:'Specialty', n:'UV400 boost', d:'Full-spectrum UV block', p:6},
  {id:'sp-oleo',c:'Specialty', n:'Oleophobic top', d:'Smudge resistance', p:8},
  {id:'sp-engr',c:'Specialty', n:'Practice engraving', d:'Your mark on the lens', p:9},
  {id:'sp-thin',c:'Specialty', n:'Optimised thinning', d:'Minimum edge and centre thickness', p:14, rev:true},
  {id:'sp-roll',c:'Specialty', n:'Roll & polish', d:'Edge finishing on high minus', p:11, rev:true},
  {id:'sp-lent',c:'Specialty', n:'Lenticular', d:'High-power reduced aperture', p:38, rev:true},
  {id:'sp-slab',c:'Specialty', n:'Slab-off', d:'Vertical imbalance correction', p:44, rev:true},
  {id:'sp-pris',c:'Specialty', n:'Prism thinning', d:'Cosmetic thickness reduction', p:16},
  {id:'sp-back',c:'Specialty', n:'Back-surface AR only', d:'Rear-surface reflection control', p:22},
  {id:'sp-match',c:'Specialty', n:'Tint matching to sample', d:'Match a supplied lens', p:24, rev:true}
];
const CLASH=[
  ['mr-flash','ar-fog','Mirror finishes cannot take an anti-fog top layer'],
  ['mr-silver','ar-fog','Mirror finishes cannot take an anti-fog top layer'],
  ['mr-gold','ar-fog','Mirror finishes cannot take an anti-fog top layer'],
  ['mr-blue','ar-fog','Mirror finishes cannot take an anti-fog top layer'],
  ['mr-green','ar-fog','Mirror finishes cannot take an anti-fog top layer'],
  ['mr-silver','tn-grad','A full mirror cannot sit over a gradient tint'],
  ['mr-gold','tn-grad','A full mirror cannot sit over a gradient tint'],
  ['sp-back','ar-std','Back-surface AR replaces a full AR coating'],
  ['sp-back','ar-prem','Back-surface AR replaces a full AR coating'],
  ['sp-back','ar-blue','Back-surface AR replaces a full AR coating']
];
/* rates are per 1 BBD — placeholders until the FX source is decided (fixed vs live feed) */
const CUR={
  BBD:{sym:'BBD $',rate:1,     n:'Barbados dollar'},
  USD:{sym:'USD $',rate:.5,    n:'US dollar'},
  EUR:{sym:'EUR €',rate:.46,   n:'Euro'},
  CAD:{sym:'CAD $',rate:.68,   n:'Canadian dollar'},
  TTD:{sym:'TTD $',rate:3.40,  n:'Trinidad & Tobago dollar'},
  JMD:{sym:'JMD $',rate:78.50, n:'Jamaican dollar'},
  XCD:{sym:'XCD $',rate:1.35,  n:'East Caribbean dollar'},
  GYD:{sym:'GYD $',rate:104.5, n:'Guyanese dollar'}
};

/* ---------- state ---------- */
/* m/d/c is the job's lens. When S.split is on (pair jobs only) it becomes the
   RIGHT eye's lens and m2/d2/c2 carries the LEFT — see lensOf(). Keeping the
   original triple as the OD/shared selection means every existing read of
   S.m/S.d/S.c stays correct for an unsplit order, which is all of them today. */
const S={branch:null,scope:'uncut',vision:'sv',purpose:'dist',eyes:'pair',
  m:'',d:'',c:'', split:false, m2:'',d2:'',c2:'', treatConfirmed:false, deliveryTouched:false,
  treat:new Set(), cur:'USD', pricesOn:true, assists:new Set(), file:null, shapeOk:false, notesConfirmed:false,
  shape:null, shapeSrc:'', stdShape:'', shapeExpanded:false, frameExpanded:false, orderNo:'',
  tintCfg:{colour:'Grey',density:75,gradTop:80,gradBottom:10,finish:'Standard',match:false},
  chemClips:[],
  dismissed:new Set(), warnOff:new Set(), suggOff:false, ownerReview:false,
  revealAll:false, prefilled:false, fromDraft:false, edTouched:false, diamTouched:false,
  collapsedSections:new Set(), editingSections:new Set()};

/* Assist tag raised automatically when the chosen lens has no price on the
   account's matrix. Constant so it can be added and removed idempotently. */
const UNPRICED_ASSIST='Lens not priced on this account — quote requested';

const money=n=>n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const q4=n=>Math.round(n*4)/4;
const isStep=v=>Math.abs(v*4-Math.round(v*4))<1e-9;
function sgn(n,dp){dp=dp||2;return (n<0?'-':'+')+Math.abs(n).toFixed(dp);}

/* shorthand-aware numeric parse */
function parseNum(raw,shorthand){
  if(raw==null) return null;
  let s=String(raw).trim(); if(!s) return null;
  let neg=false;
  if(/-\s*$/.test(s)){neg=true;s=s.replace(/-\s*$/,'');}
  if(/^\s*-/.test(s)){neg=true;s=s.replace(/^\s*-/,'');}
  const hadDot=s.includes('.');
  s=s.replace(/^\s*\+/,'').replace(/[^0-9.]/g,'');
  if(s==='') return null;
  let n=parseFloat(s); if(isNaN(n)) return null;
  if(shorthand && !hadDot && /^\d+$/.test(s) && s.length>=2){
    const v=n/100;
    if(isStep(v) && Math.abs(v)<=25) n=v;
  }
  return neg?-n:n;
}
const rowEls=eye=>$$(`tr[data-eye="${eye}"] input, tr[data-eye="${eye}"] select`);
function readRow(eye){
  const o={};
  rowEls(eye).forEach(i=>{
    const f=i.dataset.f;
    o[f]= f==='base' ? (i.value||'') : parseNum(i.value,['sph','cyl','add'].includes(f));
  });
  return o;
}
const cell=(eye,f)=>$(`tr[data-eye="${eye}"] [data-f="${f}"]`);
const activeEyes=()=>S.eyes==='pair'?['od','os']:[S.eyes];
const design=()=>DESIGNS.find(x=>x.id===S.d);
const material=()=>MATERIALS.find(x=>x.id===S.m);
const colour=()=>COLOURS.find(x=>x.id===S.c);
/* ---------- split eyes: a different lens per side ----------
   Only meaningful on a pair — a single-eye job already has exactly one lens,
   so the toggle is hidden and forced off there (see syncSplitUI). Side 'b' is
   the left eye's own triple; every other side reads 'a'. */
const splitActive=()=>S.split&&S.eyes==='pair';
const lensOf=eye=>(splitActive()&&eye==='os')
  ? {m:S.m2,d:S.d2,c:S.c2}
  : {m:S.m,d:S.d,c:S.c};
const sideOf=eye=>(splitActive()&&eye==='os')?'b':'a';
const lensTriple=side=>side==='b'?{m:S.m2,d:S.d2,c:S.c2}:{m:S.m,d:S.d,c:S.c};
const lensComplete=side=>{const t=lensTriple(side);return !!(t.m&&t.d&&t.c);};
/* Sides that must be chosen before the lens section is complete. */
const activeSides=()=>splitActive()?['a','b']:['a'];
const namedLens=side=>{
  const t=lensTriple(side);
  const m=MATERIALS.find(x=>x.id===t.m), d=DESIGNS.find(x=>x.id===t.d), c=COLOURS.find(x=>x.id===t.c);
  return (m&&d&&c)?`${m.n} · ${d.n} · ${c.n}`:null;
};
/* A progressive on EITHER side means the fitting-height rules apply — the
   height column is shared, so the stricter of the two sides has to govern. */
const isProg=()=>activeSides().some(s=>{const d=DESIGNS.find(x=>x.id===lensTriple(s).d);return !!(d&&d.prog);});
const needsAdd=()=>S.vision==='mf'||!!(design()&&design().needsAdd);
const needsHt=()=>S.vision==='mf';
const needsNearPD=()=>S.vision==='sv'&&(S.purpose==='read'||S.purpose==='inter');

/* ---------- catalogue constraint ---------- */
function valid(cmb){
  const d=DESIGNS.find(x=>x.id===cmb.d);
  return d && d.v===S.vision;
}
/* Both narrowing and repair work on one side's triple at a time — the two
   sides pick independently, so the left eye's choice must never narrow the
   right eye's lists. */
function options(side){
  const t=lensTriple(side||'a');
  const pool=COMBOS.filter(valid);
  const okM=c=>(!t.d||c.d===t.d)&&(!t.c||c.c===t.c);
  const okD=c=>(!t.m||c.m===t.m)&&(!t.c||c.c===t.c);
  const okC=c=>(!t.m||c.m===t.m)&&(!t.d||c.d===t.d);
  return {
    mats:[...new Set(pool.filter(okM).map(c=>c.m))],
    designs:[...new Set(pool.filter(okD).map(c=>c.d))],
    cols:[...new Set(pool.filter(okC).map(c=>c.c))],
    pool
  };
}
function repairSide(side){
  const keys=side==='b'?{m:'m2',d:'d2',c:'c2'}:{m:'m',d:'d',c:'c'};
  const pool=COMBOS.filter(valid);
  const fits=()=>{const t=lensTriple(side);return pool.some(c=>(!t.m||c.m===t.m)&&(!t.d||c.d===t.d)&&(!t.c||c.c===t.c));};
  if(fits()) return;
  /* drop the oldest conflicting choice until valid again */
  const order=['c','d','m'];
  for(const k of order){
    const sk=keys[k], bak=S[sk]; S[sk]='';
    if(fits()){
      toast('Cleared '+({m:'material',d:'design',c:'colour'}[k])+' — that combination isn\'t on your pricelist');
      return;
    }
    S[sk]=bak;
  }
  S[keys.m]=S[keys.d]=S[keys.c]='';
}
function repair(){ activeSides().forEach(repairSide); }
/* ---------- filterable material/design/colour combo ----------
   Type-to-search comboboxes: each narrows the other two (same catalogue logic as
   before) AND filters by whatever the user has typed, substring, case-insensitive. */
const COMBO_DEFS={
  m:{inputId:'material',listId:'materialList',all:MATERIALS,poolKey:'mats',side:'a'},
  d:{inputId:'design', listId:'designList', all:DESIGNS, poolKey:'designs',side:'a'},
  c:{inputId:'colour', listId:'colourList', all:COLOURS, poolKey:'cols',side:'a'},
  /* Left-eye mirror of the three above, live only while split is on. */
  m2:{inputId:'material2',listId:'materialList2',all:MATERIALS,poolKey:'mats',side:'b'},
  d2:{inputId:'design2', listId:'designList2', all:DESIGNS, poolKey:'designs',side:'b'},
  c2:{inputId:'colour2', listId:'colourList2', all:COLOURS, poolKey:'cols',side:'b'}
};
const comboKeysFor=side=>Object.keys(COMBO_DEFS).filter(k=>COMBO_DEFS[k].side===side);
/* Each list keeps a direct element reference (and its original parent, to
   restore into) captured once here — once opened it moves to document.body
   (see openCombo), so it can no longer be found via $()/$$(), which only
   search inside rootEl. */
Object.values(COMBO_DEFS).forEach(def=>{
  def.listEl=$('#'+def.listId);
  def.listHome=def.listEl.parentElement;
});
let comboActive={m:-1,d:-1,c:-1,m2:-1,d2:-1,c2:-1};
/* Whether the user has typed into this combo since it was focused. Without it,
   reopening a combo that already holds a choice filtered the list by that
   choice's own name — so the list came back holding exactly one item, the
   thing you had already picked, and every other option looked unavailable.
   Changing your mind meant clearing the field by hand first. The typed query
   only narrows the list once there actually is one. */
let comboTyped={m:false,d:false,c:false,m2:false,d2:false,c2:false};
const resetComboActive=()=>Object.keys(COMBO_DEFS).forEach(k=>{comboActive[k]=-1;});
function comboFilteredItems(k,o){
  const def=COMBO_DEFS[k], input=$('#'+def.inputId);
  const items=def.all.filter(x=>o[def.poolKey].includes(x.id));
  const q=(comboTyped[k]&&input&&document.activeElement===input)?input.value.trim().toLowerCase():'';
  return q?items.filter(x=>x.n.toLowerCase().includes(q)):items;
}
function renderComboList(k,o){
  const def=COMBO_DEFS[k], list=def.listEl;
  const items=comboFilteredItems(k,o);
  if(comboActive[k]>=items.length) comboActive[k]=items.length-1;
  list.innerHTML=items.length
    ? items.map((x,i)=>`<div class="cbopt ${S[k]===x.id?'sel':''} ${i===comboActive[k]?'act':''}" data-cid="${x.id}">${x.n}</div>`).join('')
    : `<div class="cbnone">No matches</div>`;
  Array.from(list.querySelectorAll('.cbopt')).forEach(el=>el.addEventListener('mousedown',e=>{
    e.preventDefault(); pickCombo(k,el.dataset.cid);
  }));
}
function pickCombo(k,id){
  S[k]=id; resetComboActive(); comboTyped[k]=false;
  /* set the picked input's own display text directly — fillLensSelects() only
     syncs inputs that AREN'T focused, and this one still is (mousedown on the
     option preventDefaults to avoid a blur, so keyboard flow keeps working). */
  const def=COMBO_DEFS[k], item=def.all.find(x=>x.id===id), input=$('#'+def.inputId);
  if(input) input.value=item?item.n:'';
  fillLensSelects(); render();
  closeCombo(k);
}
function closeCombo(k){
  const def=COMBO_DEFS[k], list=def.listEl;
  if(!list) return;
  list.classList.remove('on');
  /* undo the portal move from openCombo so it's back inside rootEl (and gets
     torn down normally) whenever it isn't actively showing. */
  if(list.parentElement&&list.parentElement!==def.listHome) def.listHome.appendChild(list);
}
function closeAllCombos(){ Object.keys(COMBO_DEFS).forEach(closeCombo); }
/* Every rule in this file — including position:fixed on .cblist itself — is
   scoped as ".cv-rx-embed .cblist{...}" (by design: keeps the ported
   prototype's styles from leaking into the host page). Portaling straight to
   document.body escapes that selector's ancestry too, so the dropdown loses
   ALL of its CSS the moment it moves — position reverts to the div default
   (static), landing it in normal document flow instead of floating anywhere
   near the field. A standalone ".cv-rx-embed" wrapper appended to body (not
   nested in the form itself) keeps every rule matching AND, being a fresh
   direct child of body, is never inside admin's own layout containers either
   — one of which turns out to establish its own containing block for fixed
   descendants (a transform, filter or CSS containment somewhere up that
   tree), which is what made the dropdown land nowhere near the field and
   still get clipped by that container's own overflow. */
function comboPortalRoot(){
  let p=document.getElementById('cvRxComboPortal');
  if(!p){ p=document.createElement('div'); p.id='cvRxComboPortal'; p.className='cv-rx-embed'; document.body.appendChild(p); }
  return p;
}
function positionComboList(k){
  const def=COMBO_DEFS[k], wrap=$('#'+def.inputId).closest('.combo'), list=def.listEl;
  if(!wrap||!list) return;
  const r=wrap.getBoundingClientRect();
  list.style.left=r.left+'px'; list.style.top=(r.bottom+4)+'px'; list.style.width=r.width+'px';
}
function openCombo(k){
  Object.keys(COMBO_DEFS).forEach(x=>{ if(x!==k) closeCombo(x); });
  const def=COMBO_DEFS[k], list=def.listEl, portal=comboPortalRoot();
  if(list.parentElement!==portal) portal.appendChild(list);
  positionComboList(k);
  list.classList.add('on');
  renderComboList(k,options(def.side));
}
function fillLensSelects(){
  repair();
  const byside={a:options('a'),b:options('b')};
  Object.entries(COMBO_DEFS).forEach(([k,def])=>{
    const input=$('#'+def.inputId); if(!input) return;
    const item=def.all.find(x=>x.id===S[k]);
    if(document.activeElement!==input) input.value=item?item.n:'';
    if(def.listEl&&def.listEl.classList.contains('on')) renderComboList(k,byside[def.side]);
  });
  $('#comboCount').textContent=byside.a.pool.length+' valid combinations';
  const split=splitActive();
  const nmA=namedLens('a'), nmB=split?namedLens('b'):null;
  const tail='<br><span style="opacity:.8">Named material → design → option, the way it prints on your pricelist.</span>';
  if(split){
    $('#lensName').innerHTML=(nmA||nmB)
      ? `<b>OD (right)</b> ${nmA||'<span style="opacity:.7">not chosen yet</span>'}<br><b>OS (left)</b> ${nmB||'<span style="opacity:.7">not chosen yet</span>'}${tail}`
      : 'Pick a material, design and colour for each eye. The two sides choose independently.';
  } else {
    $('#lensName').innerHTML=nmA
      ? `<b>${nmA}</b>${tail}`
      : 'Pick a material, design and colour to name the lens. Lists narrow each other — choose in whatever order suits you.';
  }
  syncSplitUI();
}
/* Show/hide the left-eye column and keep the toggle honest about when a split
   is even possible. A single-eye job has one lens by definition. */
function syncSplitUI(){
  const possible=S.eyes==='pair';
  const on=splitActive();
  const row=$('#splitRow'), toggle=$('#splitOn'), block=$('#lensSplitB');
  if(row) row.classList.toggle('hide',!possible);
  if(toggle) toggle.checked=on;
  if(block) block.classList.toggle('hide',!on);
  const head=$('#lensSideAHead');
  if(head) head.classList.toggle('hide',!on);
}

/* ---------- order number: 8 digits, sequential from 80000000 ---------- */
const ORDNO_KEY='cv-rx-nextno';
function nextOrderNo(){
  let n;
  try{ n=parseInt(localStorage.getItem(ORDNO_KEY)||'80000000',10); }catch(e){ n=80000000; }
  if(!n||n<80000000||n>99999999) n=80000000;
  try{ localStorage.setItem(ORDNO_KEY,String(n+1)); }catch(e){}
  return String(n);
}
function newOrderNo(){
  const assigned=ADAPTER.orderNo&&ADAPTER.orderNo();
  /* The order identifier travels to the PO/lab payload, so it must remain a
     numeric order number. Quote references are deliberately kept separate. */
  S.orderNo=/^\d+$/.test(String(assigned||''))?String(assigned):nextOrderNo();
  const el=$('#ordNo');
  if(el) el.innerHTML='<span>Order</span> '+S.orderNo;
  return S.orderNo;
}

/* ---------- frame measurement limits ---------- */
const LIMITS={ fa:{max:78,label:'A'}, fb:{max:60,label:'B'}, fed:{max:88,label:'ED'}, fdbl:{max:30,label:'DBL'} };
/* The traced outline is only meaningful against a known box — ED in particular
   is derived from the current A and B. Confirming the shape before those exist
   verifies it against nothing, so the confirm stays locked until all four are in. */
function frameBoxComplete(){ return Object.keys(LIMITS).every(id=>parseNum($('#'+id).value)!==null); }
/* Anti-reflective coatings are applied off-site, which roughly doubles the
   turnaround — the service select has to say so rather than quoting the
   uncoated 5–7 days for a job that cannot make it. */
const AR_LEAD='9–14 working days', PLAIN_LEAD='5–7 working days';
function arSelected(){ return Array.from(S.treat).some(id=>{const t=TREAT.find(x=>x.id===id); return !!t&&t.grp==='ar';}); }
/* Barbados is the only domestic destination; everywhere else the job leaves the
   island and goes out through a forwarder. */
const branchIsExport=()=>{
  const c=(S.branch&&S.branch.country||'').trim().toUpperCase();
  return !!c && c!=='BB' && !/^BARBADOS$/i.test(c);
};
const EXPORT_DELIVERY='Export — freight forwarder';

function limitErrors(){
  const out=[];
  Object.entries(LIMITS).forEach(([id,L])=>{
    const v=parseNum($('#'+id).value);
    if(v!==null&&v>L.max) out.push({id,t:`${L.label} is ${v.toFixed(2)} mm — the maximum we can cut is ${L.max} mm.`});
    if(v!==null&&v<=0) out.push({id,t:`${L.label} must be greater than zero.`});
  });
  const ed=parseNum($('#fed').value), a=parseNum($('#fa').value), b=parseNum($('#fb').value);
  if(ed!==null&&a!==null&&b!==null&&ed<Math.max(a,b))
    out.push({id:'fed',t:`ED ${ed.toFixed(2)} mm is smaller than the box — it can't be less than the larger of A and B.`});
  return out;
}

/* ---------- frame maths ---------- */
function calcED(){
  const a=parseNum($('#fa').value), b=parseNum($('#fb').value);
  if(a===null||b===null) return null;
  return Math.ceil(Math.sqrt(a*a+b*b)*10)/10;
}
function syncED(){
  const fed=$('#fed'), fld=fed.closest('.field');
  /* A real outline is present → ED is a measurement, not an opinion. Locked. */
  const m=(typeof liveMetrics==='function')?liveMetrics():null;
  if(m){
    fed.value=m.ed.toFixed(2);
    fed.readOnly=true; fed.style.cursor='not-allowed';
    fld.classList.add('auto');
    /* calculated/locked — keyboard flow (Tab and Enter-to-advance) hops from B straight to DBL */
    fed.tabIndex=-1;
    $('#edHint').innerHTML=`From the shape · axis ${m.edAxis.toFixed(1)}° <span style="opacity:.6">🔒 locked</span>`;
    return;
  }
  fed.readOnly=false; fed.style.cursor='';
  const ed=calcED();
  if(ed===null){ $('#edHint').textContent='Auto from A and B — editable'; fed.tabIndex=-1; return; }
  if(!S.edTouched) fed.value=ed.toFixed(1);
  $('#edHint').textContent=S.edTouched?`Calculated ${ed.toFixed(1)} — you've overridden it`:`Estimated √(A²+B²) = ${ed.toFixed(1)} mm — pick a shape for a true ED`;
  fld.classList.toggle('auto',!S.edTouched);
  /* still on the auto estimate → skip it in keyboard flow; once the user has typed
     their own value (edTouched) it becomes a normal tab stop */
  fed.tabIndex=S.edTouched?0:-1;
}
function suggestDiam(){
  const a=parseNum($('#fa').value), dbl=parseNum($('#fdbl').value), ed=parseNum($('#fed').value);
  const pds=activeEyes().map(e=>readRow(e).pd).filter(v=>v!==null);
  if(a===null||dbl===null||ed===null||!pds.length) return null;
  const pd=Math.min(...pds);
  const dec=Math.abs((a+dbl)/2-pd);
  return Math.ceil(ed+2*dec+2);
}
function fillDiam(){
  const s=suggestDiam();
  const sizes=[60,65,70,75,80];
  const pick=s?sizes.find(x=>x>=s)||80:null;
  const cur=$('#diam').value;
  $('#diam').innerHTML=(pick?`<option value="auto">Auto — ${pick} mm suggested</option>`:'<option value="auto">Auto — lab decides</option>')
    +sizes.map(x=>`<option value="${x}">${x} mm${x>=75?' — oversize':''}</option>`).join('');
  $('#diam').value=S.diamTouched&&cur?cur:'auto';
  $('#diamHint').textContent=s
    ? `Min blank ≈ ED ${parseNum($('#fed').value).toFixed(1)} + 2 × decentration + 2 mm = ${s} mm → ${pick} mm blank`
    : 'Enter A, DBL, ED and a PD for a suggestion.';
  return pick;
}
function effDiam(){
  const v=$('#diam').value;
  if(v==='auto'){ const s=suggestDiam(); const sizes=[60,65,70,75,80]; return s?(sizes.find(x=>x>=s)||80):70; }
  return parseInt(v,10)||70;
}

/* ---------- normalisation ---------- */
function normalise(inp){
  if(!inp.dataset||!inp.dataset.f) return;
  const f=inp.dataset.f;
  if(f==='base') return;
  if(inp.value.trim()===''){ return; }
  let v=parseNum(inp.value,['sph','cyl','add'].includes(f));
  if(v===null){ inp.value=''; return; }
  if(f==='sph'){ inp.value=sgn(q4(Math.max(-25,Math.min(18,v)))); }
  else if(f==='cyl'){ inp.value=sgn(-Math.abs(q4(v))); }
  else if(f==='add'){ inp.value=sgn(Math.min(4.5,Math.max(.25,q4(Math.abs(v))))); }
  else if(f==='axis'){ let a=Math.round(v); a=((a%180)+180)%180; if(a===0)a=180; inp.value=String(a); }
  else if(f==='prism'){ inp.value=Math.abs(q4(v)).toFixed(2); }
  else if(f==='pd'||f==='npd'){
    v=Math.abs(v);
    if(v>=45){ const h=Math.round(v/2*2)/2;
      ['od','os'].forEach(e=>{const c=cell(e,f); if(c) c.value=h.toFixed(1);});
      toast('Binocular '+v.toFixed(1)+' split to '+h.toFixed(1)+' / '+h.toFixed(1));
    } else inp.value=(Math.round(v*2)/2).toFixed(1);
  }
  else if(f==='ht'){ inp.value=(Math.round(Math.abs(v)*2)/2).toFixed(1); }
  render();
}

/* ---------- plus-cylinder entry ----------
   Some prescribers write in plus-cyl form. The main table above always works
   in minus-cyl (Innovations/production need it that way); this is a small,
   separate "as prescribed" capture that transposes into the main table
   instead of changing how the main table itself behaves. Transposition:
   sph' = sph + cyl, cyl' = -cyl, axis' = axis ± 90 (normalised to 1-180). */
function normalisePlus(inp){
  if(!inp.dataset||!inp.dataset.pf) return;
  const f=inp.dataset.pf;
  if(inp.value.trim()===''){ syncPlusCylToMain(); return; }
  let v=parseNum(inp.value,f!=='axis');
  if(v===null){ inp.value=''; syncPlusCylToMain(); return; }
  if(f==='sph'){ inp.value=sgn(q4(Math.max(-25,Math.min(18,v)))); }
  else if(f==='cyl'){ inp.value=sgn(Math.abs(q4(v))); }
  else if(f==='axis'){ let a=Math.round(v); a=((a%180)+180)%180; if(a===0)a=180; inp.value=String(a); }
  syncPlusCylToMain();
}
function syncPlusCylToMain(){
  if(!$('#plusCylOn').checked) return;
  ['od','os'].forEach(e=>{
    const sphP=parseNum($('#pc-'+e+'-sph').value,true);
    const cylP=parseNum($('#pc-'+e+'-cyl').value,true);
    const axisP=parseNum($('#pc-'+e+'-axis').value,false);
    if(sphP===null||cylP===null||axisP===null) return;
    const sphM=q4(sphP+cylP), cylM=-Math.abs(q4(cylP));
    let axisM=Math.round(axisP)+90; axisM=((axisM%180)+180)%180; if(axisM===0) axisM=180;
    const sphEl=cell(e,'sph'), cylEl=cell(e,'cyl'), axisEl=cell(e,'axis');
    if(sphEl) sphEl.value=sgn(sphM);
    if(cylEl) cylEl.value=sgn(cylM);
    if(axisEl) axisEl.value=String(axisM);
  });
  render();
}

/* ---------- treatments ---------- */
function clashOf(id){
  const t=TREAT.find(x=>x.id===id); if(!t) return null;
  if(t.grp){ const o=TREAT.find(x=>x.grp===t.grp&&x.id!==id&&S.treat.has(x.id));
    if(o) return 'Replaces '+o.n; }
  for(const [a,b,w] of CLASH){ if(a===id&&S.treat.has(b)) return w; if(b===id&&S.treat.has(a)) return w; }
  if(/^tn-(solid|grad|dgrad)$/.test(id)&&activeSides().some(s=>/^ph-/.test(lensTriple(s).c))) return 'Cannot tint a photochromic lens';
  return null;
}
/* ---------- add-on verification ----------
   The selected set and the live catalogue can disagree, and every way they can
   used to fail silently:

   · withdrawn — a treatment selected before the catalogue refreshed (an
     account switch re-scopes to that pricelist, or the add-on was deactivated)
     is skipped by price() and by persistPayload's addon lookup, yet stays in
     S.treat and therefore in payload.treatments. The lab receives an add-on
     nobody quoted and nobody recorded as a line.
   · unpriced — an add-on this account has no price for resolves to 0 and is
     quoted as free lab work.
   · clash — toggleTreat() blocks an incompatible pair at click time, but a
     restored draft or a Lens Assistant prefill writes S.treat wholesale with
     no such check, so an order can carry a pair the lab cannot make.

   Each is a real error about the order's data, so each blocks submit and is
   reported with the one action that fixes it. */
function addonIssues(){
  const out=[];
  const selected=Array.from(S.treat);
  selected.forEach(id=>{
    const t=TREAT.find(x=>x.id===id);
    if(!t){
      out.push({id,kind:'withdrawn',
        t:'A coating on this order is no longer available on this account and cannot be quoted.'});
      return;
    }
    if(t.unpriced){
      out.push({id,kind:'unpriced',name:t.n,
        t:`${t.n} has no price on this account — it cannot be added at no charge.`});
    }
  });
  /* Report each clashing pair once, from the second-selected side. */
  selected.forEach((id,i)=>{
    const t=TREAT.find(x=>x.id===id); if(!t) return;
    for(const [a,b,w] of CLASH){
      const other=a===id?b:(b===id?a:null);
      if(!other||!S.treat.has(other)) continue;
      if(selected.indexOf(other)>i) continue; /* the earlier one reports it */
      const o=TREAT.find(x=>x.id===other);
      out.push({id,kind:'clash',name:t.n,
        t:`${t.n} and ${o?o.n:'another coating'} cannot go on the same lens — ${w}.`});
    }
  });
  return out;
}
function renderAddonIssues(){
  const box=$('#treatIssues'); if(!box) return;
  const issues=addonIssues();
  box.classList.toggle('hide',!issues.length);
  if(!issues.length){ box.innerHTML=''; return; }
  box.innerHTML=issues.map(x=>`<div class="callout danger"><span class="ci">!</span>
    <span>${x.t}</span>
    <button class="cx" data-drop="${x.id}" title="Remove it from this order">Remove</button></div>`).join('');
  $$('#treatIssues [data-drop]').forEach(b=>b.addEventListener('click',()=>{
    S.treat.delete(b.dataset.drop); render(); toast('Removed from this order');
  }));
}

function toggleTreat(id){
  const t=TREAT.find(x=>x.id===id); if(!t) return;
  /* The confirmation was about a particular set of coatings; changing the set
     retracts it rather than silently carrying the old approval forward. */
  S.treatConfirmed=false;
  if(S.treat.has(id)) S.treat.delete(id);
  else{
    if(t.grp) TREAT.filter(x=>x.grp===t.grp).forEach(x=>S.treat.delete(x.id));
    const bad=clashOf(id);
    if(bad&&!bad.startsWith('Replaces')){ toast(bad); return; }
    S.treat.add(id);
  }
  buildPopular(); buildTreatList(); render();
}
function treatmentUseCount(id){
  try{
    const hist=JSON.parse(localStorage.getItem('cv-rx-history')||'[]');
    return hist.filter(h=>h.kind==='submitted'&&Array.isArray(h.payload?.treatments)&&h.payload.treatments.includes(id)).length;
  }catch(e){ return 0; }
}
function isPopularTreatment(t){
  if(/back\s*ar/i.test(t.n)) return treatmentUseCount(t.id)>5;
  return !!t.pop||/blue\s*defen[cs]e|super\s*ar/i.test(t.n);
}
function buildPopular(){
  $('#popOpts').innerHTML=TREAT.filter(isPopularTreatment).slice(0,3).map(t=>{
    const sel=S.treat.has(t.id), bad=sel?null:clashOf(t.id);
    const hard=!!bad&&!bad.startsWith('Replaces');
    return `<div class="opt ${sel?'sel':''} ${hard?'dis':''}" data-tid="${t.id}" tabindex="0" title="${bad||''}">
      <div class="on">${t.n}</div><div class="od">${bad||t.d}</div></div>`;
  }).join('');
  $$('#popOpts .opt').forEach(el=>{
    el.addEventListener('click',()=>toggleTreat(el.dataset.tid));
    el.addEventListener('keydown',e=>optKey(e,'#popOpts .opt'));
  });
}
function optKey(e,sel){
  const list=$$(sel), i=list.indexOf(e.currentTarget);
  if(e.key===' '||e.key==='Enter'){ e.preventDefault(); e.currentTarget.click(); }
  if(e.key==='ArrowRight'||e.key==='ArrowDown'){ e.preventDefault(); (list[i+1]||list[0]).focus(); }
  if(e.key==='ArrowLeft'||e.key==='ArrowUp'){ e.preventDefault(); (list[i-1]||list[list.length-1]).focus(); }
}
function buildTreatList(){
  const term=($('#treatSearch').value||'').toLowerCase();
  let html='';
  [...new Set(TREAT.map(t=>t.c))].forEach(c=>{
    const items=TREAT.filter(t=>t.c===c&&(!term||(t.n+' '+t.d).toLowerCase().includes(term)));
    if(!items.length) return;
    html+=`<div class="tcat">${c}</div>`;
    items.forEach(t=>{
      /* A selected row is not a blocked row. Feeding "Already selected" through
         the clash branch marked it .dis and disabled its checkbox, so clicking
         it did nothing — and for any treatment that isn't one of the handful in
         "Popular choices", this drawer is the only place it appears, leaving the
         chip's ✕ outside the drawer as the sole way to take it off again. */
      const sel=S.treat.has(t.id), clash=sel?null:clashOf(t.id);
      const hard=!!clash&&!clash.startsWith('Replaces');
      const note=sel?'Selected — click to remove':clash;
      html+=`<label class="trow ${sel?'sel':''} ${hard?'dis':''}" data-tid="${t.id}">
        <input type="checkbox" ${sel?'checked':''} ${hard?'disabled':''}>
        <span style="min-width:0"><span class="tn">${t.n}${t.rev?' <span class="badge-rev">owner review</span>':''}</span>
        <span class="td">${t.d}</span>${note?`<span class="tw">${note}</span>`:''}</span></label>`;
    });
  });
  $('#treatList').innerHTML=html||'<div class="dr-empty">No treatments match that search.</div>';
  $$('#treatList .trow').forEach(el=>el.addEventListener('click',e=>{
    e.preventDefault(); if(!el.classList.contains('dis')) toggleTreat(el.dataset.tid);
  }));
  $('#treatCount').textContent=S.treat.size+' selected';
}
function renderChips(){
  const box=$('#treatChips');
  box.innerHTML=S.treat.size
    ? Array.from(S.treat).map(id=>{const t=TREAT.find(x=>x.id===id);return t?`<span class="tchip">${t.n}<button data-rm="${id}">✕</button></span>`:'';}).join('')
    : '<span class="chipnone">No treatments selected — the lens ships uncoated.</span>';
  $$('#treatChips button').forEach(b=>b.addEventListener('click',()=>toggleTreat(b.dataset.rm)));
}

/* ---------- tint configurator ---------- */
const TINT_COLOURS=['Grey','Brown','Green','Blue','Rose','Amber','Custom — see notes'];
function tintSelected(){ return ['tn-solid','tn-grad','tn-dgrad','tn-fash','tn-uv'].find(id=>S.treat.has(id)); }
function renderTintCfg(){
  const box=$('#tintCfg'), id=tintSelected();
  if(!id){ box.innerHTML=''; return; }
  const t=TREAT.find(x=>x.id===id), grad=/grad/.test(id);
  const c=S.tintCfg;
  box.innerHTML=`
    <div class="callout" style="margin-top:12px;display:block">
      <div style="font-weight:650;font-size:13px;margin-bottom:10px">${t.n} — configuration</div>
      <div class="grid g3">
        <div class="field"><label>Colour</label>
          <select id="tintColour">${TINT_COLOURS.map(x=>`<option ${c.colour===x?'selected':''}>${x}</option>`).join('')}</select></div>
        ${grad?`
        <div class="field"><label>Density at top <span class="opt-tag">%</span></label>
          <input type="text" inputmode="numeric" id="tintTop" value="${c.gradTop}"></div>
        <div class="field"><label>Density at bottom <span class="opt-tag">%</span></label>
          <input type="text" inputmode="numeric" id="tintBottom" value="${c.gradBottom}"></div>`
        :`<div class="field"><label>Density <span class="opt-tag">% — max 85</span></label>
          <input type="text" inputmode="numeric" id="tintDensity" value="${c.density}"></div>
          <div class="field"><label>Finish</label>
            <select id="tintFinish">${['Standard','UV-stable','Fade-resistant'].map(x=>`<option ${c.finish===x?'selected':''}>${x}</option>`).join('')}</select></div>`}
      </div>
      <label class="confirmrow" style="margin-top:10px"><input type="checkbox" id="tintMatch" ${c.match?'checked':''}>
        <span>Match to a sample lens I'm sending in <span class="badge-rev" style="margin-left:5px">owner review</span></span></label>
    </div>`;
  const bind=(sel,key,num)=>{ const el=$(sel); if(el) el.addEventListener('input',e=>{
    S.tintCfg[key]= num ? Math.max(0,Math.min(85, parseInt(e.target.value,10)||0)) : e.target.value; render(); }); };
  bind('#tintColour','colour'); bind('#tintDensity','density',true);
  bind('#tintTop','gradTop',true); bind('#tintBottom','gradBottom',true); bind('#tintFinish','finish');
  const mt=$('#tintMatch'); if(mt) mt.addEventListener('change',e=>{ S.tintCfg.match=e.target.checked; render(); });
}

/* ---------- Chemistrie configurator ----------
   Option list and prices are a first pass — confirm against the Chemistrie page.
   Up to 3 clips per order, each with its own type/colour/magnet/bridge/crystal. */
const CHEM_TYPES=[
  {id:'sun',    n:'Chemistrie Sun',    d:'Magnetic sunlens overlay',            p:96},
  {id:'blue',   n:'Chemistrie Blue',   d:'Blue-light filtering overlay',        p:78},
  {id:'readers',n:'Chemistrie Readers',d:'Magnetic near-add overlay',           p:84},
  {id:'drive',  n:'Chemistrie Drive',  d:'Contrast-boosting driving overlay',   p:104}
];
const CHEM_COLOURS=[{id:'Grey',n:'Grey',hex:'#6B7280'},{id:'Brown',n:'Brown',hex:'#92400E'},
  {id:'G-15',n:'G-15',hex:'#4B5320'},{id:'Blue',n:'Blue',hex:'#1E40AF'},
  {id:'Copper',n:'Copper',hex:'#B45309'},{id:'Amber',n:'Amber',hex:'#D97706'},
  {id:'Pink',n:'Pink',hex:'#DB2777'},{id:'Purple',n:'Purple',hex:'#7C3AED'}];
const CHEM_MIRRORS=[{id:'silver',n:'Silver Mirror',p:26,hex:'#C0C0C0'},
  {id:'gold',n:'Gold Mirror',p:26,hex:'#D4AF37'},{id:'blue',n:'Blue Mirror',p:26,hex:'#3B82F6'},
  {id:'green',n:'Green Mirror',p:26,hex:'#16A34A'},{id:'rosegold',n:'Rose Gold Mirror',p:30,hex:'#C7849C'},
  {id:'red',n:'Red Mirror',p:30,hex:'#DC2626'},{id:'orange',n:'Orange Mirror',p:30,hex:'#EA580C'},
  {id:'purple',n:'Purple Mirror',p:30,hex:'#9333EA'}];
const CHEM_MAGNETS=[{id:'Black',n:'Black',hex:'#1A1A1A'},{id:'Silver',n:'Silver',hex:'#A8A9AD'},
  {id:'Gold',n:'Gold',hex:'#D4AF37'},{id:'Gunmetal',n:'Gunmetal',hex:'#2C3E50'}];
const CHEM_BRIDGES=[{id:'Bronze',n:'Bronze',hex:'#CD7F32'},{id:'Gunmetal',n:'Gunmetal',hex:'#2C3E50'},
  {id:'Gold',n:'Gold',hex:'#D4AF37'},{id:'Silver',n:'Silver',hex:'#A8A9AD'},{id:'Black',n:'Black',hex:'#1A1A1A'}];
const CHEM_CRYSTALS=[{id:'hematite',n:'Hematite Crystals',p:22,hex:'#55565A'},
  {id:'hyacinth',n:'Hyacinth Crystals',p:22,hex:'#D22630'},
  {id:'crystal-gold',n:'Crystal Gold Crystals',p:22,hex:'#D4AF37'},
  {id:'cobalt',n:'Cobalt Crystals',p:22,hex:'#2453B3'},
  {id:'aquamarine',n:'Aquamarine Crystals',p:22,hex:'#35B7E7'},
  {id:'emerald',n:'Emerald Crystals',p:22,hex:'#009B77'},
  {id:'olivine',n:'Olivine Crystals',p:22,hex:'#6B8E23'},
  {id:'amethyst',n:'Amethyst Crystals',p:22,hex:'#8E55B7'},
  {id:'fireopal',n:'Fireopal Crystals',p:26,hex:'#F36C21'},
  {id:'rose',n:'Rose Crystals',p:22,hex:'#EFA0B5'},
  {id:'topaz',n:'Topaz Crystals',p:22,hex:'#D99A27'},
  {id:'diamond',n:'Diamond Crystals',p:26,hex:'#F5F7FA'}];
const CHEM_MAX_CLIPS=3;
let chemClipSeq=0;
function newChemClip(){
  const used=new Set(S.chemClips.map(c=>c.type));
  const free=CHEM_TYPES.find(t=>!used.has(t.id));
  const type=(free||CHEM_TYPES[0]).id;
  return {id:'clip'+(++chemClipSeq),type,colour:'',mirror:'',
    polarised:type==='sun',add:'',magnet:'Black',bridge:'Black',crystal:'none'};
}
function chemClipComplete(c){
  if(!c||!c.type) return false;
  if(c.type==='readers'){
    const add=parseNum(c.add,true);
    return add!==null&&add>=.25&&add<=4.5;
  }
  const hasSolid=!!c.colour, hasMirror=!!c.mirror;
  return hasSolid!==hasMirror && (c.type!=='sun'||c.polarised===true);
}
function chemClipKey(c){ return [c.type,c.colour,c.mirror,c.polarised,c.add,c.magnet,c.bridge,c.crystal].join('|'); }
function chemDuplicateIds(){
  const seen=new Map(), dupes=new Set();
  S.chemClips.forEach(c=>{ const k=chemClipKey(c); if(seen.has(k)){ dupes.add(c.id); dupes.add(seen.get(k)); } else seen.set(k,c.id); });
  return dupes;
}
function chemSwatchHTML(c,field,label,items,placeholder,disabled){
  const current=items.find(x=>x.id===c[field]);
  const dot=x=>x?`<span class="chem-swatch-dot" style="--swatch:${x.hex}" aria-hidden="true"></span>`:'';
  return `<div class="field"><label>${label}</label>
    <details class="chem-swatch-select ${disabled?'disabled':''}" data-chem-field="${field}">
      <summary aria-disabled="${disabled?'true':'false'}"><span>${current?.n||placeholder}</span>${dot(current)}<span class="chem-swatch-chevron" aria-hidden="true">⌄</span></summary>
      <div class="chem-swatch-menu" role="listbox" aria-label="${label.replace(/<[^>]*>/g,'')}">
        <button type="button" role="option" aria-selected="${!c[field]}" data-clip="${c.id}" data-swatch-field="${field}" data-swatch-value=""><span>${placeholder}</span></button>
        ${items.map(x=>`<button type="button" role="option" aria-selected="${c[field]===x.id}" data-clip="${c.id}" data-swatch-field="${field}" data-swatch-value="${x.id}"><span>${x.n}</span>${dot(x)}</button>`).join('')}
      </div>
    </details></div>`;
}
function chemClipCardHTML(c,i){
  const t=CHEM_TYPES.find(x=>x.id===c.type)||CHEM_TYPES[0];
  const dupes=chemDuplicateIds();
  return `
    <div class="callout ${dupes.has(c.id)?'gold':''}" style="margin-top:12px;display:block">
      <div class="blk" style="margin-bottom:8px;justify-content:space-between">
        <span>Clip ${i+1} of ${S.chemClips.length} · layer type</span>
        ${S.chemClips.length>1?`<button type="button" class="iconbtn sm" data-rmclip="${c.id}" title="Remove this clip">✕</button>`:''}
      </div>
      <div class="opts">${CHEM_TYPES.map(x=>`
        <div class="opt ${c.type===x.id?'sel':''}" data-clip="${c.id}" data-chem="${x.id}" tabindex="0">
          <div class="on">${x.n}</div><div class="od">${x.d}</div></div>`).join('')}</div>
      <div class="grid g3" style="margin-top:13px">
        ${t.id!=='readers'?`
        ${chemSwatchHTML(c,'colour',`${t.id==='sun'?'Solid polarised':'Solid lens colour'} <span class="req">*</span>`,CHEM_COLOURS,'Select a colour',!!c.mirror)}
        ${chemSwatchHTML(c,'mirror',`${t.id==='sun'?'Mirror polarised':'Mirror finish'} <span class="req">*</span>`,CHEM_MIRRORS,'Select a mirror finish',!!c.colour)}`:''}
        ${t.id==='sun'||t.id==='drive'?`
        <div class="field"><label>Polarised</label>
          <select data-clip="${c.id}" data-field="polarised" ${t.id==='sun'?'disabled aria-disabled="true"':''}><option value="no" ${!c.polarised?'selected':''}>No</option><option value="yes" ${c.polarised?'selected':''}>Yes</option></select></div>`:''}
        ${t.id==='readers'?`
        <div class="field"><label>Near add <span class="req">*</span></label>
          <input type="text" inputmode="decimal" data-clip="${c.id}" data-field="add" value="${c.add||''}" placeholder="+2.00"></div>`:''}
      </div>
      <div class="blk" style="margin:13px 0 8px">Clip hardware</div>
      <div class="grid g3">
        ${chemSwatchHTML(c,'magnet','Magnet colour',CHEM_MAGNETS,'Select a magnet colour',false)}
        ${chemSwatchHTML(c,'bridge','Bridge colour',CHEM_BRIDGES,'Select a bridge colour',false)}
        ${chemSwatchHTML(c,'crystal','Crystal colour <span class="opt-tag">optional accent</span>',CHEM_CRYSTALS,'None',false)}
      </div>
      ${dupes.has(c.id)?`<p class="hint" style="margin-top:9px;color:hsl(38 70% 30%)">⚠ Identical to another clip on this order — change an option here or remove one.</p>`:''}
      ${!chemClipComplete(c)?`<p class="hint chem-required" style="margin-top:9px;color:var(--danger)">Complete this clip before leaving the section.</p>`:''}
      <p class="hint" style="margin-top:9px">Cut to the same shape as the main order — the frame trace or standard shape above is reused, so it clips flush.</p>
    </div>`;
}
function renderChemCfg(){
  const box=$('#chemCfg'), on=S.chemClips.length>0;
  const incomplete=on&&(!S.chemClips.every(chemClipComplete)||chemDuplicateIds().size>0);
  $('#chemBlock').classList.toggle('chem-incomplete',incomplete);
  $('#chemToggle').classList.toggle('sel',on);
  $('#chemOn').checked=on;
  if(!on){ box.innerHTML=''; return; }
  const canAdd=S.chemClips.length<CHEM_MAX_CLIPS;
  box.innerHTML=S.chemClips.map((c,i)=>chemClipCardHTML(c,i)).join('')
    + `<div style="margin-top:11px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        ${canAdd?`<button type="button" class="linkbtn" id="chemAddClip">+ Add another clip</button>`
                :`<span class="hint" style="margin:0">Maximum of 3 clips per order.</span>`}
        <span class="clipcount">${S.chemClips.length} / ${CHEM_MAX_CLIPS} clips</span>
      </div>`;
  $$('#chemCfg [data-chem]').forEach(el=>el.addEventListener('click',()=>{
    const clip=S.chemClips.find(x=>x.id===el.dataset.clip); if(clip&&clip.type!==el.dataset.chem){
      clip.type=el.dataset.chem; clip.colour=''; clip.mirror=''; clip.add=''; clip.polarised=clip.type==='sun'; render();
    }
  }));
  $$('#chemCfg [data-field]').forEach(el=>{
    el.addEventListener('input',e=>{
      const clip=S.chemClips.find(x=>x.id===el.dataset.clip); if(!clip) return;
      const f=el.dataset.field;
      clip[f]=f==='polarised'?(e.target.value==='yes'):e.target.value;
      if(f==='colour'&&clip.colour) clip.mirror='';
      if(f==='mirror'&&clip.mirror) clip.colour='';
      if(clip.type==='sun') clip.polarised=true;
      render();
    });
  });
  $$('#chemCfg [data-swatch-field]').forEach(el=>el.addEventListener('click',()=>{
    const clip=S.chemClips.find(x=>x.id===el.dataset.clip); if(!clip) return;
    const f=el.dataset.swatchField;
    clip[f]=el.dataset.swatchValue;
    if(f==='colour'&&clip.colour) clip.mirror='';
    if(f==='mirror'&&clip.mirror) clip.colour='';
    render();
  }));
  $$('#chemCfg [data-rmclip]').forEach(b=>b.addEventListener('click',()=>{
    S.chemClips=S.chemClips.filter(c=>c.id!==b.dataset.rmclip); render();
    toast('Clip removed');
  }));
  const addBtn=$('#chemAddClip');
  if(addBtn) addBtn.addEventListener('click',()=>{
    if(S.chemClips.length>=CHEM_MAX_CLIPS) return;
    S.chemClips.push(newChemClip()); render();
    toast('Clip '+S.chemClips.length+' added — configure it below');
  });
}
const CHEM_NOTES_START='[Chemistrie specifications]';
const CHEM_NOTES_END='[/Chemistrie specifications]';
function chemChoiceName(items,id,fallback){
  return items.find(x=>x.id===id)?.n || fallback;
}
function chemClipParts(c){
  const type=CHEM_TYPES.find(x=>x.id===c.type)||CHEM_TYPES[0];
  const parts=[type.n];
  if(type.id==='readers'){
    const nearAdd=parseNum(c.add,true);
    parts.push('Near add: '+(nearAdd===null?'—':sgn(nearAdd)));
  } else {
    if(c.colour) parts.push('Solid polarised: '+chemChoiceName(CHEM_COLOURS,c.colour,c.colour));
    if(c.mirror) parts.push('Mirror polarised: '+chemChoiceName(CHEM_MIRRORS,c.mirror,c.mirror));
  }
  if(type.id==='sun'||type.id==='drive') parts.push('Polarised: '+(c.polarised?'Yes':'No'));
  parts.push('Magnet: '+chemChoiceName(CHEM_MAGNETS,c.magnet,'Black'));
  parts.push('Bridge: '+chemChoiceName(CHEM_BRIDGES,c.bridge,'Black'));
  parts.push('Crystal: '+chemChoiceName(CHEM_CRYSTALS,c.crystal,'None'));
  return parts;
}
function chemClipSummary(c,index){
  return 'Chemistrie clip '+(index+1)+' — '+chemClipParts(c).join(' · ');
}
function chemLabNotes(){
  if(!S.chemClips.length) return '';
  return CHEM_NOTES_START+'\n'+S.chemClips.map((c,index)=>chemClipSummary(c,index)).join('\n')+'\n'+CHEM_NOTES_END;
}
function stripChemNotes(value){
  return String(value||'').replace(new RegExp('\\s*'+CHEM_NOTES_START.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\\s\\S]*?'+CHEM_NOTES_END.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*','g'),'\n').trim();
}
function notesWithChemistrie(manualNotes){
  return [stripChemNotes(manualNotes),chemLabNotes()].filter(Boolean).join('\n\n');
}
function chemPriceLines(){
  return S.chemClips.map((c,i)=>{
    const t=CHEM_TYPES.find(x=>x.id===c.type)||CHEM_TYPES[0];
    let v=t.p, bits=[t.n];
    if(t.id!=='readers'){
      const mir=CHEM_MIRRORS.find(x=>x.id===c.mirror);
      if(mir&&mir.p){ v+=mir.p; bits.push(mir.n); }
      if(c.colour) bits.push(CHEM_COLOURS.find(x=>x.id===c.colour)?.n||c.colour);
    }
    if((t.id==='sun'||t.id==='drive')&&c.polarised){ v+=34; bits.push('polarised'); }
    if(c.magnet&&c.magnet!=='Black') bits.push(c.magnet+' magnet');
    if(c.bridge&&c.bridge!=='Black') bits.push(c.bridge+' bridge');
    const cr=CHEM_CRYSTALS.find(x=>x.id===c.crystal);
    if(cr&&cr.id!=='none'){ v+=cr.p||0; bits.push(cr.n); }
    return {n:'Chemistrie layer'+(S.chemClips.length>1?' '+(i+1):''), i:bits.join(' · '), v, rm:{type:'chem',id:c.id}};
  });
}

/* ---------- suggestions ---------- */
function suggestions(){
  if(S.suggOff) return [];
  const out=[], eyes=activeEyes().map(readRow);
  const maxSph=Math.max(...eyes.map(r=>Math.abs(r.sph||0)),0);
  const maxCyl=Math.max(...eyes.map(r=>Math.abs(r.cyl||0)),0);
  const aniso=eyes.length===2?Math.abs((eyes[0].sph||0)-(eyes[1].sph||0)):0;
  if(maxSph>=6||maxCyl>=4) out.push({id:'sp-thin',why:`Power reaches ${maxSph.toFixed(2)} — thinning keeps the edge wearable`});
  if(maxSph>=8) out.push({id:'sp-roll',why:'High minus edge will show without polishing'});
  if(maxSph>=12) out.push({id:'sp-lent',why:'Beyond ±12.00 a lenticular carrier is usually the only producible option'});
  if(aniso>=2&&S.vision==='mf') out.push({id:'sp-slab',why:`${aniso.toFixed(2)} difference between eyes causes vertical imbalance at near`});
  /* Live catalogues can legitimately omit prototype-only specialty services.
     Do not offer a suggestion unless its treatment definition is currently
     orderable; renderSuggestions needs the definition's label and id. */
  return out.filter(s=>TREAT.some(t=>t.id===s.id)&&!S.dismissed.has(s.id)&&!S.treat.has(s.id));
}
function renderSuggestions(){
  const box=$('#suggBlock'), list=suggestions();
  const acc=TREAT.filter(t=>t.rev&&S.treat.has(t.id));
  S.ownerReview=acc.length>0;
  if(!list.length&&!acc.length){ box.classList.add('hide'); box.innerHTML=''; return; }
  box.classList.remove('hide');
  let html='';
  if(list.length){
    html+=`<div class="sugg"><button class="sx" id="suggX" title="Dismiss all suggestions">✕</button>
      <h4>⚡ Suggested for this prescription</h4>
      <div class="sd">Based on the powers entered. Anything added here needs owner sign-off before production.</div>`;
    list.forEach(s=>{ const t=TREAT.find(x=>x.id===s.id);
      html+=`<div class="sitem"><span style="min-width:0"><span class="sn">${t.n}</span><span class="sr">${s.why}</span></span>
        <button class="btn btn-primary" data-add="${t.id}">Add</button>
        <button class="btn btn-ghost" data-skip="${t.id}">Skip</button></div>`; });
    html+='</div>';
  }
  if(acc.length) html+=`<div class="callout gold" style="margin-top:${list.length?'11px':'0'}"><span class="ci">⚑</span>
    <span><b>Owner review required.</b> ${acc.map(t=>t.n).join(', ')} ${acc.length>1?'are':'is'} priced provisionally. The order still submits and locks at this quote — production starts once an owner approves.</span></div>`;
  box.innerHTML=html;
  $$('#suggBlock [data-add]').forEach(b=>b.addEventListener('click',()=>toggleTreat(b.dataset.add)));
  $$('#suggBlock [data-skip]').forEach(b=>b.addEventListener('click',()=>{S.dismissed.add(b.dataset.skip);render();}));
  const x=$('#suggX'); if(x) x.addEventListener('click',()=>{S.suggOff=true;render();toast('Suggestions hidden for this order');});
}

/* ---------- pricing ---------- */
function price(){
  const lines=[];
  const sides=activeSides();
  if(!sides.every(lensComplete)) return {lines,sub:0,ready:false,unpriced:false};
  const split=splitActive();
  /* A split pair is two half-pairs. Charging each side the FULL pair price
     would double the job; charging each the engine's existing single-lens rate
     (0.55, applied below for one-eye jobs) would make a split pair of two
     identical lenses cost 110% of the same unsplit pair. Half of each side's
     pair price is the only split that stays consistent with the unsplit
     price when both sides match. */
  let unpriced=false;
  sides.forEach(side=>{
    const t=lensTriple(side);
    const d=DESIGNS.find(x=>x.id===t.d), m=MATERIALS.find(x=>x.id===t.m), c=COLOURS.find(x=>x.id===t.c);
    /* An adapter that answers null means the combination has no price on this
       account's matrix — "not offered". That is NOT the same as costing zero, and
       collapsing the two would let a $0.00 order through. Without an adapter at
       all (the standalone prototype) the synthetic base+upcharge still applies. */
    const quoted=ADAPTER.lensPrice?ADAPTER.lensPrice(t.m,t.d,t.c):undefined;
    const sideUnpriced=!!ADAPTER.lensPrice&&quoted==null;
    if(sideUnpriced) unpriced=true;
    /* Every physical lens gets its own priced line. An unsplit pair still
       represents two lenses, so split its pair price evenly into OD and OS;
       that makes saved-draft and invoice detail match the lab payload without
       changing the total. */
    const pricedEyes=split
      ? [side==='a'?'od':'os']
      : S.eyes==='pair' ? ['od','os'] : [activeEyes()[0]];
    const share=(split||pricedEyes.length===2)?0.5:1;
    pricedEyes.forEach(eye=>{
      const eyeLabel=eye==='od'?'OD':'OS';
      const eyeTag=`${eyeLabel} · `;
      lines.push({n:`${eyeLabel} ${d.n}`,i:`${eyeTag}${m.n} · ${c.n}`,
        v:sideUnpriced?0:(quoted??(d.base+m.up))*share,unpriced:sideUnpriced,eye,lens:true}); /* the lens itself — not removable from the quote */
      /* Colour upgrades apply to each physical lens, just as the base lens
         does. Splitting the pair here keeps the displayed line total exact. */
      if(c.up) lines.push({n:`${eyeLabel} ${c.n}`,i:'Extra over Clear · same material & design',v:c.up*share,eye});
    });
    /* colour upcharge is a flat add-on regardless of material/design, so it already
       equals the delta vs Clear (which is always up:0 and simply shows no line) —
       the label now says so explicitly, per feedback asking "how much extra is it". */
  });
  Array.from(S.treat).forEach(id=>{const t=TREAT.find(x=>x.id===id); if(t){
    let detail=t.c;
    if(/^tn-/.test(id)){ detail=S.tintCfg.colour+(/grad/.test(id)?` · ${S.tintCfg.gradTop}→${S.tintCfg.gradBottom}%`:` · ${S.tintCfg.density}%`); }
    lines.push({n:t.n,i:detail,v:t.p + (/^tn-/.test(id)&&S.tintCfg.match?9:0),rm:{type:'treat',id}});
  }});
  chemPriceLines().forEach(l=>lines.push(l));
  const eyes=activeEyes().map(readRow);
  const prism=Math.max(...eyes.map(r=>r.prism||0),0);
  if(prism>0) lines.push({n:'Prism',i:prism.toFixed(2)+'Δ ground in',v:16+prism*4});
  const dia=effDiam();
  if(dia>=75) lines.push({n:'Oversize blank',i:dia+' mm',v:dia>=80?32:22});
  const hi=Math.max(...eyes.map(r=>Math.abs(r.sph||0)),0);
  if(hi>6) lines.push({n:'High-power surfacing',i:'beyond ±6.00',v:18});
  if(S.scope!=='uncut'){
    const mt=$('#mount').value, base=mt==='rimless'?42:(mt==='grooved'?31:17);
    lines.push({n:S.scope==='remote'?'Remote edge to trace':'Glazing & mounting',
      i:mt==='rimless'?'Rimless drill mount':(mt==='grooved'?'Grooved / nylon':(mt==='metal'?'Metal':'Plastic')),
      v:S.scope==='remote'?base+6:base});
  }
  let sub=lines.reduce((a,l)=>a+l.v,0);
  if(S.eyes!=='pair'){ sub*=.55; lines.forEach(l=>l.v*=.55); }
  if($('#service').value==='pri'){ const f=sub*.15; lines.push({n:'Priority service',i:'3 working days',v:f}); sub+=f; }
  return {lines,sub,ready:true,unpriced};
}

/* ---------- section validity ---------- */
function secValid(){
  const eyes=activeEyes(), rows=eyes.map(e=>({e,r:readRow(e)}));
  const num=id=>parseNum($('#'+id).value);
  const patient=!!$('#pfirst').value.trim()&&!!$('#plast').value.trim();
  const frame=!!$('#fname').value.trim()&&!!$('#mount').value&&num('fa')!==null&&num('fb')!==null&&num('fed')!==null&&num('fdbl')!==null
    &&limitErrors().length===0
    &&(!S.shape||S.shapeOk||S.scope!=='remote')
    &&(S.scope!=='remote'||!!S.file);
  const lens=activeSides().every(lensComplete);
  const rxOk=rows.every(x=>x.r.sph!==null&&Math.abs(x.r.sph)<=25)
    &&rows.every(x=>!x.r.cyl||x.r.cyl===0||(x.r.axis!==null&&x.r.axis>=1&&x.r.axis<=180))
    &&(!needsAdd()||rows.every(x=>x.r.add!==null&&x.r.add>=.25&&x.r.add<=4.5))
    &&rows.every(x=>x.r.pd!==null&&x.r.pd>=20&&x.r.pd<=45)
    &&(!needsNearPD()||rows.every(x=>x.r.npd!==null&&x.r.npd>=18&&x.r.npd<=45))
    &&(!needsHt()||rows.every(x=>x.r.ht!==null&&x.r.ht>=(isProg()?14:12)&&x.r.ht<=35))
    &&errors().length===0;
  const chemOk=S.chemClips.every(chemClipComplete)&&chemDuplicateIds().size===0&&addonIssues().length===0;
  return {'sec-patient':patient,'sec-frame':frame,'sec-lens':lens,'sec-rx':rxOk,'sec-treat':chemOk,'sec-notes':true};
}
const SECTION_IDS=['sec-patient','sec-frame','sec-lens','sec-rx','sec-treat','sec-notes'];
const selectLabel=id=>{
  const el=$('#'+id);
  return el?.selectedOptions?.[0]?.textContent?.trim()||el?.value||'';
};
function sectionHasCapturedData(id){
  if(id==='sec-patient'||id==='sec-frame'||id==='sec-lens'||id==='sec-rx') return true;
  /* Deliberately NOT "has a treatment selected": a job with no coatings at all
     is a real answer, and one mid-selection looks identical to one that's
     finished. The section folds when the dispenser says it's finished. */
  if(id==='sec-treat') return S.treatConfirmed;
  return !!$('#notes').value.trim()||$('#service').value!=='std'||$('#delivery').selectedIndex!==0||S.notesConfirmed;
}
/* A pristine, never-touched form. Saving that as a draft just clutters
   Saved Drafts with an empty entry — if the account already has drafts,
   the save-draft buttons redirect there instead (see shouldOfferGoToDrafts). */
function orderIsEmpty(){
  const patientBlank=!$('#pfirst').value.trim()&&!$('#plast').value.trim()&&!$('#ref').value.trim();
  const frameBlank=!$('#fname').value.trim()&&parseNum($('#fa').value)===null&&parseNum($('#fb').value)===null&&parseNum($('#fdbl').value)===null&&!S.shape;
  const lensBlank=!(S.m||S.d||S.c||S.m2||S.d2||S.c2);
  const rxBlank=activeEyes().every(e=>{
    const r=readRow(e);
    return r.sph===null&&r.cyl===null&&r.axis===null&&r.add===null&&r.pd===null&&r.npd===null&&r.ht===null&&!r.prism;
  });
  const treatBlank=S.treat.size===0&&S.chemClips.length===0;
  const notesBlank=!$('#notes').value.trim();
  return patientBlank&&frameBlank&&lensBlank&&rxBlank&&treatBlank&&notesBlank;
}
function shouldOfferGoToDrafts(){ return !!ADAPTER.hasSavedDrafts&&orderIsEmpty(); }
/* sec-rx and sec-treat need real line breaks (values crammed onto one line
   were unreadable) — those two return HTML and are rendered via innerHTML;
   everything else stays plain text since patient/frame names are free-typed. */
function sectionSummary(id){
  if(id==='sec-patient'){
    const ref=$('#ref').value.trim();
    return [$('#pfirst').value.trim()+' '+$('#plast').value.trim(),ref&&'Ref '+ref].filter(Boolean).join(' · ');
  }
  if(id==='sec-frame'){
    const mountSel=$('#mount'), mount=mountSel.selectedIndex>0?mountSel.options[mountSel.selectedIndex].text:'';
    return [$('#fname').value.trim(),mount,
      `A ${$('#fa').value} · B ${$('#fb').value} · ED ${$('#fed').value} · DBL ${$('#fdbl').value}`,
      S.scope==='remote'?'Remote edge':S.scope==='glaze'?'Full glaze':'Uncut'].filter(Boolean).join(' · ');
  }
  if(id==='sec-lens') return splitActive()
    ? `OD ${namedLens('a')||'—'}  │  OS ${namedLens('b')||'—'}`
    : (namedLens('a')||'');
  if(id==='sec-rx'){
    const htLbl=S.vision!=='mf'?'OC Ht':(isProg()?'Fitting Ht':'Segment Ht');
    const columns=[['sph','Sphere'],['cyl','Cylinder'],['axis','Axis']];
    if(needsAdd()) columns.push(['add','Add']);
    columns.push(['pd','Dist PD']);
    if(needsNearPD()) columns.push(['npd','Near PD']);
    if(needsHt()) columns.push(['ht',htLbl]);
    columns.push(['prism','Prism'],['base','Base']);
    const display=(e,key)=>{
      const r=readRow(e);
      const v=r[key];
      if(key==='base') return v||'—';
      if(v===null||v===undefined) return '—';
      if(key==='sph'||key==='cyl'||key==='add') return sgn(v);
      if(key==='pd'||key==='npd'||key==='ht') return Number(v).toFixed(1);
      if(key==='prism') return Number(v).toFixed(2);
      return String(v);
    };
    const style=`grid-template-columns:minmax(54px,.8fr) repeat(${columns.length},minmax(68px,1fr));min-width:${54+columns.length*68}px`;
    return `<div class="rx-summary-grid" style="${style}" role="table" aria-label="Prescription summary">
      <div class="rx-summary-head" role="columnheader">Eye</div>${columns.map(([,label])=>`<div class="rx-summary-head" role="columnheader">${label}</div>`).join('')}
      ${activeEyes().map(e=>`<div class="rx-summary-eye" role="rowheader"><b>${e.toUpperCase()}</b><span>${e==='od'?'Right':'Left'}</span></div>${columns.map(([key])=>`<div class="rx-summary-value" role="cell">${display(e,key)}</div>`).join('')}`).join('')}
    </div>`;
  }
  if(id==='sec-treat'){
    const items=Array.from(S.treat).map(tid=>{
      const t=TREAT.find(x=>x.id===tid); if(!t) return '';
      const detail=/^tn-/.test(tid)
        ? S.tintCfg.colour+(/grad/.test(tid)?` · ${S.tintCfg.gradTop}→${S.tintCfg.gradBottom}%`:` · ${S.tintCfg.density}%`)
        : t.d;
      return `<b>${t.n}</b> — ${detail}`;
    }).filter(Boolean);
    S.chemClips.forEach((clip,index)=>items.push(`<b>Chemistrie clip ${index+1}</b> — ${chemClipParts(clip).join(' · ')}`));
    return items.join('<br>');
  }
  return [selectLabel('service'),selectLabel('delivery'),($('#notes').value.trim()||chemLabNotes())&&'Lab notes added'].filter(Boolean).join(' · ');
}
const MULTILINE_SUMMARY_SECTIONS=new Set(['sec-rx','sec-treat']);
function syncSectionCollapse(V){
  const justCollapsed=[];
  SECTION_IDS.forEach(id=>{
    const section=$('#'+id); if(!section) return;
    /* A section only folds once it is actually complete. In particular, a
       restored prescription can already contain sphere/cylinder while still
       needing dispensing PDs or heights; collapsing it at that point hides
       the controls the customer must use to finish the order. */
    const complete=!!V[id]&&sectionHasCapturedData(id);
    const wasCollapsed=S.collapsedSections.has(id);
    if(!complete){ S.collapsedSections.delete(id); S.editingSections.delete(id); }
    else if(!S.editingSections.has(id)&&!section.contains(document.activeElement)) S.collapsedSections.add(id);
    const collapsed=S.collapsedSections.has(id);
    if(collapsed&&!wasCollapsed) justCollapsed.push(section);
    section.classList.toggle('section-collapsed',collapsed);
    const summary=section.querySelector('.section-summary');
    const multiline=MULTILINE_SUMMARY_SECTIONS.has(id);
    if(summary){
      summary.classList.toggle('multiline',multiline);
      const text=collapsed?sectionSummary(id):'';
      if(multiline) summary.innerHTML=text; else summary.textContent=text;
    }
  });
  /* A section finishing and folding shut (see the animated .card-b/.section-summary
     rules in rx-order.css) removes a chunk of page height from under the user
     without moving the scroll position to compensate — the page silently
     jumps and their place is lost. Bring the collapsed section itself back to
     a stable spot once the animation has had a moment to run. Only for a
     single section completing in the ordinary course of filling the form —
     a prefill/draft-restore can collapse several sections in the same pass,
     and repeatedly yanking the scroll position around for that would be
     worse, not better. */
  if(justCollapsed.length===1){
    const section=justCollapsed[0];
    setTimeout(()=>{ section.scrollIntoView({behavior:'smooth',block:'start'}); },260);
  }
}
function openSection(id){
  const section=$('#'+id); if(!section) return;
  S.collapsedSections.delete(id); S.editingSections.add(id); render();
  section.scrollIntoView?.({behavior:'smooth',block:'start'});
  setTimeout(()=>{
    /* skip hidden fields (e.g. the file inputs behind drag-and-drop zones) —
       focusing one silently fails and leaves activeElement on <body>, which
       reads as "focus left the section" and immediately re-collapses it. */
    const fields=[...section.querySelectorAll('input:not([disabled]),select:not([disabled]),textarea:not([disabled])')];
    const field=fields.find(f=>f.offsetParent!==null);
    if(field) field.focus();
  },0);
}
function errors(){
  const out=[];
  activeEyes().forEach(e=>{
    const r=readRow(e), E=e.toUpperCase();
    if(r.sph!==null&&(r.sph>18||r.sph<-25)) out.push({t:`${E} sphere is outside the producible range (+18.00 to -25.00).`,e,f:'sph'});
    if(r.cyl!==null&&Math.abs(r.cyl)>8) out.push({t:`${E} cylinder beyond -8.00 needs a lab consult.`,e,f:'cyl'});
    if(r.add!==null&&r.add>4.5) out.push({t:`${E} add above +4.50 is not producible.`,e,f:'add'});
    if(r.prism&&r.prism>0&&!r.base) out.push({t:`${E} prism needs a base direction.`,e,f:'base'});
    if(needsHt()&&isProg()&&r.ht!==null&&r.ht<14) out.push({t:`${E} fitting height ${r.ht.toFixed(1)} mm — progressives cannot be cut below 14 mm.`,e,f:'ht'});
    if(needsNearPD()&&r.npd!==null&&r.pd!==null&&r.npd>r.pd) out.push({t:`${E} near PD is wider than distance PD — check the measurement.`,e,f:'npd'});
  });
  return out;
}
function warnings(){
  const out=[];
  if(S.eyes==='pair'){
    const a=readRow('od').sph, b=readRow('os').sph;
    if(a!==null&&b!==null&&a*b<0&&!S.warnOff.has('sign'))
      out.push({id:'sign',t:`Right eye is ${sgn(a)} and left is ${sgn(b)} — opposing signs. Unusual but not impossible; dismiss if intended.`});
  }
  return out;
}
function prompts(){
  const out=[];
  activeEyes().forEach(e=>{
    const r=readRow(e);
    if(r.axis!==null&&(!r.cyl||r.cyl===0)) out.push({e,t:`${e.toUpperCase()} has an axis but no cylinder — is the cylinder missing?`});
  });
  return out;
}

/* ---------- render ---------- */
let lastTotal=null;
function render(){
  /* A confirmation is only ever about the shape AS MEASURED. If one of the box
     figures is cleared after the fact, what was verified no longer exists, so
     the confirmation is withdrawn rather than left standing over a gap. */
  if(S.shapeOk&&!frameBoxComplete()) S.shapeOk=false;
  /* conditional fields */
  $$('.c-add').forEach(el=>el.classList.toggle('hide',!needsAdd()));
  /* height is retained (not hidden) for single vision too — it just means
     something different per lens type, so the header relabels instead. */
  $$('.c-ht').forEach(el=>el.classList.remove('hide'));
  $('#htLabel').textContent=S.vision!=='mf'?'OC Ht':(isProg()?'Fitting Ht':'Segment Ht');
  $$('.c-npd').forEach(el=>el.classList.toggle('hide',!needsNearPD()));
  $('#corridorField').classList.toggle('hide',!isProg());
  $('#purposeBlock').classList.toggle('hide',S.vision!=='sv');
  $('#purposeNote').textContent=S.purpose==='dist'?'Distance Rx — distance PD only.'
    :S.purpose==='read'?'Reading Rx — near PD collected instead of fitting height.'
    :'Intermediate Rx — near PD collected; note the working distance below.';
  ['od','os'].forEach(e=>{
    const on=activeEyes().includes(e);
    $(`tr[data-eye="${e}"]`).classList.toggle('off',!on);
    rowEls(e).forEach(i=>i.disabled=!on);
  });
  syncED(); fillDiam();
  if(typeof updatePreview==='function') updatePreview();
  if(typeof collapseFrame==='function') collapseFrame();

  /* frame measurement limits */
  const lim=limitErrors();
  Object.keys(LIMITS).forEach(id=>$('#'+id).closest('.field').classList.remove('invalid'));
  lim.forEach(e=>$('#'+e.id).closest('.field').classList.add('invalid'));
  let lb=$('#limitBox');
  if(lim.length){
    if(!lb){ lb=document.createElement('div'); lb.id='limitBox'; lb.style.marginTop='12px';
      $('#fa').closest('.card-b').appendChild(lb); }
    lb.innerHTML=`<div class="callout gold"><span class="ci">⚠</span><span>${lim.map(e=>`<div>${e.t}</div>`).join('')}</span></div>`;
  } else if(lb) lb.remove();

  /* quote */
  const c=CUR[S.cur], {lines,sub,ready,unpriced}=price(), conv=n=>n*c.rate, total=conv(sub);
  const show=S.pricesOn;
  $('#qLines').innerHTML=!ready
    ? '<div class="qempty">No lens chosen yet — the quote fills in as you select.</div>'
    : lines.map(l=>`<div class="qline ${show?'':'masked'}"><span class="qn"><span class="qn-name"><b>${l.n}</b>${l.rm?`<button type="button" class="qline-rm" data-rmtype="${l.rm.type}" data-rmid="${l.rm.id}" title="Remove from order">✕</button>`:''}</span><i>${l.i}</i></span><span class="qv">${l.unpriced?'on request':(show?money(conv(l.v)):'••••')}</span></div>`).join('');
  /* A total of 0.00 beside an "on request" line reads as free. Say what it is. */
  const onRequest=show&&unpriced;
  $('#qSubtotal').textContent=onRequest?'on request':(show?c.sym+' '+money(conv(sub)):'——');
  /* Only BBD and USD are transactional; anything else is a courtesy conversion
     and must say so, or a customer will treat it as the price they will pay. */
  const indicative=!!c.indicative;
  /* an indicative display currency isn't what actually bills — show the real
     USD amount alongside it so it matches what checkout will charge. */
  const usdNote=indicative&&CUR.USD?` (USD ${money(sub*CUR.USD.rate)})`:'';
  $('#qTotal').textContent=onRequest?'on request':(show?c.sym+' '+money(total)+usdNote:'——');
  $('#qCur').textContent=show?c.sym:''; $('#curChip').textContent=c.sym;
  $('#qLabel').textContent=show?'Live quote · '+S.cur:'Order summary';
  $('#mCur').textContent=show?'order total':'Pricing not shown on this account';
  $('#qSub').textContent=!show?'confirmed with you before production'
    :(!ready?'choose a lens to start pricing'
      :unpriced?'this lens is not on your pricelist — save as a draft and we will quote it'
      :(S.eyes==='pair'?'per pair':(S.eyes==='od'?'right lens only':'left lens only'))
        +(indicative?` · ${S.cur} shown for guidance, billed in USD`:' · updates as you type'));
  const amt=$('#qAmt'); amt.textContent=onRequest?'on request':(show?money(total):'——');
  $('#mAmt').textContent=onRequest?'on request':(show?c.sym+' '+money(total):'——');
  if(show&&lastTotal!==null&&Math.abs(total-lastTotal)>.001){amt.classList.remove('pulse');void amt.offsetWidth;amt.classList.add('pulse');}
  lastTotal=total;
  let np=$('#noPricingNote');
  if(!show){
    if(!np){ np=document.createElement('div'); np.id='noPricingNote'; np.className='nopricing';
      $('#qLines').parentElement.insertBefore(np,$('#qLines')); }
    np.innerHTML='<b>Your order details are ready to review.</b><br>You can complete and submit this order as normal. We will confirm the final order details before production.';
  } else if(np) np.remove();

  renderAddonIssues();
  renderSuggestions(); renderChips();
  if(typeof renderTintCfg==='function') renderTintCfg();
  if(typeof renderChemCfg==='function') renderChemCfg();
  const advS=$('#advSummary');
  if(advS) advS.textContent = effDiam()+' mm blank'+(isProg()?' · '+$('#corridor').value+' mm corridor':'');
  $('#qFlag').classList.toggle('hide',!S.ownerReview);
  $('#qFlagTxt').textContent='Owner review required before production — quote still locks at submit.';

  /* errors, warnings, prompts */
  $$('.rxtable td').forEach(td=>td.classList.remove('cellerr'));
  const errs=errors();
  errs.forEach(x=>{const el=cell(x.e,x.f); if(el) el.parentElement.classList.add('cellerr');});
  const warns=warnings();
  $('#rxErrors').innerHTML=[
    errs.length?`<div class="callout gold"><span class="ci">⚠</span><span>${errs.map(x=>`<div>${x.t}</div>`).join('')}</span></div>`:'',
    warns.map(w=>`<div class="callout" style="margin-top:8px"><span class="ci">ⓘ</span><span>${w.t}</span><button class="cx" data-warn="${w.id}">✕</button></div>`).join('')
  ].join('');
  $$('#rxErrors [data-warn]').forEach(b=>b.addEventListener('click',()=>{S.warnOff.add(b.dataset.warn);render();}));
  $('#rxPrompts').innerHTML=prompts().map(p=>`<div class="prompt"><span>❓</span><span style="flex:1">${p.t}</span>
    <button class="btn btn-primary" data-pcyl="${p.e}">Add cylinder</button>
    <button class="btn btn-ghost" data-pax="${p.e}">Remove axis</button></div>`).join('');
  $$('#rxPrompts [data-pcyl]').forEach(b=>b.addEventListener('click',()=>{const el=cell(b.dataset.pcyl,'cyl'); el.focus(); el.select();}));
  $$('#rxPrompts [data-pax]').forEach(b=>b.addEventListener('click',()=>{cell(b.dataset.pax,'axis').value='';render();}));

  /* progressive disclosure */
  const V=secValid(), ids=SECTION_IDS;
  let gate=true, firstLocked=null;
  ids.forEach(id=>{
    const el=$('#'+id), show=S.revealAll||gate;
    if(show&&el.classList.contains('hide')) el.classList.add('reveal');
    el.classList.toggle('hide',!show);
    el.classList.toggle('ok',!!V[id]);
    if(!V[id]&&gate&&!firstLocked) firstLocked=id;
    if(!V[id]) gate=false;
  });
  const cue=$('#nextCue');
  if(!S.revealAll&&firstLocked&&firstLocked!=='sec-notes'){
    const names={'sec-patient':'Frame & measurements','sec-frame':'Lens selection','sec-lens':'Prescription','sec-rx':'Coatings & treatments','sec-treat':'Delivery & notes'};
    cue.classList.remove('hide');
    cue.innerHTML=`<span class="lk">🔒</span><span>Finish <b>${$('#'+firstLocked+' h2').textContent}</b> and <b>${names[firstLocked]}</b> opens next.</span>`;
  } else cue.classList.add('hide');

  syncSectionCollapse(V);

  /* checklist */
  const checks=[
    {t:'Patient name',ok:V['sec-patient'],go:'#sec-patient'},
    {t:'Job type & frame measurements',ok:V['sec-frame'],go:'#sec-frame'},
    {t:'Material, design & colour',ok:V['sec-lens'],go:'#sec-lens'},
    {t:'Prescription complete & valid',ok:V['sec-rx'],go:'#sec-rx'}
  ];
  /* Only appears once something is actually wrong with the coatings — a
     permanently-green fifth row would just be noise on every other order. */
  if(!V['sec-treat']) checks.push({t:'Coatings & treatments',ok:false,go:'#sec-treat'});
  $('#vList').innerHTML=checks.map(k=>`<li class="${k.ok?'ok':''}" data-go="${k.go}"><span class="vi">✓</span><span class="vt">${k.t}</span></li>`).join('');
  $$('#vList li').forEach(li=>li.addEventListener('click',()=>{const t=rootEl.querySelector(li.dataset.go); if(t&&!t.classList.contains('hide')) t.scrollIntoView({behavior:'smooth',block:'start'});}));
  $('#vBar').style.width=Math.round(checks.filter(k=>k.ok).length/checks.length*100)+'%';
  const valid=checks.every(k=>k.ok);
  /* An unpriced combination cannot go to the cart — there is no price to charge,
     so the only route is a draft we quote back. Flagged for assistance so it
     reaches the same follow-up queue as any other help request. The mutation
     sits above the assist-list render below, so it lands in this same pass. */
  const {unpriced:noPrice}=price();
  if(noPrice) S.assists.add(UNPRICED_ASSIST); else S.assists.delete(UNPRICED_ASSIST);
  ['#submitBtn','#submitBtn2'].forEach(s=>{
    const b=$(s);
    b.disabled=!valid||noPrice;
    b.title=noPrice?'This lens is not priced on your account — save it as a draft and we will quote it.':'';
  });

  const goToDrafts=shouldOfferGoToDrafts();
  $('#saveDraft').textContent=goToDrafts?'Go to saved drafts':'Save draft';
  $('#saveDraft2').textContent=goToDrafts?'Go to saved drafts':'Save as draft';
  $('#saveDraft3').textContent=goToDrafts?'Go to saved drafts':'Draft';

  syncTreatConfirm();
  syncServiceLead();
  syncSubmitMode();
  markNeeded(V);
  buildSteps(V);
  $('#assistList').classList.toggle('on',S.assists.size>0);
  $('#assistTags').innerHTML=Array.from(S.assists).map(a=>`<span class="atag">⚑ ${a}<button data-rm="${a}">✕</button></span>`).join('');
  $$('#assistTags button').forEach(b=>b.addEventListener('click',()=>{
    S.assists.delete(b.dataset.rm);
    $$('.field.assist').forEach(f=>{if(f.querySelector('[data-assist="'+b.dataset.rm+'"]')) f.classList.remove('assist');});
    render();
  }));
  scheduleAutosave();
}
/* ---------- skipped-mandatory beacon ----------
   Prefilled/restored forms open every section at once (S.revealAll), so the
   user can jump around and miss something — that always qualifies. In the
   normal step-by-step flow a section only becomes reachable once everything
   before it validates, so arriving at a fresh section empty is expected, not
   "overlooked" — no beacon for that. But a user can jump BACK (the pencil
   "Edit" icon) to an earlier, already-completed section and blank something
   out while later sections still hold their data; that's the real "other
   areas are filled and this one got skipped" case, so a field also qualifies
   whenever some section after its own is currently valid or holds data —
   proof the user got past this point before. */
function requiredFields(){
  const out=[];
  const add=(el,why)=>{ if(el) out.push({el,why}); };
  add($('#pfirst'),'Patient first name'); add($('#plast'),'Patient last name');
  add($('#fname'),'Frame name'); add($('#fa'),'A measurement'); add($('#fb'),'B measurement');
  add($('#fed'),'Effective diameter'); add($('#fdbl'),'DBL');
  add($('#material'),'Material'); add($('#design'),'Lens design'); add($('#colour'),'Lens colour option');
  activeEyes().forEach(e=>{
    const r=readRow(e), E=e.toUpperCase();
    add(cell(e,'sph'),E+' sphere');
    add(cell(e,'pd'),E+' distance PD');
    if(r.cyl&&r.cyl!==0) add(cell(e,'axis'),E+' axis');
    if(needsAdd()) add(cell(e,'add'),E+' add');
    if(needsHt()) add(cell(e,'ht'),E+' fitting height');
    if(needsNearPD()) add(cell(e,'npd'),E+' near PD');
  });
  return out;
}
function markNeeded(V){
  $$('.needed').forEach(el=>el.classList.remove('needed'));
  let cue=$('#needCue');
  const missing=requiredFields().filter(f=>{
    if(f.el.disabled||f.el.value.trim()!=='') return false;
    const sec=f.el.closest('section');
    if(!sec||sec.classList.contains('hide')) return false;
    if(S.revealAll) return true;
    const idx=SECTION_IDS.indexOf(sec.id);
    /* sectionHasCapturedData() is only a meaningful signal on its own for
       sec-treat/sec-notes — they're always "valid" (optional) whether or not
       they hold anything. For the other sections validity IS the data check;
       using sectionHasCapturedData for those too would read true unconditionally
       and false-positive on a still-blank form. */
    const hasProgress=id=>(id==='sec-treat'||id==='sec-notes')?sectionHasCapturedData(id):!!V[id];
    return idx>=0&&SECTION_IDS.slice(idx+1).some(hasProgress);
  });
  missing.forEach(f=>{
    const host=f.el.closest('td')||f.el.closest('.field');
    if(host) host.classList.add('needed');
  });
  if(!missing.length){ if(cue) cue.remove(); return; }
  if(!cue){
    cue=document.createElement('div'); cue.id='needCue'; cue.className='needcue';
    const col=$('.col'); col.insertBefore(cue,col.firstChild);
  }
  cue.innerHTML=`<span>✹</span><span><b>${missing.length} required field${missing.length>1?'s':''} still to fill</b> — they're glowing green: ${missing.slice(0,3).map(m=>m.why).join(', ')}${missing.length>3?` and ${missing.length-3} more`:''}.</span>
    <button class="btn btn-ghost" id="needJump">Go to first</button>`;
  $('#needJump').addEventListener('click',()=>{
    const t=missing[0].el;
    t.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>{ t.focus(); if(t.select) try{t.select();}catch(e){} },420);
  });
}

function buildSteps(V){
  const secs=$$('.card[data-step]');
  const stepButtons=secs.map((s,i)=>{
    const locked=s.classList.contains('hide');
    return `<button class="step ${V[s.id]?'done':''} ${locked?'locked':''}" data-go="#${s.id}"><span class="n">${V[s.id]?'✓':(locked?'🔒':i+1)}</span>${s.dataset.step}</button>`;
  }).join('');
  const currencyOptions=Object.entries(CUR).map(([code,c])=>`<option value="${code}" ${S.cur===code?'selected':''}>${c.sym}${c.indicative?' · indicative':''}</option>`).join('');
  /* Coach/settings live on the pagehead (top of page) only — the sticky rail
     carries just order identity + actions, not a second copy of every icon. */
  $('#steps').innerHTML=`<div class="step-list">${stepButtons}</div><div class="step-actions" aria-label="Order actions">
    <span class="ordno"><span>Order</span> ${S.orderNo||'—'}</span>
    <button class="btn btn-ghost btn-sm" data-step-action="save-draft">${shouldOfferGoToDrafts()?'Go to saved drafts':'Save draft'}</button>
    <button class="chip btnchip" data-step-action="branch-picker"><span class="dot"></span>Ordering for <b>${S.branch?S.branch.name.replace('Bridgetown Optical — ',''):'—'}</b> <span style="opacity:.5">▾</span></button>
    <select class="step-currency" data-step-currency aria-label="Display currency">${currencyOptions}</select>
  </div>`;
  $$('.step').forEach(b=>b.addEventListener('click',()=>{
    const t=rootEl.querySelector(b.dataset.go);
    if(t&&!t.classList.contains('hide')) openSection(t.id);
  }));
  $$('#steps [data-step-action]').forEach(b=>b.addEventListener('click',()=>{
    const action=b.dataset.stepAction;
    if(action==='save-draft') $('#saveDraft').click();
    if(action==='branch-picker') $('#branchChip').click();
  }));
  const currency=$('#steps [data-step-currency]');
  if(currency) currency.addEventListener('change',e=>{
    $('#curSim').value=e.target.value;
    $('#curSim').dispatchEvent(new Event('change',{bubbles:true}));
  });
}

/* ---------- segmented ---------- */
function seg(id,key,after){
  $$('#'+id+' button').forEach(b=>b.addEventListener('click',()=>{
    $$('#'+id+' button').forEach(x=>x.setAttribute('aria-pressed',x===b));
    S[key]=b.dataset[key];
    if(after) after(); render();
  }));
}
seg('scopeSeg','scope',()=>{
  const remote=S.scope==='remote';
  $('#traceBlock').classList.toggle('hide',!remote);
  /* standard shapes are for uncut and full glaze; on remote edge they're behind a button */
  $('#shapeBlock').classList.toggle('hide', remote && !S.stdShapesOpen);
  $('#stdShapeCta').classList.toggle('hide', !remote || S.stdShapesOpen);
  $('#shapeBlkLabel').innerHTML = remote
    ? 'Standard shape <span class="opt-tag">fallback — the uploaded trace normally governs</span>'
    : 'Standard shape <span class="opt-tag">gives a live preview and a true ED</span>';
  if(!remote) S.stdShapesOpen=false;
  $('#fsourceField').classList.toggle('hide',remote);
  $('#scopeNote').innerHTML=
    S.scope==='uncut'?'Uncut Rx lenses supplied to your lab — you edge and fit. We still need the frame details below so we can confirm the blank will cut out.'
    :remote?'You trace the frame and send us the file; we cut, edge and finish to shape and ship glazing-ready lenses. The frame never leaves your practice.'
    :'Send us the frame and we edge, mount and return it dispense-ready.';
});
seg('visionSeg','vision',()=>{ S.d=''; S.d2=''; fillLensSelects(); });

/* ---------- split eyes ---------- */
$('#splitOn').addEventListener('change',e=>{
  S.split=e.target.checked;
  /* Turning the split ON seeds the left eye from the right, so the common case
     — same lens, one property different — is one edit rather than three. */
  if(S.split){ if(!(S.m2||S.d2||S.c2)){ S.m2=S.m; S.d2=S.d; S.c2=S.c; } }
  else { S.m2=S.d2=S.c2=''; }
  fillLensSelects(); render();
  toast(S.split?'Split eyes on — the left lens is quoted separately':'Split eyes off — one lens for both eyes');
});
$('#copyLensToOs').addEventListener('click',()=>{
  S.m2=S.m; S.d2=S.d; S.c2=S.c;
  fillLensSelects(); render(); toast('Left lens matched to the right');
});
seg('purposeSeg','purpose');
/* A single-eye job supplies one lens by definition — drop the split rather
   than leaving a hidden second selection silently priced into the order. */
seg('eyeSeg','eyes',()=>{
  if(S.eyes!=='pair'&&S.split){ S.split=false; S.m2=S.d2=S.c2=''; }
  fillLensSelects();
});

/* ---------- lens selects ---------- */
Object.entries(COMBO_DEFS).forEach(([k,def])=>{
  const input=$('#'+def.inputId);
  input.addEventListener('focus',()=>{ comboTyped[k]=false; input.select(); openCombo(k); });
  input.addEventListener('click',()=>openCombo(k));
  input.addEventListener('input',()=>{ comboTyped[k]=true; comboActive[k]=0; openCombo(k); });
  input.addEventListener('keydown',e=>{
    if(!['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key)) return;
    e.stopPropagation();
    const items=comboFilteredItems(k,options());
    if(e.key==='ArrowDown'){ e.preventDefault(); if(!items.length) return;
      comboActive[k]=Math.min((comboActive[k]<0?-1:comboActive[k])+1,items.length-1); renderComboList(k,options()); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); if(!items.length) return;
      comboActive[k]=Math.max(comboActive[k]-1,0); renderComboList(k,options()); }
    else if(e.key==='Enter'){
      e.preventDefault();
      const pick=comboActive[k]>=0?items[comboActive[k]]:(items.length===1?items[0]:null);
      if(pick) pickCombo(k,pick.id); else input.blur();
    } else if(e.key==='Escape'){
      e.preventDefault();
      const item=COMBO_DEFS[k].all.find(x=>x.id===S[k]); input.value=item?item.n:'';
      closeCombo(k); input.blur();
    }
  });
  input.addEventListener('blur',()=>{
    setTimeout(()=>{
      closeCombo(k);
      const item=COMBO_DEFS[k].all.find(x=>x.id===S[k]);
      input.value=item?item.n:'';
    },120);
  });
  /* always opens, never toggles closed — a second click landing on the
     button while it's already open used to close-then-reopen in the same
     gesture (the input's own focus/click handlers fire too), which read as
     the dropdown flickering. Calling openCombo directly (rather than relying
     on input.focus() to fire a 'focus' event) also covers the case where the
     input already has focus from before — focus() is then a no-op that
     fires nothing, which left the button doing nothing at all. */
  input.closest('.combo').querySelector('.cbtog').addEventListener('click',e=>{
    e.preventDefault();
    input.focus();
    openCombo(k);
  });
});
docListen('click',e=>{
  /* the open list itself is portaled onto document.body while open (see
     openCombo), so it's no longer a descendant of .combo — check for it
     separately or a click inside it (e.g. on "No matches", not an option)
     would look like an outside click and close it out from under the user. */
  if(e.target.closest('.combo')||e.target.closest('.cblist')) return;
  closeAllCombos();
});
/* fixed-position .cblist no longer scrolls with its input, so close rather
   than leave it floating over the wrong spot — but not for scrolling the
   list's OWN results (a capture-phase window listener sees that scroll too),
   or the list would slam shut the moment you tried to scroll through it. */
winListen('scroll',e=>{ if(e.target&&e.target.closest&&e.target.closest('.cblist')) return; closeAllCombos(); },true);
winListen('resize',closeAllCombos);

/* ---------- Rx tools ---------- */
$('#copyOD').addEventListener('click',()=>{
  const a=rowEls('od'), b=rowEls('os');
  a.forEach((s,i)=>{ b[i].value=s.value; });
  render(); toast('Copied OD values to OS');
});
$('#clearRx').addEventListener('click',()=>{ $$('.rxtable input').forEach(i=>i.value=''); $$('.rxtable select').forEach(s=>s.value=''); S.dismissed.clear(); S.warnOff.clear();
  $('#plusCylOn').checked=false; $('#plusCylBlock').classList.add('hide'); render(); });

/* ---------- select-all on first focus ---------- */
let armed=null;
docListen('mousedown',e=>{ if(e.target.matches('input[inputmode]')&&document.activeElement!==e.target) armed=e.target; },true);
docListen('focus',e=>{ if(e.target.matches&&e.target.matches('input[inputmode]')) setTimeout(()=>{try{e.target.select();}catch(err){}},0); },true);
docListen('mouseup',e=>{ if(armed===e.target){ e.preventDefault(); armed=null; } },true);

/* ---------- keyboard flow ---------- */
function focusables(){
  return $$('input,select,textarea').filter(el=>!el.disabled&&el.tabIndex!==-1&&el.offsetParent!==null&&!el.closest('#annoUI')&&!el.closest('.sdraw')&&!el.closest('.scrim')&&el.type!=='file');
}
docListen('keydown',e=>{
  if(e.key!=='Enter') return;
  const t=e.target;
  if(!t.matches('input,select')||t.closest('#annoUI')||t.closest('.sdraw')) return;
  e.preventDefault();
  if(t.dataset.f) normalise(t);
  if(t.dataset.pf) normalisePlus(t);
  const list=focusables(), n=list[list.indexOf(t)+1];
  if(n){ n.focus(); if(n.select) try{n.select();}catch(err){} }
});
docListen('blur',e=>{
  if(e.target.dataset&&e.target.dataset.f) normalise(e.target);
  if(e.target.dataset&&e.target.dataset.pf) normalisePlus(e.target);
},true);
$('#fed').addEventListener('input',()=>{ S.edTouched=$('#fed').value.trim()!==''; });
$('#diam').addEventListener('change',()=>{ S.diamTouched=true; render(); });
$('#plusCylOn').addEventListener('change',e=>{
  $('#plusCylBlock').classList.toggle('hide',!e.target.checked);
  if(e.target.checked) syncPlusCylToMain(); else render();
});

/* ---------- treatments drawer ---------- */
$('#openTreat').addEventListener('click',()=>{ buildTreatList(); $('#treatDrawer').classList.add('on'); });
$('#treatClose').addEventListener('click',()=>$('#treatDrawer').classList.remove('on'));
$('#treatDone').addEventListener('click',()=>$('#treatDrawer').classList.remove('on'));
$('#treatSearch').addEventListener('input',buildTreatList);

/* ---------- coach ---------- */
const COACH={
  patient:{h:'Patient & order',b:`<p>First and last name are separate so the lab can sort, search and print jobs consistently.</p>
    <p>Your order reference is optional — leave it blank and we'll use our own job number.</p>`},
  frame:{h:'Frame & measurements',b:`<p>Job type sits here because it decides what we do with the frame:</p>
    <ul><li><b>Uncut Rx lenses</b> — we surface and ship uncut blanks. Frame details still needed so we can confirm the blank cuts out.</li>
    <li><b>Remote edge</b> — you trace, we cut to shape. Frame stays with you.</li>
    <li><b>Full glaze</b> — send us the frame, we return it dispense-ready.</li></ul>
    <p><b>ED</b> auto-calculates as √(A² + B²) and stays editable — override it if your tracer reports a different effective diameter.</p>
    <p>On remote edge jobs we still want frame name, A, B and DBL in case the trace file is corrupt or unreadable.</p>`},
  lens:{h:'Lens selection',b:`<p>Material, design and colour narrow each other. Pick them in any order — if a choice makes the combination impossible, the conflicting selection clears and tells you why.</p>
    <p>Only combinations that exist on your pricelist are offered, so you can't build a lens we don't sell.</p>
    <p><b>Blank diameter</b> is suggested from ED, decentration and PD: min blank ≈ ED + 2 × decentration + 2 mm. Override it if you know better.</p>`},
  rx:{h:'Prescription',b:`<p>Shorthand entry — the last two digits become decimals when the result lands on a 0.25 step:</p>
    <ul><li><code>25</code> → 0.25 · <code>50</code> → 0.50 · <code>125</code> → 1.25 · <code>350</code> → 3.50 · <code>1050</code> → 10.50</li>
    <li>Single digits stay whole: <code>2</code> → 2.00</li>
    <li>Anything that wouldn't land on a step reads as whole diopters: <code>18</code> → 18.00</li></ul>
    <p>Cylinder always resolves to minus, whether you type <code>1-</code>, <code>-1</code> or <code>1.00</code>. Axis over 180 wraps to its polar opposite. A binocular PD splits across both eyes.</p>
    <p>Opposing signs between eyes raise a dismissible warning. An axis with no cylinder asks whether the cylinder is missing.</p>`},
  treat:{h:'Coatings & treatments',b:`<p>Six popular choices cover most jobs; <b>Browse all treatments</b> opens the full catalogue.</p>
    <p>${S.pricesOn?'Prices appear in the order summary as you select, so the running total stays in one place.':'Your selections appear in the order summary as you build the job.'}</p>
    <p>Specialty work is suggested automatically when your powers call for it, and carries an owner review. Dismiss the whole suggestion block with the ✕ if you don't want it.</p>`},
  delivery:{h:'Delivery & notes',b:`<p>Priority adds 15% and pulls the job to three working days.</p>
    <p>Notes reach the surfacing bench directly.</p>`}
};
function openCoach(k){
  const c=COACH[k]||COACH.patient;
  let html=`<div class="coach-cur"><div class="cl">You're on</div><div style="font-weight:600;margin-top:3px">${c.h}</div></div><div class="coachsec">${c.b}</div>
    <hr style="border:0;border-top:1px solid var(--border-soft);margin:16px 0">
    <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;color:var(--muted-fg);margin-bottom:9px">Other steps</div>`;
  Object.entries(COACH).forEach(([kk,v])=>{ if(kk!==k) html+=`<button class="linkbtn" style="display:block;width:100%;text-align:left;margin-bottom:6px" data-coachgo="${kk}">${v.h}</button>`; });
  $('#coachBody').innerHTML=html;
  $$('#coachBody [data-coachgo]').forEach(b=>b.addEventListener('click',()=>openCoach(b.dataset.coachgo)));
  $('#coachDrawer').classList.add('on');
}
$$('.coach-open').forEach(b=>b.addEventListener('click',()=>openCoach(b.dataset.coach)));
$('#coachBtn').addEventListener('click',()=>openCoach('patient'));
$('#coachClose').addEventListener('click',()=>$('#coachDrawer').classList.remove('on'));
$('#coachFlag').addEventListener('click',()=>{
  S.assists.add('General help requested'); render(); $('#coachDrawer').classList.remove('on');
  toast('Flagged — save this as a draft and we\'ll come back to you');
});

/* ---------- assistance ---------- */
docListen('click',e=>{
  const b=e.target.closest('[data-assist]'); if(!b) return;
  e.preventDefault();
  const l=b.dataset.assist, f=b.closest('.field');
  if(S.assists.has(l)){S.assists.delete(l); f&&f.classList.remove('assist'); toast('Assistance flag removed');}
  else {S.assists.add(l); f&&f.classList.add('assist'); toast('Flagged for assistance — save as a draft and we\'ll follow up');}
  render();
});

/* ---------- clear helpers ---------- */
const SECFIELDS={
  patient:['pfirst','plast','ref'],
  frame:['fname','fa','fb','fed','fdbl'],
  lens:[], rx:[], treat:[], notes:['notes']
};
function clearSection(k){
  (SECFIELDS[k]||[]).forEach(id=>{const el=$('#'+id); if(el) el.value='';});
  if(k==='frame'){ S.file=null; S.shapeOk=false; S.edTouched=false; S.shape=null; S.stdShape=''; S.shapeSrc='';
    $('#mount').value=''; $('#fileList').innerHTML=''; $('#shapePreview').innerHTML=''; $('#fileInput').value=''; $('#drop').classList.remove('hide'); buildShapePick(); }
  if(k==='lens'){ S.m=S.d=S.c=S.m2=S.d2=S.c2=''; S.split=false; S.diamTouched=false; fillLensSelects(); }
  if(k==='treat') S.treatConfirmed=false;
  if(k==='rx'){ $$('.rxtable input').forEach(i=>i.value=''); $$('.rxtable select').forEach(s=>s.value=''); S.warnOff.clear();
    $('#plusCylOn').checked=false; $('#plusCylBlock').classList.add('hide'); }
  if(k==='treat'){ S.treat.clear(); S.dismissed.clear(); S.suggOff=false; buildPopular(); buildTreatList(); }
  if(k==='notes'){ S.notesConfirmed=false; $('#notesConfirmed').checked=false; }
  render(); toast('Cleared '+k+' section');
}
$$('.clear-sec').forEach(b=>b.addEventListener('click',()=>clearSection(b.dataset.sec)));
$$('[data-edit-section]').forEach(b=>b.addEventListener('click',()=>openSection(b.dataset.editSection)));
$$('.section-summary').forEach(s=>s.addEventListener('click',()=>openSection(s.closest('.card[data-step]').id)));
docListen('focusout',e=>{
  const section=e.target.closest?.('.card[data-step]');
  if(!section) return;
  setTimeout(()=>{
    if(!section.contains(document.activeElement)){
      S.editingSections.delete(section.id);
      render();
    }
  },0);
});
function clearAll(){
  Object.keys(SECFIELDS).forEach(k=>{(SECFIELDS[k]||[]).forEach(id=>{const el=$('#'+id); if(el) el.value='';});});
  $$('.rxtable input').forEach(i=>i.value=''); $$('.rxtable select').forEach(s=>s.value='');
  S.m=S.d=S.c=S.m2=S.d2=S.c2=''; S.split=false; S.treatConfirmed=false; S.deliveryTouched=false; S.treat.clear(); S.assists.clear(); S.dismissed.clear(); S.warnOff.clear();
  S.file=null; S.shapeOk=false; S.suggOff=false; S.edTouched=false; S.diamTouched=false;
  S.shape=null; S.stdShape=''; S.shapeSrc=''; S.shapeExpanded=false; S.frameExpanded=false;
  S.stdShapesOpen=false; S.rebuiltFrom=null; S.chemClips=[]; S.notesConfirmed=false;
  $('#mount').value=''; $('#notesConfirmed').checked=false;
  $('#plusCylOn').checked=false; $('#plusCylBlock').classList.add('hide');
  if(typeof buildShapePick==='function') buildShapePick();
  if(typeof newOrderNo==='function') newOrderNo();
  S.revealAll=false; S.prefilled=false; S.fromDraft=false;
  S.collapsedSections.clear(); S.editingSections.clear();
  $('#fileList').innerHTML=''; $('#shapePreview').innerHTML=''; $('#drop').classList.remove('hide'); $('#prefillChip').classList.add('hide');
  $('#draftBanner').classList.add('hide');
  $$('.field.assist').forEach(f=>f.classList.remove('assist'));
  fillLensSelects(); buildPopular(); buildTreatList(); render();
  window.scrollTo({top:0,behavior:'smooth'});
  /* Whatever draft this form was tracking, a blank form isn't it anymore —
     the next save (auto or manual) should create a new draft, not overwrite
     the one this form no longer represents. */
  ADAPTER.onFormCleared?.();
}
/* ---------- OMA TRACE DEMO SAMPLE ---------- */
const SAMPLE_OMA_1471 = `REQ=FIL
JOB="1471"
BEVC=1.88;1.88
BSIZ=0.0;0.0
CIRC=158.86;158.97
CSIZ=0.0;0.0
DBL=17.37
ETYP=1
FCRV=1.88;1.88
FTYP=1
HBOX=52.68;52.95
VBOX=43.59;43.62
ZTILT=1.66;1.66
.IFT=?
BEVM=?;?
BEVP=?;?
PINB=?;?
.ED=62.24;61.80
.AX=143.10;34.65
FED=62.24;61.80
FEDAX=143.10;34.65
DRILLE=0
TRCFMT=1;800;E;R;F
R=2537;2542;2547;2552;2557;2563;2569;2574;2580;2587;2594;2601;2608;2614;2620
R=2626;2633;2640;2647;2653;2659;2664;2670;2676;2681;2685;2690;2695;2699;2703
R=2708;2710;2714;2716;2718;2721;2723;2725;2727;2729;2730;2731;2732;2732;2733
R=2734;2734;2734;2734;2732;2731;2728;2726;2726;2723;2721;2717;2714;2711;2707
R=2702;2699;2695;2691;2687;2682;2676;2671;2666;2660;2653;2646;2641;2633;2627
R=2620;2614;2607;2599;2587;2580;2573;2566;2557;2550;2543;2535;2527;2519
R=2512;2504;2497;2488;2481;2473;2464;2458;2450;2443;2438;2430;2424;2416;2409
R=2403;2397;2389;2382;2375;2368;2361;2355;2351;2345;2338;2331;2325;2320;2313
R=2308;2303;2298;2293;2288;2283;2277;2272;2267;2263;2260;2254;2248;2244;2240
R=2236;2231;2228;2224;2220;2216;2213;2209;2206;2202;2199;2196;2192;2189;2186
R=2183;2180;2177;2175;2172;2169;2167;2165;2162;2160;2157;2156;2154;2151;2149
R=2147;2145;2143;2142;2140;2138;2136;2136;2136;2135;2135;2134;2134;2133;2133
R=2132;2132;2132;2132;2132;2131;2130;2129;2129;2130;2131;2132;2133;2134;2135
R=2136;2136;2137;2138;2139;2140;2142;2145;2146;2149;2151;2153;2155;2157;2160
R=2163;2165;2167;2169;2173;2176;2179;2183;2185;2189;2194;2198;2202;2206;2210
R=2215;2219;2223;2228;2232;2238;2243;2248;2252;2257;2263;2268;2273;2279;2285
R=2291;2296;2302;2309;2315;2322;2329;2335;2343;2351;2357;2365;2372;2380;2388
R=2396;2404;2413;2420;2429;2440;2449;2458;2467;2477;2486;2496;2506;2516;2526
R=2536;2546;2555;2565;2577;2588;2602;2614;2628;2640;2652;2665;2678;2692;2706
R=2721;2734;2748;2761;2776;2790;2804;2819;2833;2848;2864;2879;2895;2910;2926
R=2942;2958;2974;2990;3007;3022;3035;3047;3058;3069;3078;3086;3092;3096;3102
R=3106;3108;3110;3112;3111;3112;3110;3108;3104;3099;3094;3088;3081;3073;3064
R=3055;3044;3034;3024;3013;3003;2992;2983;2971;2960;2951;2940;2929;2919;2909
R=2898;2888;2879;2868;2859;2850;2839;2832;2821;2812;2806;2794;2788;2779;2771
R=2761;2754;2745;2736;2729;2721;2713;2705;2700;2693;2687;2679;2671;2665;2657
R=2651;2644;2638;2631;2625;2619;2613;2607;2601;2596;2590;2584;2579;2574;2568
R=2563;2558;2553;2548;2544;2539;2535;2530;2526;2521;2517;2513;2509;2505;2502
R=2498;2495;2492;2488;2485;2482;2478;2475;2473;2470;2467;2465;2462;2460;2458
R=2455;2454;2453;2451;2449;2447;2445;2444;2443;2442;2440;2439;2438;2437;2435
R=2434;2433;2431;2430;2429;2429;2428;2429;2428;2427;2428;2427;2428;2428;2428
R=2428;2428;2428;2428;2428;2428;2430;2432;2434;2436;2437;2438;2439;2441;2442
R=2444;2445;2446;2448;2449;2450;2451;2453;2454;2456;2459;2461;2463;2465;2467
R=2468;2470;2472;2474;2474;2475;2477;2478;2479;2480;2482;2484;2483;2483;2483
R=2484;2483;2483;2482;2481;2481;2480;2479;2478;2476;2475;2473;2472;2469;2467
R=2464;2462;2459;2455;2452;2447;2443;2438;2434;2429;2424;2418;2412;2408;2402
R=2397;2392;2386;2380;2374;2369;2363;2358;2352;2348;2343;2338;2334;2329;2324
R=2319;2314;2310;2305;2300;2296;2292;2289;2285;2281;2277;2273;2269;2265;2261
R=2257;2254;2251;2247;2244;2241;2237;2234;2230;2227;2224;2221;2219;2215;2213
R=2211;2209;2206;2204;2201;2201;2199;2198;2196;2195;2194;2192;2190;2189;2188
R=2187;2187;2185;2184;2182;2182;2182;2182;2181;2180;2179;2178;2177;2178;2178
R=2178;2179;2179;2178;2179;2179;2179;2181;2182;2183;2184;2185;2186;2187;2189
R=2190;2191;2192;2195;2197;2198;2200;2202;2204;2206;2208;2211;2214;2216;2219
R=2222;2226;2230;2233;2235;2238;2241;2245;2247;2249;2254;2257;2261;2264;2269
R=2272;2275;2279;2284;2288;2293;2297;2302;2305;2309;2313;2319;2323;2326;2331
R=2336;2339;2342;2346;2350;2353;2356;2359;2361;2365;2368;2370;2372;2374;2376
R=2377;2380;2381;2382;2382;2383;2383;2384;2385;2385;2385;2385;2385;2385
R=2385;2385;2384;2382;2380;2379;2378;2377;2376;2375;2375;2374;2372;2370;2368
R=2365;2363;2363;2361;2360;2358;2357;2356;2355;2353;2352;2351;2350;2349;2348
R=2348;2348;2348;2346;2346;2346;2345;2344;2344;2343;2343;2342;2342;2341;2341
R=2341;2341;2341;2341;2341;2342;2342;2343;2343;2344;2345;2345;2347;2348;2349
R=2350;2351;2352;2353;2356;2357;2360;2362;2363;2366;2369;2372;2375;2377;2380
R=2382;2386;2390;2393;2397;2400;2403;2406;2410;2413;2416;2420;2425;2430;2435
R=2439;2442;2446;2450;2455;2460;2465;2470;2475;2479;2484;2489;2494;2500;2504
R=2509;2515;2521;2527;2532
ZFMT=0
TRCFMT=1;800;E;L;F
R=2499;2503;2507;2512;2517;2522;2527;2531;2537;2543;2549;2554;2561;2567;2572
R=2578;2584;2589;2596;2602;2608;2615;2621;2627;2634;2641;2649;2656;2662;2670
R=2678;2686;2693;2701;2711;2719;2727;2736;2744;2752;2761;2770;2780;2790;2799
R=2810;2820;2829;2839;2849;2859;2870;2882;2893;2904;2914;2924;2935;2946;2957
R=2972;2980;2991;3002;3013;3025;3035;3045;3053;3062;3069;3074;3079;3083;3085
R=3088;3089;3090;3090;3089;3085;3082;3077;3072;3065;3058;3049;3040;3030;3018
R=3006;2993;2979;2964;2950;2938;2926;2914;2899;2885;2871;2855;2841;2828;2813
R=2802;2786;2773;2759;2746;2733;2719;2706;2695;2684;2673;2663;2652;2641;2629
R=2618;2606;2596;2584;2573;2563;2552;2542;2533;2524;2514;2505;2496;2487;2479
R=2471;2461;2451;2443;2435;2428;2420;2414;2406;2398;2391;2383;2376;2368;2361
R=2356;2349;2342;2335;2329;2323;2317;2310;2304;2298;2292;2286;2282;2276;2271
R=2266;2260;2255;2251;2248;2243;2239;2234;2230;2225;2222;2218;2214;2211;2208
R=2205;2200;2196;2192;2189;2186;2184;2183;2181;2178;2176;2174;2172;2170;2168
R=2166;2165;2162;2162;2161;2159;2158;2156;2155;2153;2152;2152;2151;2151;2148
R=2148;2148;2148;2148;2147;2147;2148;2148;2149;2149;2149;2150;2150;2151;2151
R=2152;2154;2155;2156;2157;2158;2160;2162;2165;2167;2169;2171;2174;2176;2179
R=2181;2184;2185;2189;2191;2193;2196;2200;2203;2206;2209;2212;2216;2219;2223
R=2227;2231;2235;2239;2243;2247;2251;2255;2259;2263;2267;2272;2276;2279;2283
R=2288;2293;2300;2306;2312;2317;2324;2329;2336;2342;2347;2355;2360;2367;2373
R=2379;2386;2394;2401;2407;2414;2422;2430;2438;2445;2453;2459;2468;2474;2482
R=2490;2495;2503;2511;2518;2527;2535;2542;2550;2559;2568;2576;2584;2593;2601
R=2608;2616;2624;2631;2639;2648;2656;2663;2671;2678;2686;2692;2699;2705;2711
R=2716;2721;2726;2730;2734;2739;2743;2747;2750;2754;2756;2758;2760;2762;2763
R=2764;2766;2767;2768;2768;2767;2768;2768;2768;2767;2767;2766;2765;2763;2760
R=2758;2755;2752;2750;2747;2744;2740;2735;2730;2726;2722;2717;2713;2707;2702
R=2696;2690;2684;2677;2671;2664;2658;2651;2645;2638;2632;2622;2615;2610
R=2605;2598;2592;2585;2580;2574;2569;2564;2551;2546;2540;2535;2529;2524
R=2519;2514;2509;2504;2500;2495;2490;2485;2481;2477;2472;2468;2464;2460;2456
R=2452;2448;2444;2441;2437;2432;2428;2426;2423;2420;2416;2413;2410;2407;2404
R=2401;2398;2395;2394;2392;2390;2388;2386;2384;2382;2380;2378;2377;2376;2374
R=2373;2369;2368;2367;2366;2365;2364;2363;2362;2362;2362;2362;2362;2362
R=2362;2362;2362;2362;2363;2363;2363;2363;2364;2364;2365;2367;2368;2368;2369
R=2370;2371;2373;2374;2375;2376;2376;2379;2381;2381;2383;2384;2386;2386;2387
R=2389;2390;2392;2393;2394;2395;2397;2398;2399;2400;2400;2400;2401;2401;2401
R=2401;2400;2400;2400;2399;2399;2397;2397;2396;2395;2393;2391;2389;2387;2385
R=2382;2380;2376;2373;2370;2367;2363;2359;2355;2350;2346;2342;2338;2332;2328
R=2324;2319;2314;2310;2305;2301;2297;2292;2288;2284;2282;2278;2274;2270;2265
R=2261;2256;2252;2250;2247;2243;2239;2235;2232;2229;2226;2223;2221;2219;2216
R=2213;2211;2210;2208;2205;2203;2201;2200;2198;2196;2194;2193;2192;2190;2189
R=2187;2186;2185;2185;2185;2184;2184;2183;2184;2184;2182;2182;2182;2181;2180
R=2180;2181;2181;2181;2181;2180;2181;2182;2182;2183;2184;2184;2185;2187;2188
R=2189;2190;2193;2194;2195;2197;2200;2202;2203;2205;2208;2211;2213;2215;2217
R=2220;2223;2226;2229;2231;2234;2238;2241;2242;2245;2249;2253;2256;2260;2264
R=2268;2272;2275;2278;2282;2287;2292;2296;2300;2304;2308;2312;2316;2322;2328
R=2333;2337;2343;2349;2354;2359;2364;2369;2374;2380;2386;2390;2394;2399;2404
R=2409;2413;2418;2423;2425;2430;2433;2436;2440;2443;2446;2449;2451;2453;2455
R=2457;2458;2460;2461;2461;2461;2461;2462;2462;2463;2464;2464;2463;2462;2460
R=2458;2456;2456;2455;2453;2451;2448;2447;2446;2444;2441;2439;2437;2435;2434
R=2432;2430;2429;2427;2423;2422;2421;2419;2418;2416;2414;2413;2412;2411;2409
R=2408;2407;2405;2404;2403;2402;2401;2400;2400;2399;2397;2397;2398;2398;2398
R=2398;2398;2399;2399;2399;2399;2400;2400;2400;2401;2402;2403;2404;2405;2406
R=2406;2407;2409;2410;2411;2412;2413;2414;2415;2417;2419;2420;2422;2424;2428
R=2430;2432;2435;2438;2440;2443;2446;2449;2453;2457;2460;2464;2466;2470;2473
R=2478;2483;2487;2491;2495
ZFMT=0`;

/* ==========================================================================
   OMA TRACE FILE PARSER & SHAPE RENDERER
   ========================================================================== */

/**
 * @typedef {Object} OMAPayload
 * @property {string} name - File name (e.g. 1471.oma)
 * @property {number} size - File size in bytes
 * @property {string} rawText - Exact raw OMA string content for surfacing API transmission
 * @property {Object} omaData - Parsed OMA header and polar radii vectors
 * @property {number} omaData.hbox - Frame A measurement
 * @property {number} omaData.vbox - Frame B measurement
 * @property {number} omaData.dbl - Frame DBL measurement
 * @property {number} omaData.ed - Effective Diameter
 * @property {Object} omaData.points - { R: Array<number>, L: Array<number> } polar radii in mm
 */

/**
 * Parses raw OMA text format (.oma, .tr, .vca) into structured metadata & polar points.
 * 
 * @param {string} text - Raw OMA file text
 * @returns {Object|null} Structured OMA data object
 */
function parseOMA(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const data = {
    job: '',
    hbox: null,
    vbox: null,
    dbl: null,
    ed: null,
    points: { R: [], L: [] },
    rawText: text
  };

  let currentSide = 'R';
  data.angles = { R: [], L: [] };
  data.circ = null; data.edAxis = { R: null, L: null };
  /* mirroredL = we invented the left from the right, so the RENDERER must flip it.
     When the file supplies genuine left radii they are ALREADY the mirrored outline
     (r_L(θ) = r_R(180°−θ)) — flipping those again is what made both eyes look identical. */
  data.mirroredL = false;

  for (let line of lines) {
    line = line.trim();
    if (!line || !line.includes('=')) continue;

    const parts = line.split('=');
    const key = parts[0].trim().toUpperCase();
    const val = parts.slice(1).join('=').trim();

    if (key === 'JOB' || key === 'FNAM') {
      if (!data.job) data.job = val.replace(/^"|"$/g, '');
    } else if (key === 'HBOX') {
      const p = val.split(';').map(v => parseFloat(v));
      data.hbox = p[0] || p[1] || null;
    } else if (key === 'VBOX') {
      const p = val.split(';').map(v => parseFloat(v));
      data.vbox = p[0] || p[1] || null;
    } else if (key === 'DBL') {
      data.dbl = parseFloat(val) || null;
    } else if (key === 'CIRC') {
      const p = val.split(';').map(v => parseFloat(v));
      data.circ = p[0] || p[1] || null;
    } else if (key === 'FED' || key === '.ED') {
      const p = val.split(';').map(v => parseFloat(v));
      data.ed = p[0] || p[1] || null;
    } else if (key === 'FEDAX' || key === '.AX') {
      const p = val.split(';').map(v => parseFloat(v));
      if (!isNaN(p[0])) data.edAxis.R = p[0];
      if (!isNaN(p[1])) data.edAxis.L = p[1];
    } else if (key === 'TRCFMT') {
      const fmt = val.split(';');
      /* TRCFMT=1;1000;U;R;F  →  field 3 is the side this block describes */
      if (fmt.length >= 4) currentSide = (fmt[3] || 'R').toUpperCase();
      if (currentSide !== 'R' && currentSide !== 'L') currentSide = 'R';
    } else if (key === 'R') {
      val.split(';').map(v => parseInt(v, 10)).filter(v => !isNaN(v))
        .forEach(r => data.points[currentSide].push(r / 100.0));   /* hundredths of a mm */
    } else if (key === 'A') {
      val.split(';').map(v => parseInt(v, 10)).filter(v => !isNaN(v))
        .forEach(a => data.angles[currentSide].push(a / 100.0));   /* hundredths of a degree */
    }
  }

  /* only synthesise a side when the file genuinely lacks it */
  if (data.points.R.length && !data.points.L.length) {
    data.points.L = data.points.R.slice();
    data.angles.L = data.angles.R.slice();
    data.mirroredL = true;
  } else if (data.points.L.length && !data.points.R.length) {
    data.points.R = data.points.L.slice();
    data.angles.R = data.angles.L.slice();
    data.mirroredL = true;   /* one real side, one mirrored — flip the copy at render time */
    data.sourceSide = 'L';
  }

  return data;
}

/* ---- geometry helpers shared by traced files and standard shapes ---- */

/** polar radii (+ optional explicit angles) → cartesian outline, boxing centre at 0,0, y up */
function radiiToXY(radii, angles) {
  const n = radii.length, out = [];
  for (let i = 0; i < n; i++) {
    const deg = (angles && angles.length === n) ? angles[i] : (i * 360 / n);
    const t = deg * Math.PI / 180;
    out.push({ x: radii[i] * Math.cos(t), y: radii[i] * Math.sin(t) });
  }
  return out;
}
/** half-extents of an outline, so it can be rescaled to any A / B */
function outlineBox(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}
/** rescale an outline so its bounding box is exactly A × B, recentred on the boxing centre */
function scaleOutline(pts, A, B) {
  const b = outlineBox(pts);
  if (!b.w || !b.h) return pts.slice();
  const sx = A / b.w, sy = B / b.h;
  return pts.map(p => ({ x: (p.x - b.cx) * sx, y: (p.y - b.cy) * sy }));
}
/** true ED (2 × longest radius from boxing centre), its axis, and the circumference */
function shapeMetrics(pts) {
  let maxR = 0, axis = 0, circ = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], r = Math.hypot(p.x, p.y);
    if (r > maxR) { maxR = r; axis = Math.atan2(p.y, p.x) * 180 / Math.PI; }
    const q = pts[(i + 1) % pts.length];
    circ += Math.hypot(q.x - p.x, q.y - p.y);
  }
  axis = ((axis % 180) + 180) % 180;
  return { ed: maxR * 2, edAxis: axis, circ };
}
/** outline → SVG path data (screen coords: y flipped, optional horizontal mirror) */
function outlinePath(pts, mirror) {
  return pts.map((p, i) =>
    `${i ? 'L' : 'M'}${((mirror ? -p.x : p.x)).toFixed(2)},${(-p.y).toFixed(2)}`).join(' ') + ' Z';
}

/**
 * Generates high-precision SVG string representing true 2D frame shape.
 * Renders dual-eye (Right & Left) optical outline with blueprint grid & dimensions.
 * 
 * @param {Object} omaData - Parsed OMA data
 * @param {Object} opts - Render options { showDimensions: boolean }
 * @returns {string} SVG HTML markup
 */
function generateOMASVG(omaData, opts = {}) {
  if (!omaData) return '';
  const g = shapeGeometry(omaData);
  if (!g) return '';
  const { a, b, dbl, ptsR, ptsL, mirrorL, ghost } = g;
  const showDims = opts.showDimensions !== false;

  const pathR = outlinePath(ptsR, false);
  const pathL = outlinePath(ptsL, mirrorL);

  /* Dispenser's view: the patient's RIGHT lens sits on the LEFT of the screen.
     All type is sized in USER UNITS (mm), never CSS px — a 10px rule here would be 10 mm tall. */
  const shift = (a / 2) + (dbl / 2);
  const padX = 16, padTop = showDims ? 20 : 9, padBot = 9;
  const totalW = a * 2 + dbl + padX * 2;
  const totalH = b + padTop + padBot;
  const minX = -totalW / 2, minY = -(b / 2) - padTop;
  const half = b / 2;
  const fs = Math.max(2.3, a * 0.058);          /* dimension type */
  const fsL = Math.max(3.2, a * 0.085);         /* R / L corner type */
  const tick = fs * 0.8;
  const yA = -half - fs * 1.5;                  /* A + DBL dimension row */
  const dim = 'hsl(188 62% 32%)';

  const eye = (path, xoff) => `
      <g transform="translate(${xoff.toFixed(2)}, 0)">
        <path d="${path}" fill="hsl(213 66% 13% / .04)" stroke="#111827" stroke-width="${(a*0.022).toFixed(2)}" stroke-linejoin="round"/>
        <line x1="${-fs}" y1="0" x2="${fs}" y2="0" stroke="hsl(213 20% 60%)" stroke-width="${(a*0.012).toFixed(2)}"/>
        <line x1="0" y1="${-fs}" x2="0" y2="${fs}" stroke="hsl(213 20% 60%)" stroke-width="${(a*0.012).toFixed(2)}"/>
        ${showDims ? `
        <line x1="${-a/2}" y1="${yA}" x2="${a/2}" y2="${yA}" stroke="${dim}" stroke-width="${(a*0.008).toFixed(2)}" opacity=".55"/>
        <line x1="${-a/2}" y1="${yA-tick/2}" x2="${-a/2}" y2="${yA+tick/2}" stroke="${dim}" stroke-width="${(a*0.008).toFixed(2)}" opacity=".55"/>
        <line x1="${a/2}" y1="${yA-tick/2}" x2="${a/2}" y2="${yA+tick/2}" stroke="${dim}" stroke-width="${(a*0.008).toFixed(2)}" opacity=".55"/>
        <text x="0" y="${yA - fs*0.6}" text-anchor="middle" fill="${dim}" font-size="${fs.toFixed(2)}"
              font-family="ui-sans-serif,system-ui,sans-serif" font-weight="600">A ${a.toFixed(2)}</text>` : ''}
      </g>`;

  return `
    <svg class="oma-svg-preview" viewBox="${minX.toFixed(2)} ${minY.toFixed(2)} ${totalW.toFixed(2)} ${totalH.toFixed(2)}"
         xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;display:block">
      <defs><pattern id="omaGrid" width="5" height="5" patternUnits="userSpaceOnUse">
        <path d="M 5 0 L 0 0 0 5" fill="none" stroke="hsl(188 50% 91%)" stroke-width="0.35"/>
      </pattern></defs>
      <rect x="${minX}" y="${minY}" width="${totalW}" height="${totalH}" fill="url(#omaGrid)"/>
      ${eye(pathR, -shift)}
      ${eye(pathL, shift)}
      ${showDims ? `
        <line x1="${-dbl/2}" y1="${yA}" x2="${dbl/2}" y2="${yA}" stroke="${dim}" stroke-width="${(a*0.008).toFixed(2)}" opacity=".55"/>
        <text x="0" y="${yA - fs*0.6}" text-anchor="middle" fill="${dim}" font-size="${fs.toFixed(2)}"
              font-family="ui-sans-serif,system-ui,sans-serif" font-weight="600">DBL ${dbl.toFixed(2)}</text>
        <text x="${(-shift - a/2 - fs*0.7).toFixed(2)}" y="0" text-anchor="middle" fill="${dim}" font-size="${fs.toFixed(2)}"
              font-family="ui-sans-serif,system-ui,sans-serif" font-weight="600"
              transform="rotate(-90 ${(-shift - a/2 - fs*0.7).toFixed(2)} 0)">B ${b.toFixed(2)}</text>` : ''}
      <text x="${(minX + fsL*0.5).toFixed(2)}" y="${(minY + fsL*1.05).toFixed(2)}" fill="hsl(213 40% 34%)"
            font-size="${fsL.toFixed(2)}" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="800" letter-spacing="0.3">R</text>
      <text x="${(minX + totalW - fsL*0.5).toFixed(2)}" y="${(minY + fsL*1.05).toFixed(2)}" text-anchor="end" fill="hsl(213 40% 34%)"
            font-size="${fsL.toFixed(2)}" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="800" letter-spacing="0.3">L</text>
      ${ghost ? `<text x="0" y="${(half + padBot*0.7).toFixed(2)}" text-anchor="middle" fill="${dim}" opacity=".75"
            font-size="${(fs*0.85).toFixed(2)}" font-family="ui-sans-serif,system-ui,sans-serif">placeholder scale — enter A and B</text>` : ''}
    </svg>`;
}

/**
 * Single source of truth for "what shape are we drawing, at what size".
 * Rescales the stored outline to whatever A / B are currently typed, so the preview
 * and the ED both track the form live.
 */
function shapeGeometry(omaData) {
  if (!omaData || !omaData.points || !omaData.points.R.length) return null;
  const typedA = parseNum($('#fa').value), typedB = parseNum($('#fb').value), typedD = parseNum($('#fdbl').value);
  const ghost = typedA === null || typedB === null;
  const a = typedA !== null ? typedA : (omaData.hbox || 52);
  const b = typedB !== null ? typedB : (omaData.vbox || 38);
  const dbl = typedD !== null ? typedD : (omaData.dbl || 17);

  const rawR = radiiToXY(omaData.points.R, omaData.angles && omaData.angles.R);
  const rawL = radiiToXY(omaData.points.L.length ? omaData.points.L : omaData.points.R,
                         omaData.angles && (omaData.angles.L.length ? omaData.angles.L : omaData.angles.R));
  const ptsR = scaleOutline(rawR, a, b);
  const ptsL = scaleOutline(rawL, a, b);
  const m = shapeMetrics(ptsR);
  return { a, b, dbl, ptsR, ptsL, mirrorL: !!omaData.mirroredL, ghost, metrics: m };
}

/* ============================================================
   STANDARD SHAPE LIBRARY
   Real traced outlines, not approximations — embedded as raw .oma text
   (STD_OMA_RECT/ROUND/AVIATOR/CATEYE above) so they always parse correctly,
   regardless of how this HTML file is opened. #libInput/seedLibFromFiles are
   kept only as a manual fallback if the embedded data ever needs replacing.
   ============================================================ */
const SHAPE_LIB_KEY = 'cv-shape-lib-v2';
/* Hard-coded so the four standard shapes always work — no fetch(), no file picker,
   no dependency on how this HTML file is opened (file://, http, emailed, whatever). */
const STD_OMA_RECT = `REQ=FIL
JOB="1506"
FNAM=1506
CIRC=163.46;163.47
FCRV=4.7;4.7
ZTILT=6.0;6.0
DBL=18.00
HBOX=56.00;56.00
VBOX=36.00;36.00
FTYP=-1
ETYP=-1
.ED=61.28;61.28
.AX=152.28;27.72
FED=61.28;61.28
FEDAX=152.28;27.72
MPD=74.00
.IFT=?
BEVC=?;?
BEVM=?;?
BEVP=?;?
BSIZ=?;?
CSIZ=?;?
PINB=?;?
DRILLE=0
TRCFMT=1;1000;E;R;F
R=2752;2756;2758;2760;2762;2765;2766;2768;2771;2774;2777;2779;2782;2786;2789
R=2792;2795;2797;2801;2804;2807;2810;2813;2818;2820;2824;2829;2832;2835;2840
R=2843;2846;2852;2857;2861;2865;2869;2874;2881;2885;2890;2895;2899;2904;2909
R=2915;2921;2927;2931;2936;2942;2947;2951;2955;2960;2963;2967;2972;2976;2979
R=2983;2985;2987;2990;2992;2994;2994;2994;2993;2991;2989;2986;2983;2978;2973
R=2966;2959;2950;2940;2930;2920;2908;2894;2881;2869;2857;2841;2824;2809;2794
R=2780;2764;2747;2731;2716;2700;2684;2668;2653;2638;2624;2609;2594;2578;2563
R=2548;2534;2521;2507;2493;2477;2463;2450;2436;2422;2412;2400;2387;2375;2363
R=2349;2336;2326;2316;2306;2295;2282;2270;2259;2250;2240;2231;2220;2210;2200
R=2191;2183;2174;2164;2155;2146;2137;2129;2122;2114;2105;2097;2087;2080;2075
R=2067;2059;2051;2046;2040;2035;2027;2020;2013;2007;2000;1994;1988;1982;1977
R=1971;1966;1960;1955;1950;1944;1940;1935;1930;1924;1922;1917;1913;1908;1904
R=1901;1896;1893;1888;1885;1881;1878;1874;1870;1866;1862;1858;1856;1854;1849
R=1847;1844;1841;1839;1837;1834;1830;1828;1826;1823;1820;1818;1816;1814;1811
R=1809;1808;1805;1804;1803;1802;1799;1798;1796;1794;1794;1791;1790;1788;1786
R=1786;1785;1782;1782;1781;1780;1781;1780;1778;1779;1777;1780;1780;1779;1778
R=1778;1779;1780;1781;1781;1783;1782;1785;1786;1787;1787;1789;1789;1790;1790
R=1789;1790;1792;1793;1792;1794;1796;1796;1798;1799;1802;1803;1803;1805;1808
R=1808;1810;1812;1814;1816;1818;1819;1821;1825;1827;1829;1831;1834;1837;1840
R=1842;1846;1849;1851;1853;1857;1860;1862;1865;1869;1872;1876;1879;1883;1886
R=1890;1895;1900;1904;1908;1912;1915;1922;1925;1930;1933;1938;1942;1949;1953
R=1958;1966;1969;1975;1979;1987;1991;1997;2002;2008;2014;2021;2027;2033;2040
R=2046;2052;2057;2065;2074;2082;2088;2094;2102;2109;2115;2122;2129;2137;2145
R=2154;2162;2171;2179;2188;2196;2203;2213;2223;2232;2241;2250;2260;2269;2280
R=2288;2298;2309;2320;2330;2342;2352;2362;2374;2384;2395;2408;2419;2431;2444
R=2457;2470;2482;2492;2505;2519;2534;2547;2560;2575;2590;2606;2619;2633;2650
R=2666;2683;2698;2714;2732;2748;2765;2779;2798;2816;2831;2848;2866;2882;2899
R=2915;2929;2943;2956;2966;2977;2990;3000;3010;3021;3030;3039;3045;3049;3055
R=3060;3061;3062;3064;3064;3062;3059;3057;3054;3050;3046;3041;3037;3033;3028
R=3023;3020;3015;3010;3004;2999;2993;2988;2982;2977;2971;2965;2960;2954;2948
R=2942;2936;2930;2926;2921;2914;2908;2904;2897;2893;2887;2881;2876;2870;2868
R=2865;2861;2857;2853;2850;2847;2842;2839;2836;2832;2830;2828;2825;2824;2822
R=2820;2817;2816;2814;2813;2812;2809;2807;2806;2806;2805;2803;2800;2799;2798
R=2796;2796;2795;2795;2794;2793;2792;2792;2792;2791;2791;2790;2791;2791;2791
R=2792;2793;2793;2793;2794;2795;2796;2796;2796;2797;2798;2799;2801;2801;2801
R=2804;2806;2808;2810;2812;2814;2816;2818;2820;2823;2825;2827;2829;2832;2835
R=2838;2840;2843;2847;2849;2852;2856;2860;2863;2866;2869;2873;2876;2880;2884
R=2887;2891;2895;2898;2902;2904;2907;2909;2912;2914;2916;2919;2922;2924;2926
R=2927;2930;2929;2929;2930;2930;2929;2927;2923;2919;2914;2909;2903;2894;2886
R=2877;2866;2854;2842;2830;2816;2803;2789;2775;2759;2744;2728;2713;2697;2682
R=2666;2650;2635;2620;2606;2592;2578;2563;2548;2534;2521;2508;2495;2480;2468
R=2455;2442;2431;2419;2406;2393;2382;2369;2359;2348;2337;2327;2316;2305;2295
R=2285;2274;2264;2252;2243;2234;2225;2216;2208;2199;2189;2179;2172;2164;2154
R=2145;2138;2130;2122;2112;2106;2099;2091;2083;2077;2071;2063;2056;2050;2043
R=2037;2030;2025;2020;2013;2008;2001;1995;1989;1984;1978;1973;1968;1962;1957
R=1951;1948;1943;1938;1931;1928;1925;1919;1916;1911;1907;1903;1899;1895;1891
R=1886;1882;1878;1876;1872;1869;1866;1863;1859;1858;1854;1851;1849;1846;1845
R=1841;1838;1837;1834;1831;1829;1826;1823;1822;1819;1818;1813;1813;1812;1811
R=1809;1809;1807;1805;1805;1802;1802;1800;1798;1796;1796;1796;1796;1796;1795
R=1795;1796;1795;1795;1795;1794;1794;1794;1794;1792;1793;1792;1794;1793;1795
R=1795;1795;1795;1796;1796;1797;1797;1798;1798;1799;1799;1802;1802;1803;1803
R=1805;1808;1809;1809;1811;1813;1814;1816;1817;1821;1822;1824;1825;1827;1828
R=1830;1831;1834;1836;1836;1841;1843;1847;1850;1852;1856;1859;1862;1865;1868
R=1871;1875;1879;1881;1885;1889;1894;1898;1900;1902;1909;1914;1918;1922;1926
R=1931;1934;1940;1944;1949;1955;1960;1964;1969;1975;1981;1986;1991;1996;2002
R=2008;2014;2020;2026;2031;2039;2045;2050;2057;2064;2069;2076;2082;2089;2096
R=2105;2115;2121;2128;2135;2141;2152;2160;2167;2175;2184;2192;2202;2211;2218
R=2228;2237;2246;2256;2266;2275;2284;2294;2302;2312;2321;2330;2341;2352;2362
R=2372;2383;2393;2403;2413;2424;2435;2447;2458;2467;2478;2489;2501;2515;2524
R=2536;2547;2559;2571;2582;2594;2605;2615;2626;2637;2648;2658;2670;2680;2690
R=2699;2708;2716;2724;2733;2741;2748;2753;2760;2766;2772;2777;2779;2781;2783
R=2785;2787;2788;2790;2789;2788;2788;2788;2788;2787;2786;2785;2783;2781;2780
R=2779;2778;2775;2773;2770;2768;2767;2764;2761;2759;2757;2756;2753;2751;2751
R=2749;2746;2745;2744;2742;2740;2739;2737;2736;2735;2733;2731;2729;2728;2727
R=2725;2725;2724;2723;2723;2723;2723;2722;2722;2721;2721;2722;2722;2722;2722
R=2723;2724;2724;2723;2724;2725;2726;2726;2726;2728;2728;2728;2729;2732;2733
R=2735;2737;2738;2739;2741;2743;2746;2748;2750;2751
ZFMT=0
TRCFMT=1;1000;E;L;F
R=2793;2794;2795;2795;2796;2796;2797;2799;2801;2803;2805;2806;2806;2807;2809
R=2812;2813;2814;2815;2817;2820;2822;2824;2825;2828;2830;2832;2836;2839;2842
R=2847;2850;2853;2857;2860;2864;2868;2871;2876;2880;2887;2893;2897;2904;2908
R=2914;2921;2927;2931;2936;2942;2948;2954;2960;2965;2971;2977;2982;2988;2993
R=2999;3004;3010;3015;3020;3023;3028;3033;3037;3041;3045;3050;3055;3056;3059
R=3062;3063;3064;3063;3061;3060;3056;3050;3045;3037;3029;3021;3011;3000;2990
R=2977;2965;2956;2944;2929;2915;2899;2882;2866;2848;2832;2815;2798;2779;2765
R=2747;2730;2714;2699;2682;2665;2651;2634;2619;2606;2590;2575;2560;2547;2534
R=2519;2505;2492;2482;2470;2457;2444;2431;2419;2408;2396;2385;2374;2362;2352
R=2342;2330;2319;2308;2298;2289;2280;2269;2260;2250;2241;2232;2223;2212;2203
R=2195;2188;2179;2171;2162;2152;2145;2137;2130;2122;2115;2109;2102;2095;2088
R=2082;2074;2065;2059;2052;2046;2040;2033;2027;2021;2013;2008;2002;1997;1991
R=1986;1980;1975;1970;1966;1958;1953;1949;1944;1938;1933;1930;1925;1922;1915
R=1913;1908;1904;1900;1895;1890;1886;1882;1879;1876;1871;1868;1865;1863;1859
R=1857;1853;1851;1849;1846;1842;1840;1837;1835;1832;1829;1827;1825;1821;1819
R=1818;1816;1813;1812;1810;1809;1808;1805;1803;1802;1801;1798;1799;1797;1796
R=1794;1793;1792;1790;1792;1790;1790;1790;1789;1789;1787;1787;1785;1785;1782
R=1784;1782;1781;1779;1779;1778;1778;1780;1779;1780;1777;1779;1779;1780;1781
R=1781;1780;1782;1783;1785;1786;1785;1788;1789;1792;1794;1794;1796;1798;1799
R=1802;1803;1804;1805;1808;1809;1811;1815;1815;1818;1819;1823;1826;1828;1830
R=1834;1836;1839;1842;1845;1846;1850;1854;1856;1857;1862;1866;1869;1874;1878
R=1880;1885;1890;1893;1896;1901;1904;1908;1913;1916;1922;1926;1930;1934;1940
R=1944;1950;1955;1959;1965;1972;1977;1983;1988;1995;2001;2007;2013;2020;2027
R=2035;2038;2046;2052;2059;2067;2075;2080;2088;2097;2105;2115;2121;2128;2137
R=2146;2156;2165;2173;2182;2191;2200;2210;2220;2230;2240;2249;2260;2271;2282
R=2295;2306;2316;2326;2336;2348;2364;2375;2387;2400;2412;2422;2436;2450;2463
R=2477;2493;2507;2521;2534;2548;2563;2578;2594;2609;2624;2638;2652;2668;2685
R=2700;2716;2731;2746;2763;2779;2794;2809;2824;2841;2857;2868;2882;2896;2908
R=2920;2930;2941;2950;2959;2965;2972;2979;2983;2986;2989;2991;2993;2993;2994
R=2994;2992;2990;2987;2985;2983;2979;2976;2972;2966;2963;2960;2956;2952;2946
R=2941;2936;2931;2927;2921;2915;2909;2903;2899;2895;2889;2884;2881;2875;2869
R=2865;2860;2856;2852;2846;2842;2840;2836;2832;2829;2824;2820;2818;2814;2811
R=2807;2804;2801;2798;2795;2792;2788;2786;2782;2779;2777;2774;2771;2768;2767
R=2765;2762;2760;2758;2756;2753;2751;2750;2748;2746;2743;2741;2739;2738;2737
R=2735;2733;2731;2729;2729;2728;2728;2726;2726;2726;2725;2724;2723;2724;2724
R=2723;2722;2722;2722;2722;2721;2721;2722;2722;2723;2723;2723;2723;2724;2724
R=2725;2727;2729;2730;2731;2733;2735;2736;2737;2739;2740;2742;2744;2745;2746
R=2749;2751;2751;2753;2756;2757;2759;2761;2764;2767;2768;2770;2773;2775;2778
R=2779;2780;2782;2783;2785;2786;2787;2788;2788;2788;2788;2789;2790;2788;2786
R=2785;2782;2781;2779;2777;2772;2766;2760;2754;2748;2740;2733;2724;2716;2708
R=2699;2690;2680;2670;2658;2648;2637;2626;2615;2605;2594;2582;2571;2559;2547
R=2536;2525;2515;2501;2489;2478;2467;2458;2447;2435;2424;2413;2403;2392;2382
R=2373;2362;2352;2341;2331;2321;2312;2303;2294;2284;2275;2266;2255;2247;2236
R=2227;2219;2211;2202;2192;2184;2175;2168;2160;2152;2142;2135;2128;2122;2114
R=2106;2097;2090;2082;2074;2070;2063;2057;2050;2044;2038;2031;2026;2020;2015
R=2008;2001;1996;1992;1986;1981;1974;1969;1965;1960;1955;1949;1944;1940;1935
R=1931;1926;1922;1918;1913;1909;1904;1900;1898;1894;1889;1885;1881;1879;1875
R=1871;1868;1865;1862;1859;1856;1852;1850;1847;1843;1841;1838;1836;1835;1831
R=1830;1828;1827;1825;1824;1822;1821;1817;1816;1814;1813;1812;1809;1809;1808
R=1805;1804;1802;1802;1800;1799;1799;1798;1798;1797;1797;1796;1796;1795;1795
R=1795;1795;1793;1794;1792;1794;1791;1794;1794;1794;1794;1795;1795;1795;1796
R=1795;1795;1796;1796;1796;1796;1797;1798;1800;1802;1803;1803;1806;1808;1809
R=1809;1811;1812;1813;1815;1818;1818;1821;1823;1826;1829;1831;1834;1836;1838
R=1842;1844;1846;1849;1851;1855;1856;1859;1863;1866;1869;1872;1876;1877;1883
R=1886;1890;1895;1900;1902;1907;1911;1916;1919;1925;1929;1932;1938;1943;1948
R=1952;1957;1962;1967;1973;1978;1984;1990;1995;2001;2008;2013;2020;2024;2030
R=2036;2043;2050;2055;2064;2071;2077;2083;2091;2099;2105;2114;2122;2130;2138
R=2145;2154;2164;2172;2179;2189;2199;2208;2217;2225;2233;2243;2253;2263;2275
R=2285;2295;2305;2315;2326;2337;2348;2359;2370;2382;2393;2406;2419;2431;2442
R=2455;2468;2480;2495;2508;2521;2534;2548;2563;2578;2592;2606;2620;2635;2650
R=2666;2682;2697;2713;2728;2744;2759;2775;2788;2802;2817;2830;2842;2854;2866
R=2877;2886;2894;2903;2910;2914;2919;2923;2927;2929;2930;2930;2929;2928;2930
R=2928;2926;2924;2922;2919;2916;2914;2912;2909;2907;2904;2902;2898;2895;2890
R=2886;2884;2881;2876;2872;2869;2866;2863;2860;2856;2852;2850;2847;2843;2840
R=2838;2835;2832;2829;2827;2824;2822;2821;2819;2817;2814;2812;2810;2808;2806
R=2804;2801;2801;2801;2799;2798;2797;2796;2796;2796;2795;2794;2793;2793;2793
R=2792;2791;2791;2791;2790;2791;2790;2791;2792;2793
ZFMT=0
`;
const STD_OMA_ROUND = `REQ=FIL
JOB="1287"
BEVC=5.38;5.38
BSIZ=0.0;0.0
CIRC= 145.60; 145.45
CSIZ=0.0;0.0
DBL=20.83
ETYP=1
FCRV=5.38;5.38
FTYP=2
HBOX=  48.77;  49.30
VBOX=  42.35;  41.85
ZTILT=3.85;3.85
.IFT=?
BEVM=?;?
BEVP=?;?
PINB=?;?
.ED=50.80;50.98
.AX=25.20;154.35
FED=50.80;50.98
FEDAX=25.20;154.35
DRILLE=0
TRCFMT=1;800;E;R;F
R=2407;2410;2413;2417;2420;2422;2427;2430;2433;2437;2439;2442;2446;2449;2452
R=2455;2458;2461;2463;2466;2469;2472;2475;2479;2482;2485;2487;2489;2492;2495
R=2498;2500;2502;2506;2508;2511;2513;2516;2519;2521;2523;2525;2527;2528;2531
R=2532;2534;2534;2536;2537;2537;2538;2538;2538;2539;2539;2540;2540;2540;2540
R=2540;2539;2539;2539;2538;2537;2536;2534;2532;2530;2527;2525;2522;2519;2517
R=2513;2511;2507;2504;2501;2497;2494;2490;2486;2481;2477;2473;2469;2464;2459
R=2455;2451;2446;2441;2436;2431;2426;2421;2416;2411;2407;2401;2395;2390;2385
R=2380;2375;2369;2364;2359;2354;2348;2345;2340;2334;2330;2325;2320;2315;2311
R=2306;2301;2297;2292;2288;2285;2281;2276;2273;2268;2264;2259;2255;2250;2246
R=2242;2239;2235;2232;2228;2224;2221;2217;2214;2210;2206;2203;2200;2196;2193
R=2189;2186;2184;2181;2178;2175;2174;2171;2168;2165;2164;2161;2158;2156;2154
R=2152;2150;2148;2147;2145;2143;2141;2140;2137;2136;2135;2133;2131;2130;2129
R=2128;2126;2125;2124;2122;2122;2121;2120;2120;2120;2119;2119;2118;2118;2117
R=2117;2116;2116;2116;2117;2117;2117;2118;2118;2118;2118;2118;2118;2118;2119
R=2119;2118;2119;2119;2120;2121;2122;2123;2124;2126;2128;2129;2130;2132;2133
R=2134;2136;2138;2140;2142;2144;2146;2148;2150;2152;2155;2158;2160;2162;2165
R=2168;2170;2172;2174;2176;2179;2182;2184;2189;2193;2195;2198;2202;2205;2207
R=2212;2215;2220;2222;2224;2229;2232;2237;2240;2244;2247;2251;2255;2259;2262
R=2266;2270;2274;2278;2283;2287;2291;2295;2299;2303;2308;2313;2317;2321;2326
R=2330;2335;2340;2344;2348;2353;2357;2362;2366;2370;2375;2379;2383;2388;2392
R=2396;2401;2404;2408;2413;2418;2422;2426;2430;2434;2438;2442;2446;2451;2455
R=2459;2464;2468;2471;2475;2479;2483;2486;2490;2493;2496;2499;2502;2504;2507
R=2510;2512;2514;2516;2518;2520;2521;2521;2522;2523;2524;2526;2527;2527;2528
R=2528;2528;2528;2527;2525;2524;2523;2521;2519;2518;2515;2513;2511;2508;2505
R=2511;2510;2506;2506;2504;2502;2500;2497;2495;2492;2490;2486;2483;2481;2480
R=2478;2476;2473;2471;2469;2466;2464;2462;2460;2458;2456;2454;2452;2450;2447
R=2445;2443;2441;2440;2438;2436;2434;2434;2432;2431;2429;2426;2425;2423;2422
R=2420;2418;2416;2415;2413;2412;2411;2410;2409;2408;2404;2403;2401;2400;2398
R=2397;2395;2394;2392;2391;2389;2387;2386;2384;2383;2381;2380;2379;2378;2377
R=2377;2376;2374;2373;2372;2371;2369;2368;2367;2364;2362;2361;2359;2358;2357
R=2356;2355;2353;2352;2351;2351;2350;2348;2346;2345;2344;2342;2340;2338;2337
R=2335;2334;2333;2331;2330;2328;2327;2325;2323;2322;2319;2317;2316;2314;2312
R=2309;2307;2305;2304;2301;2300;2298;2296;2294;2292;2290;2288;2286;2285;2283
R=2281;2278;2276;2275;2272;2270;2267;2265;2263;2261;2258;2256;2254;2253;2250
R=2248;2245;2242;2240;2238;2237;2235;2232;2230;2227;2226;2224;2222;2219;2217
R=2215;2213;2211;2208;2206;2203;2201;2200;2197;2195;2193;2191;2188;2186;2184
R=2183;2180;2178;2177;2175;2173;2170;2169;2167;2166;2164;2163;2161;2160;2159
R=2157;2155;2154;2152;2150;2149;2148;2147;2146;2145;2144;2142;2141;2140;2138
R=2137;2137;2135;2134;2133;2133;2131;2130;2129;2129;2128;2126;2126;2126;2126
R=2124;2123;2123;2122;2122;2122;2121;2120;2118;2118;2119;2119;2118;2118;2118
R=2116;2116;2116;2116;2115;2115;2115;2113;2113;2113;2113;2113;2113;2112;2112
R=2112;2112;2112;2112;2112;2112;2113;2113;2113;2114;2114;2115;2115;2116;2116
R=2117;2118;2119;2120;2121;2121;2122;2122;2123;2123;2124;2126;2127;2128;2129
R=2129;2131;2132;2133;2134;2135;2137;2138;2139;2140;2141;2143;2144;2145;2147
R=2149;2150;2152;2154;2156;2158;2159;2160;2160;2161;2163;2164;2166;2167;2169
R=2171;2172;2174;2176;2177;2179;2180;2183;2186;2188;2189;2191;2192;2194;2195
R=2195;2196;2199;2201;2202;2204;2205;2208;2209;2211;2213;2214;2216;2217;2219
R=2221;2222;2223;2224;2226;2228;2230;2231;2232;2234;2236;2237;2238;2239;2240
R=2242;2243;2244;2247;2248;2250;2251;2252;2253;2255;2256;2257;2258;2259;2260
R=2261;2262;2263;2264;2265;2267;2269;2271;2272;2273;2275;2276;2277;2279;2281
R=2282;2283;2284;2287;2289;2291;2292;2294;2298;2300;2303;2304;2305;2306;2308
R=2311;2313;2315;2317;2319;2321;2324;2327;2329;2332;2334;2337;2339;2342;2344
R=2347;2350;2354;2356;2359;2362;2365;2368;2371;2373;2376;2379;2382;2386;2389
R=2392;2395;2398;2401;2403
ZFMT=0
TRCFMT=1;800;E;L;F
R=2447;2449;2451;2453;2455;2457;2460;2463;2465;2467;2470;2472;2475;2477;2480
R=2481;2484;2486;2488;2489;2490;2493;2496;2498;2501;2503;2504;2503;2504;2504
R=2507;2511;2516;2520;2522;2524;2526;2528;2529;2530;2532;2528;2524;2525;2525
R=2526;2526;2527;2527;2527;2527;2527;2528;2528;2528;2528;2527;2526;2524;2523
R=2521;2519;2517;2516;2513;2512;2509;2506;2503;2500;2497;2492;2489;2485;2482
R=2478;2473;2469;2464;2460;2456;2452;2447;2442;2438;2433;2428;2425;2420;2415
R=2409;2404;2399;2394;2390;2385;2380;2375;2370;2365;2361;2357;2352;2347;2342
R=2337;2331;2327;2322;2317;2312;2308;2302;2298;2294;2289;2283;2279;2275;2271
R=2267;2263;2258;2255;2250;2246;2242;2238;2234;2229;2225;2222;2218;2215;2211
R=2208;2203;2200;2197;2193;2190;2187;2184;2180;2177;2173;2170;2168;2164;2162
R=2160;2158;2155;2151;2149;2147;2145;2142;2139;2137;2134;2133;2131;2129;2126
R=2125;2123;2120;2119;2117;2116;2114;2112;2111;2110;2108;2107;2105;2104;2103
R=2102;2102;2101;2100;2099;2098;2098;2097;2096;2095;2095;2094;2094;2094;2094
R=2093;2093;2093;2092;2092;2091;2092;2092;2092;2092;2092;2093;2094;2094;2095
R=2096;2096;2098;2100;2101;2102;2103;2104;2106;2107;2108;2110;2112;2114;2116
R=2117;2119;2121;2123;2125;2128;2130;2132;2135;2137;2139;2140;2143;2146;2149
R=2152;2156;2159;2162;2164;2168;2171;2175;2178;2181;2184;2187;2191;2195;2199
R=2204;2207;2210;2214;2218;2221;2226;2230;2234;2238;2242;2246;2251;2255;2260
R=2265;2269;2274;2279;2284;2289;2293;2298;2303;2308;2314;2318;2323;2328;2333
R=2338;2343;2348;2352;2357;2362;2366;2370;2377;2381;2386;2391;2396;2400;2405
R=2410;2417;2422;2426;2430;2436;2441;2445;2450;2456;2460;2464;2468;2472;2477
R=2481;2485;2489;2493;2496;2500;2504;2506;2510;2513;2517;2519;2522;2526;2528
R=2530;2531;2532;2534;2536;2538;2542;2544;2545;2546;2547;2548;2548;2549;2548
R=2548;2548;2548;2548;2548;2548;2547;2547;2547;2545;2545;2544;2543;2542;2541
R=2540;2539;2537;2535;2533;2530;2529;2526;2523;2521;2519;2517;2514;2512;2509
R=2507;2505;2502;2499;2497;2495;2492;2489;2486;2484;2481;2477;2474;2472;2469
R=2467;2464;2461;2458;2455;2453;2451;2448;2446;2442;2440;2437;2434;2432;2429
R=2425;2421;2418;2416;2413;2410;2407;2405;2402;2400;2397;2395;2392;2390;2387
R=2384;2382;2379;2376;2374;2371;2367;2364;2361;2359;2356;2354;2351;2349;2348
R=2345;2343;2341;2339;2337;2334;2332;2330;2328;2325;2324;2322;2320;2317;2315
R=2313;2310;2308;2306;2304;2303;2301;2299;2298;2296;2294;2293;2291;2289;2288
R=2286;2285;2283;2282;2281;2279;2277;2276;2275;2273;2271;2270;2268;2267;2265
R=2264;2262;2260;2259;2258;2256;2255;2253;2251;2248;2247;2245;2244;2242;2240
R=2239;2237;2235;2233;2232;2229;2227;2225;2223;2221;2219;2217;2215;2212;2210
R=2208;2206;2204;2201;2200;2198;2196;2194;2193;2191;2190;2188;2186;2184;2182
R=2181;2179;2177;2175;2172;2171;2169;2167;2165;2164;2162;2160;2159;2158;2155
R=2154;2152;2150;2148;2147;2145;2143;2141;2140;2138;2136;2135;2134;2132;2131
R=2130;2128;2128;2126;2124;2123;2121;2119;2118;2117;2116;2114;2113;2112;2110
R=2109;2108;2107;2105;2105;2104;2102;2102;2101;2100;2099;2098;2096;2097;2096
R=2095;2095;2095;2094;2093;2092;2092;2092;2092;2093;2092;2091;2090;2091;2092
R=2092;2092;2092;2092;2092;2092;2092;2092;2092;2093;2093;2093;2093;2093;2094
R=2094;2095;2094;2095;2095;2095;2096;2096;2097;2097;2097;2099;2100;2100;2102
R=2103;2104;2105;2107;2108;2109;2110;2111;2113;2115;2116;2117;2118;2119;2121
R=2122;2124;2125;2126;2128;2129;2131;2132;2134;2136;2138;2139;2140;2141;2143
R=2145;2148;2149;2152;2154;2156;2159;2162;2164;2166;2167;2169;2170;2172;2174
R=2177;2179;2181;2183;2186;2189;2190;2193;2195;2197;2199;2202;2205;2207;2209
R=2213;2215;2217;2218;2221;2223;2225;2227;2229;2231;2234;2237;2239;2242;2244
R=2245;2247;2250;2253;2255;2256;2258;2260;2264;2266;2269;2272;2274;2276;2279
R=2280;2282;2285;2288;2289;2292;2295;2297;2299;2300;2302;2305;2308;2311;2312
R=2314;2315;2318;2320;2322;2324;2326;2329;2332;2334;2335;2337;2340;2341;2344
R=2346;2348;2349;2352;2355;2357;2359;2360;2363;2366;2369;2371;2373;2374;2375
R=2376;2379;2381;2382;2384;2387;2388;2390;2392;2394;2396;2398;2399;2401;2403
R=2405;2407;2409;2412;2414;2416;2418;2420;2421;2422;2424;2427;2428;2430;2433
R=2436;2439;2441;2442;2445
ZFMT=0
`;
const STD_OMA_AVIATOR = `REQ=FIL
JOB="1505"
FNAM=1505
CIRC=162.19;162.03
DBL=14.23
HBOX=55.00;55.00
VBOX=45.00;45.00
ZTILT=4.56;5.63
.ED=61.56;61.74
.AX=31.95;146.70
BEVC=?;?
BEVP=?;?
BEVM=?;?
BSIZ=?;?
CSIZ=?;?
FCRV=?;?
PINB=?;?
.IFT=?
FED=61.56;61.74
FEDAX=31.95;146.70
MPD=73.00
ETYP=1
FTYP=1
DRILLE=0
TRCFMT=1;800;E;R;F
R=2499;2508;2517;2526;2534;2543;2552;2560;2570;2578;2586;2596;2605;2614;2623
R=2632;2641;2651;2661;2669;2679;2688;2697;2707;2717;2727;2737;2747;2756;2767
R=2776;2785;2796;2806;2816;2826;2837;2847;2857;2868;2877;2888;2898;2909;2919
R=2928;2938;2948;2957;2967;2975;2984;2992;3000;3009;3017;3024;3031;3037;3043
R=3049;3054;3059;3062;3065;3069;3072;3075;3077;3077;3077;3078;3078;3077;3077
R=3076;3073;3071;3069;3065;3061;3057;3054;3048;3044;3039;3033;3026;3018;3010
R=3001;2991;2982;2971;2961;2950;2938;2927;2915;2904;2891;2879;2867;2854;2843
R=2831;2819;2807;2797;2785;2773;2762;2752;2741;2729;2718;2708;2696;2686;2676
R=2665;2655;2644;2634;2625;2614;2605;2595;2585;2575;2566;2557;2548;2540;2531
R=2522;2514;2505;2496;2489;2480;2472;2464;2456;2449;2442;2434;2427;2421;2413
R=2407;2402;2395;2388;2382;2376;2371;2365;2359;2354;2349;2343;2338;2334;2329
R=2326;2320;2316;2313;2309;2305;2302;2297;2294;2291;2288;2285;2283;2281;2278
R=2275;2272;2270;2268;2265;2263;2261;2260;2258;2257;2256;2255;2254;2252;2251
R=2250;2250;2250;2249;2249;2249;2249;2249;2250;2250;2251;2253;2253;2254;2255
R=2256;2256;2258;2258;2260;2261;2263;2264;2267;2268;2270;2272;2274;2277;2279
R=2282;2284;2287;2290;2292;2295;2299;2302;2306;2309;2313;2316;2320;2324;2328
R=2331;2335;2339;2344;2348;2352;2357;2362;2367;2371;2376;2381;2386;2392;2397
R=2402;2407;2413;2419;2424;2430;2437;2444;2450;2457;2462;2468;2475;2481;2487
R=2494;2502;2509;2516;2523;2530;2537;2545;2553;2561;2568;2575;2584;2591;2598
R=2607;2615;2624;2631;2639;2647;2655;2663;2671;2680;2688;2695;2703;2711;2718
R=2727;2734;2742;2750;2757;2764;2770;2777;2785;2791;2798;2804;2811;2816;2822
R=2828;2834;2839;2845;2849;2853;2858;2862;2866;2870;2873;2877;2880;2882;2885
R=2889;2890;2892;2894;2896;2896;2897;2897;2897;2897;2897;2896;2896;2895;2894
R=2894;2891;2889;2888;2886;2884;2881;2879;2876;2874;2871;2868;2865;2863;2860
R=2857;2853;2849;2845;2843;2839;2836;2833;2829;2824;2818;2810;2803;2799;2798
R=2798;2797;2795;2791;2785;2780;2775;2771;2768;2766;2763;2761;2759;2758;2758
R=2758;2757;2755;2752;2748;2745;2743;2741;2738;2737;2734;2731;2730;2727;2726
R=2724;2722;2721;2719;2718;2716;2715;2713;2712;2711;2710;2710;2708;2707;2706
R=2705;2704;2703;2703;2702;2702;2702;2702;2701;2701;2701;2700;2700;2700;2700
R=2700;2700;2700;2700;2700;2700;2701;2701;2702;2701;2702;2703;2703;2704;2704
R=2704;2706;2706;2706;2707;2707;2708;2708;2709;2709;2709;2709;2710;2711;2711
R=2711;2712;2712;2712;2712;2711;2711;2710;2709;2709;2708;2708;2707;2706;2706
R=2706;2705;2705;2703;2703;2702;2700;2699;2697;2696;2695;2694;2692;2689;2687
R=2685;2684;2680;2678;2676;2673;2671;2669;2666;2663;2660;2658;2655;2651;2648
R=2645;2642;2638;2634;2631;2627;2622;2618;2614;2610;2605;2600;2595;2591;2586
R=2580;2575;2570;2564;2558;2552;2546;2541;2535;2529;2523;2517;2512;2505;2498
R=2491;2484;2479;2471;2465;2460;2454;2446;2440;2434;2426;2420;2414;2409;2402
R=2397;2391;2385;2378;2371;2365;2358;2353;2348;2342;2336;2330;2323;2317;2310
R=2304;2298;2293;2287;2281;2275;2270;2263;2257;2252;2245;2239;2233;2228;2222
R=2216;2211;2207;2202;2195;2189;2184;2179;2174;2168;2164;2159;2155;2150;2146
R=2141;2136;2132;2128;2124;2119;2115;2111;2107;2104;2101;2097;2093;2090;2086
R=2082;2079;2076;2073;2069;2066;2063;2060;2057;2055;2052;2049;2046;2044;2042
R=2039;2036;2035;2032;2030;2028;2026;2025;2023;2021;2019;2018;2016;2014;2013
R=2011;2010;2009;2007;2006;2005;2004;2002;2001;1999;1999;1999;1998;1997;1996
R=1994;1994;1994;1993;1994;1993;1993;1992;1992;1992;1992;1992;1992;1992;1992
R=1992;1993;1993;1993;1994;1995;1995;1996;1997;1997;1998;1999;1999;2001;2002
R=2003;2004;2005;2007;2008;2009;2011;2013;2016;2016;2018;2020;2022;2024;2026
R=2028;2030;2033;2035;2037;2039;2042;2044;2046;2048;2052;2054;2057;2060;2063
R=2067;2070;2073;2077;2079;2082;2086;2089;2092;2095;2099;2104;2107;2111;2114
R=2118;2123;2126;2130;2133;2137;2142;2146;2150;2154;2159;2163;2167;2171;2175
R=2180;2185;2190;2194;2200;2204;2209;2214;2219;2224;2229;2234;2240;2246;2251
R=2257;2263;2268;2273;2279;2284;2290;2297;2303;2309;2314;2321;2327;2333;2340
R=2347;2354;2361;2368;2375;2382;2389;2397;2405;2412;2420;2428;2435;2443;2450
R=2458;2466;2474;2483;2492
ZFMT=1;200;E;R;F
Z=121;130;140;150;162;174;186;199;213;226;237;249;260;270;278;284;288;291;290
Z=286;279;271;260;248;234;219;204;190;176;163;151;139;129;118;109;101;93;85;79
Z=74;69;63;59;55;50;47;44;41;39;37;37;35;34;33;33;34;35;37;38;41;44;48;52;56;61
Z=65;70;77;85;93;101;109;116;124;131;139;146;150;156;160;163;166;167;168;168
Z=166;163;159;155;151;147;142;139;121;125;110;106;115;117;116;116;117;117;116
Z=117;118;119;120;122;124;126;127;130;132;133;134;135;137;137;137;136;135;134
Z=133;132;130;129;127;125;123;119;116;112;107;102;97;92;86;81;76;71;66;61;55;50
Z=45;40;35;32;29;26;22;20;17;15;13;11;9;8;6;4;3;3;3;2;2;1;1;0;1;1;0;1;1;3;5;6;8
Z=11;13;16;18;21;25;29;32;36;40;44;49;53;57;63;69;74;81;88;95;103;112
TRCFMT=1;800;E;L;F
R=2720;2722;2725;2728;2731;2733;2736;2739;2741;2743;2745;2745;2747;2750;2756
R=2762;2767;2773;2777;2779;2782;2784;2787;2792;2798;2803;2808;2812;2817;2820
R=2823;2827;2831;2835;2839;2843;2847;2850;2854;2858;2861;2864;2867;2872;2875
R=2878;2881;2884;2886;2889;2890;2892;2894;2896;2897;2899;2900;2901;2901;2902
R=2902;2902;2903;2902;2900;2899;2897;2896;2894;2891;2888;2886;2882;2878;2875
R=2871;2867;2863;2858;2852;2847;2841;2836;2830;2824;2818;2812;2805;2799;2793
R=2786;2779;2772;2764;2757;2749;2742;2734;2727;2718;2710;2702;2694;2687;2679
R=2670;2662;2653;2645;2637;2630;2622;2614;2606;2598;2590;2582;2574;2567;2559
R=2551;2543;2536;2528;2521;2513;2507;2500;2492;2485;2479;2473;2466;2459;2452
R=2447;2441;2434;2428;2422;2416;2410;2405;2400;2394;2389;2384;2378;2373;2368
R=2363;2359;2354;2349;2345;2341;2336;2333;2329;2325;2321;2317;2313;2310;2306
R=2302;2298;2294;2291;2288;2286;2284;2282;2280;2278;2275;2273;2271;2269;2268
R=2266;2264;2263;2261;2259;2258;2256;2255;2254;2253;2252;2251;2249;2249;2249
R=2249;2249;2249;2249;2249;2249;2249;2249;2249;2250;2251;2252;2253;2254;2254
R=2256;2257;2259;2261;2263;2266;2267;2269;2272;2274;2276;2278;2280;2283;2287
R=2291;2294;2297;2301;2304;2308;2311;2314;2320;2324;2328;2333;2337;2341;2347
R=2352;2357;2362;2367;2373;2378;2384;2391;2398;2404;2411;2417;2425;2432;2439
R=2446;2454;2462;2469;2478;2486;2494;2503;2512;2521;2530;2538;2548;2558;2567
R=2577;2586;2596;2606;2617;2627;2637;2647;2657;2668;2678;2689;2700;2710;2721
R=2733;2743;2754;2765;2776;2788;2800;2811;2823;2835;2848;2860;2871;2883;2895
R=2907;2919;2930;2942;2953;2964;2975;2986;2996;3006;3015;3024;3031;3039;3046
R=3052;3058;3063;3068;3072;3076;3079;3081;3084;3085;3086;3087;3087;3086;3085
R=3083;3082;3079;3076;3074;3071;3068;3063;3059;3054;3049;3044;3038;3031;3024
R=3017;3009;3001;2994;2985;2976;2967;2957;2947;2938;2929;2919;2910;2899;2889
R=2879;2869;2858;2848;2838;2829;2819;2808;2798;2788;2778;2767;2758;2747;2737
R=2727;2718;2709;2699;2690;2680;2670;2661;2652;2643;2634;2625;2616;2607;2599
R=2591;2581;2572;2565;2557;2548;2540;2531;2523;2515;2506;2498;2490;2483;2475
R=2467;2459;2453;2444;2437;2429;2422;2416;2408;2401;2394;2388;2381;2374;2367
R=2360;2354;2348;2342;2335;2329;2323;2316;2310;2304;2298;2292;2287;2281;2276
R=2272;2266;2259;2254;2249;2244;2239;2234;2229;2223;2218;2214;2209;2204;2199
R=2195;2191;2187;2183;2179;2174;2170;2166;2161;2157;2154;2150;2146;2142;2137
R=2133;2128;2124;2120;2117;2113;2109;2106;2103;2099;2096;2092;2089;2086;2082
R=2078;2075;2073;2070;2067;2064;2061;2058;2056;2053;2049;2047;2045;2042;2040
R=2038;2036;2033;2032;2030;2028;2026;2024;2023;2021;2019;2018;2017;2015;2014
R=2013;2012;2011;2009;2009;2008;2007;2006;2006;2005;2005;2005;2005;2004;2003
R=2003;2003;2003;2003;2002;2002;2002;2003;2003;2003;2003;2003;2004;2005;2005
R=2005;2005;2007;2008;2009;2010;2011;2012;2013;2013;2015;2017;2017;2019;2020
R=2021;2023;2024;2025;2027;2029;2030;2032;2034;2036;2037;2040;2042;2044;2046
R=2048;2050;2052;2055;2058;2061;2063;2066;2069;2072;2074;2077;2080;2084;2089
R=2092;2096;2099;2103;2106;2110;2113;2117;2120;2124;2128;2132;2137;2141;2146
R=2150;2155;2159;2164;2169;2174;2180;2184;2189;2194;2199;2204;2208;2213;2218
R=2223;2229;2235;2242;2247;2252;2257;2263;2268;2273;2279;2284;2290;2297;2302
R=2308;2314;2321;2326;2331;2337;2343;2348;2353;2359;2365;2371;2377;2383;2389
R=2395;2401;2407;2413;2418;2425;2431;2437;2444;2450;2456;2463;2469;2475;2480
R=2486;2493;2499;2505;2511;2517;2522;2529;2534;2539;2544;2549;2554;2559;2564
R=2568;2574;2578;2582;2586;2591;2594;2598;2602;2606;2609;2613;2616;2619;2622
R=2625;2627;2630;2633;2635;2638;2640;2642;2645;2647;2648;2650;2652;2654;2655
R=2658;2659;2660;2662;2662;2663;2664;2665;2667;2668;2668;2668;2669;2669;2670
R=2671;2672;2673;2673;2673;2672;2672;2673;2673;2673;2673;2672;2673;2673;2673
R=2673;2673;2674;2674;2674;2674;2673;2673;2673;2672;2672;2672;2671;2671;2671
R=2671;2670;2670;2670;2670;2669;2669;2669;2669;2668;2668;2669;2670;2671;2671
R=2671;2672;2672;2672;2672;2672;2673;2674;2675;2675;2676;2677;2679;2680;2680
R=2681;2684;2685;2687;2688;2689;2690;2693;2695;2697;2699;2700;2702;2705;2707
R=2710;2711;2714;2716;2718
ZFMT=1;200;E;L;F
Z=139;141;144;134;124;140;141;146;148;150;153;155;157;158;158;157;154;150;146
Z=142;137;130;124;117;109;102;96;89;84;77;71;66;62;58;54;51;47;45;43;41;40;39
Z=38;37;38;40;41;42;44;45;47;50;53;57;60;66;71;77;84;90;98;104;112;121;130;140
Z=152;163;176;188;204;219;234;250;266;281;295;307;317;325;328;328;325;321;315
Z=307;298;287;275;263;249;235;221;208;196;184;172;161;152;143;133;125;117;109
Z=102;95;88;81;75;69;63;59;54;49;43;39;34;30;26;23;20;16;14;11;8;6;5;3;2;1;1;1
Z=1;1;2;2;1;1;0;1;2;3;4;6;9;11;14;17;20;25;29;34;39;45;50;56;63;69;76;82;88;95
Z=101;108;115;121;126;130;134;138;141;144;146;148;150;151;155;157;156;157;156
Z=155;154;153;151;150;148;147;144;142;141;139;138;137;136;136;136;136;137;138
`;
const STD_OMA_CATEYE = `REQ=FIL
JOB="1504"
FNAM=1504
BEVM=0.00;0.00
BEVP=7;7
CIRC=148.68;148.68
DBL=17.00
HBOX=55.72;55.72
PINB=0.00;0.00
VBOX=37.19;37.19
ZTILT=4;4
.ED=58.64;58.64
.AX=149.88;29.76
FED=58.64;58.64
FEDAX=149.88;29.76
MPD=72.72
.IFT=?
BEVC=?;?
BSIZ=?;?
CSIZ=?;?
ETYP=1
FCRV=?;?
FTYP=1
DRILLE=0
TRCFMT=1;1000;U;R;F
R=2775;2780;2785;2790;2796;2802;2808;2814;2821;2828;2834;2840;2846;2850;2853
R=2855;2857;2858;2859;2860;2861;2863;2865;2868;2871;2874;2876;2878;2879;2879
R=2878;2877;2876;2874;2871;2867;2863;2858;2852;2847;2841;2836;2830;2825;2819
R=2812;2805;2797;2789;2780;2771;2762;2753;2744;2735;2727;2718;2710;2702;2694
R=2686;2678;2669;2659;2648;2637;2626;2614;2603;2591;2580;2569;2559;2549;2539
R=2529;2519;2509;2500;2490;2481;2472;2464;2455;2446;2438;2429;2420;2412;2403
R=2394;2386;2377;2369;2361;2352;2344;2335;2326;2317;2308;2298;2288;2279;2269
R=2260;2251;2242;2234;2226;2217;2209;2201;2193;2186;2178;2171;2164;2157;2150
R=2143;2136;2129;2123;2116;2110;2104;2098;2092;2085;2079;2073;2068;2062;2056
R=2050;2045;2039;2033;2027;2021;2015;2009;2003;1998;1992;1986;1980;1975;1970
R=1964;1959;1954;1949;1945;1940;1936;1931;1927;1923;1919;1915;1911;1906;1902
R=1898;1894;1890;1886;1881;1878;1874;1871;1867;1864;1861;1858;1855;1852;1849
R=1847;1844;1841;1839;1837;1835;1832;1830;1827;1825;1823;1821;1819;1817;1815
R=1814;1812;1811;1809;1808;1806;1805;1804;1803;1802;1801;1800;1800;1799;1799
R=1798;1798;1798;1797;1797;1797;1797;1797;1796;1796;1796;1795;1795;1795;1794
R=1794;1793;1792;1792;1792;1792;1792;1792;1792;1792;1793;1793;1793;1794;1794
R=1795;1797;1798;1799;1800;1801;1802;1803;1804;1806;1808;1809;1811;1813;1815
R=1817;1818;1820;1822;1824;1826;1827;1829;1831;1833;1835;1836;1838;1840;1842
R=1844;1846;1848;1851;1853;1856;1858;1861;1864;1866;1869;1872;1875;1878;1881
R=1884;1888;1892;1896;1900;1904;1909;1913;1917;1922;1926;1931;1936;1941;1946
R=1951;1955;1960;1965;1970;1976;1981;1986;1991;1997;2002;2008;2014;2020;2026
R=2031;2037;2043;2049;2054;2060;2066;2073;2080;2087;2094;2101;2109;2116;2124
R=2132;2141;2149;2158;2167;2177;2186;2196;2206;2215;2225;2235;2245;2254;2264
R=2273;2283;2292;2301;2310;2319;2328;2338;2347;2357;2367;2377;2388;2399;2410
R=2421;2432;2444;2455;2466;2477;2488;2499;2511;2522;2533;2544;2554;2564;2573
R=2582;2590;2599;2606;2613;2620;2628;2635;2643;2651;2660;2669;2678;2688;2697
R=2707;2718;2728;2738;2749;2760;2770;2781;2792;2803;2814;2825;2836;2847;2856
R=2866;2876;2887;2897;2906;2914;2920;2925;2928;2930;2931;2932;2932;2931;2930
R=2929;2929;2928;2928;2927;2927;2927;2926;2926;2926;2925;2924;2923;2922;2920
R=2918;2915;2912;2908;2905;2901;2898;2894;2890;2885;2881;2878;2874;2869;2865
R=2861;2857;2853;2848;2844;2839;2835;2831;2826;2821;2815;2809;2802;2796;2789
R=2782;2775;2768;2762;2755;2748;2742;2735;2729;2723;2717;2711;2705;2698;2691
R=2685;2678;2671;2665;2659;2652;2645;2638;2630;2621;2613;2606;2598;2591;2584
R=2577;2569;2562;2555;2548;2541;2534;2528;2522;2516;2510;2505;2501;2496;2490
R=2485;2479;2473;2466;2460;2454;2447;2441;2435;2430;2424;2419;2413;2408;2403
R=2398;2394;2389;2384;2379;2374;2369;2365;2360;2355;2349;2344;2338;2333;2327
R=2322;2316;2310;2305;2300;2294;2289;2283;2279;2274;2270;2266;2262;2257;2253
R=2248;2243;2239;2234;2229;2224;2219;2214;2209;2204;2198;2193;2188;2182;2178
R=2173;2169;2164;2160;2155;2150;2145;2140;2135;2130;2124;2119;2114;2109;2104
R=2099;2094;2089;2084;2080;2076;2072;2069;2065;2061;2058;2054;2051;2047;2043
R=2039;2035;2031;2027;2023;2020;2016;2013;2009;2006;2002;1999;1996;1993;1990
R=1987;1984;1981;1978;1975;1972;1969;1966;1962;1959;1956;1952;1949;1945;1941
R=1937;1933;1929;1925;1921;1918;1914;1911;1908;1905;1902;1899;1896;1894;1891
R=1889;1886;1884;1882;1880;1879;1877;1876;1875;1874;1873;1872;1871;1870;1869
R=1868;1867;1866;1865;1865;1864;1862;1861;1860;1859;1858;1856;1855;1853;1851
R=1849;1847;1845;1843;1841;1838;1836;1834;1832;1829;1827;1825;1823;1821;1819
R=1817;1816;1814;1812;1811;1810;1809;1808;1807;1806;1806;1805;1805;1805;1805
R=1805;1805;1805;1805;1805;1805;1805;1805;1806;1806;1806;1806;1806;1806;1805
R=1804;1804;1803;1802;1801;1801;1800;1800;1800;1800;1800;1800;1800;1800;1800
R=1800;1800;1800;1801;1801;1802;1802;1802;1803;1803;1804;1804;1805;1806;1807
R=1808;1809;1811;1812;1813;1814;1815;1816;1817;1818;1820;1821;1823;1824;1826
R=1828;1830;1832;1835;1837;1839;1842;1844;1847;1850;1853;1856;1859;1862;1865
R=1868;1872;1875;1878;1881;1884;1888;1891;1894;1897;1901;1904;1907;1911;1915
R=1918;1922;1925;1928;1931;1934;1937;1940;1942;1945;1947;1950;1952;1954;1956
R=1958;1961;1963;1966;1968;1971;1973;1976;1979;1982;1985;1988;1991;1994;1996
R=1999;2002;2006;2009;2012;2015;2019;2022;2026;2030;2034;2038;2042;2045;2049
R=2052;2055;2058;2061;2064;2066;2068;2070;2072;2075;2077;2079;2081;2083;2086
R=2088;2091;2094;2097;2100;2104;2108;2112;2116;2120;2124;2129;2132;2135;2139
R=2142;2146;2150;2154;2158;2161;2165;2168;2172;2175;2178;2182;2185;2189;2192
R=2196;2199;2201;2204;2207;2211;2215;2219;2222;2227;2231;2236;2241;2245;2250
R=2255;2260;2265;2270;2275;2281;2286;2291;2297;2303;2310;2317;2323;2330;2337
R=2343;2349;2355;2360;2365;2371;2377;2383;2388;2394;2400;2406;2412;2417;2422
R=2426;2430;2434;2438;2442;2446;2450;2455;2459;2464;2468;2473;2477;2482;2487
R=2492;2497;2502;2506;2511;2515;2519;2522;2526;2530;2534;2538;2541;2545;2549
R=2554;2559;2564;2570;2575;2581;2587;2593;2599;2605;2611;2616;2620;2625;2629
R=2634;2639;2644;2650;2656;2662;2668;2674;2680;2685;2690;2695;2701;2707;2713
R=2718;2724;2730;2737;2743;2749;2754;2759;2764;2769
A=12;48;84;120;156;192;228;264;300;336;372;408;444;480;516;552;588;624;660;696
A=732;768;804;840;876;912;948;984;1020;1056;1092;1128;1164;1200;1236;1272;1308
A=1344;1380;1416;1452;1488;1524;1560;1596;1632;1668;1704;1740;1776;1812;1848
A=1884;1920;1956;1992;2028;2064;2100;2136;2172;2208;2244;2280;2316;2352;2388
A=2424;2460;2496;2532;2568;2604;2640;2676;2712;2748;2784;2820;2856;2892;2928
A=2964;3000;3036;3072;3108;3144;3180;3216;3252;3288;3324;3360;3396;3432;3468
A=3504;3540;3576;3612;3648;3684;3720;3756;3792;3828;3864;3900;3936;3972;4008
A=4044;4080;4116;4152;4188;4224;4260;4296;4332;4368;4404;4440;4476;4512;4548
A=4584;4620;4656;4692;4728;4764;4800;4836;4872;4908;4944;4980;5016;5052;5088
A=5124;5160;5196;5232;5268;5304;5340;5376;5412;5448;5484;5520;5556;5592;5628
A=5664;5700;5736;5772;5808;5844;5880;5916;5952;5988;6024;6060;6096;6132;6168
A=6204;6240;6276;6312;6348;6384;6420;6456;6492;6528;6564;6600;6636;6672;6708
A=6744;6780;6816;6852;6888;6924;6960;6996;7032;7068;7104;7140;7176;7212;7248
A=7284;7320;7356;7392;7428;7464;7500;7536;7572;7608;7644;7680;7716;7752;7788
A=7824;7860;7896;7932;7968;8004;8040;8076;8112;8148;8184;8220;8256;8292;8328
A=8364;8400;8436;8472;8508;8544;8580;8616;8652;8688;8724;8760;8796;8832;8868
A=8904;8940;8976;9012;9048;9084;9120;9156;9192;9228;9264;9300;9336;9372;9408
A=9444;9480;9516;9552;9588;9624;9660;9696;9732;9768;9804;9840;9876;9912;9948
A=9984;10020;10056;10092;10128;10164;10200;10236;10272;10308;10344;10380;10416
A=10452;10488;10524;10560;10596;10632;10668;10704;10740;10776;10812;10848;10884
A=10920;10956;10992;11028;11064;11100;11136;11172;11208;11244;11280;11316;11352
A=11388;11424;11460;11496;11532;11568;11604;11640;11676;11712;11748;11784;11820
A=11856;11892;11928;11964;12000;12036;12072;12108;12144;12180;12216;12252;12288
A=12324;12360;12396;12432;12468;12504;12540;12576;12612;12648;12684;12720;12756
A=12792;12828;12864;12900;12936;12972;13008;13044;13080;13116;13152;13188;13224
A=13260;13296;13332;13368;13404;13440;13476;13512;13548;13584;13620;13656;13692
A=13728;13764;13800;13836;13872;13908;13944;13980;14016;14052;14088;14124;14160
A=14196;14232;14268;14304;14340;14376;14412;14448;14484;14520;14556;14592;14628
A=14664;14700;14736;14772;14808;14844;14880;14916;14952;14988;15024;15060;15096
A=15132;15168;15204;15240;15276;15312;15348;15384;15420;15456;15492;15528;15564
A=15600;15636;15672;15708;15744;15780;15816;15852;15888;15924;15960;15996;16032
A=16068;16104;16140;16176;16212;16248;16284;16320;16356;16392;16428;16464;16500
A=16536;16572;16608;16644;16680;16716;16752;16788;16824;16860;16896;16932;16968
A=17004;17040;17076;17112;17148;17184;17220;17256;17292;17328;17364;17400;17436
A=17472;17508;17544;17580;17616;17652;17688;17724;17760;17796;17832;17868;17904
A=17940;17976;18012;18048;18084;18120;18156;18192;18228;18264;18300;18336;18372
A=18408;18444;18480;18516;18552;18588;18624;18660;18696;18732;18768;18804;18840
A=18876;18912;18948;18984;19020;19056;19092;19128;19164;19200;19236;19272;19308
A=19344;19380;19416;19452;19488;19524;19560;19596;19632;19668;19704;19740;19776
A=19812;19848;19884;19920;19956;19992;20028;20064;20100;20136;20172;20208;20244
A=20280;20316;20352;20388;20424;20460;20496;20532;20568;20604;20640;20676;20712
A=20748;20784;20820;20856;20892;20928;20964;21000;21036;21072;21108;21144;21180
A=21216;21252;21288;21324;21360;21396;21432;21468;21504;21540;21576;21612;21648
A=21684;21720;21756;21792;21828;21864;21900;21936;21972;22008;22044;22080;22116
A=22152;22188;22224;22260;22296;22332;22368;22404;22440;22476;22512;22548;22584
A=22620;22656;22692;22728;22764;22800;22836;22872;22908;22944;22980;23016;23052
A=23088;23124;23160;23196;23232;23268;23304;23340;23376;23412;23448;23484;23520
A=23556;23592;23628;23664;23700;23736;23772;23808;23844;23880;23916;23952;23988
A=24024;24060;24096;24132;24168;24204;24240;24276;24312;24348;24384;24420;24456
A=24492;24528;24564;24600;24636;24672;24708;24744;24780;24816;24852;24888;24924
A=24960;24996;25032;25068;25104;25140;25176;25212;25248;25284;25320;25356;25392
A=25428;25464;25500;25536;25572;25608;25644;25680;25716;25752;25788;25824;25860
A=25896;25932;25968;26004;26040;26076;26112;26148;26184;26220;26256;26292;26328
A=26364;26400;26436;26472;26508;26544;26580;26616;26652;26688;26724;26760;26796
A=26832;26868;26904;26940;26976;27012;27048;27084;27120;27156;27192;27228;27264
A=27300;27336;27372;27408;27444;27480;27516;27552;27588;27624;27660;27696;27732
A=27768;27804;27840;27876;27912;27948;27984;28020;28056;28092;28128;28164;28200
A=28236;28272;28308;28344;28380;28416;28452;28488;28524;28560;28596;28632;28668
A=28704;28740;28776;28812;28848;28884;28920;28956;28992;29028;29064;29100;29136
A=29172;29208;29244;29280;29316;29352;29388;29424;29460;29496;29532;29568;29604
A=29640;29676;29712;29748;29784;29820;29856;29892;29928;29964;30000;30036;30072
A=30108;30144;30180;30216;30252;30288;30324;30360;30396;30432;30468;30504;30540
A=30576;30612;30648;30684;30720;30756;30792;30828;30864;30900;30936;30972;31008
A=31044;31080;31116;31152;31188;31224;31260;31296;31332;31368;31404;31440;31476
A=31512;31548;31584;31620;31656;31692;31728;31764;31800;31836;31872;31908;31944
A=31980;32016;32052;32088;32124;32160;32196;32232;32268;32304;32340;32376;32412
A=32448;32484;32520;32556;32592;32628;32664;32700;32736;32772;32808;32844;32880
A=32916;32952;32988;33024;33060;33096;33132;33168;33204;33240;33276;33312;33348
A=33384;33420;33456;33492;33528;33564;33600;33636;33672;33708;33744;33780;33816
A=33852;33888;33924;33960;33996;34032;34068;34104;34140;34176;34212;34248;34284
A=34320;34356;34392;34428;34464;34500;34536;34572;34608;34644;34680;34716;34752
A=34788;34824;34860;34896;34932;34968;35004;35040;35076;35112;35148;35184;35220
A=35256;35292;35328;35364;35400;35436;35472;35508;35544;35580;35616;35652;35688
A=35724;35760;35796;35832;35868;35904;35940;35976
ZFMT=0
TRCFMT=1;1000;U;L;F
R=2548;2555;2562;2569;2577;2584;2591;2598;2606;2613;2621;2629;2637;2644;2651
R=2658;2665;2671;2678;2685;2691;2698;2705;2711;2717;2723;2729;2735;2742;2748
R=2755;2762;2768;2775;2782;2789;2796;2802;2809;2815;2821;2826;2831;2835;2839
R=2844;2848;2853;2857;2861;2865;2869;2874;2878;2881;2885;2890;2894;2898;2901
R=2905;2908;2912;2915;2918;2920;2922;2923;2924;2925;2926;2926;2926;2927;2927
R=2927;2928;2928;2929;2929;2930;2931;2932;2932;2931;2930;2928;2925;2920;2914
R=2906;2897;2887;2876;2866;2856;2847;2836;2825;2814;2803;2792;2781;2770;2760
R=2749;2738;2728;2718;2707;2697;2688;2678;2669;2660;2651;2643;2635;2628;2620
R=2613;2606;2599;2590;2582;2573;2564;2554;2544;2533;2522;2511;2499;2488;2477
R=2466;2455;2444;2432;2421;2410;2399;2388;2377;2367;2357;2347;2338;2328;2319
R=2310;2301;2292;2283;2273;2264;2254;2245;2235;2225;2215;2206;2196;2186;2177
R=2167;2158;2149;2141;2132;2124;2116;2109;2101;2094;2087;2080;2073;2066;2060
R=2054;2049;2043;2037;2031;2026;2020;2014;2008;2002;1997;1991;1986;1981;1976
R=1970;1965;1960;1955;1951;1946;1941;1936;1931;1926;1922;1917;1913;1909;1904
R=1900;1896;1892;1888;1884;1881;1878;1875;1872;1869;1866;1864;1861;1858;1856
R=1853;1851;1848;1846;1844;1842;1840;1838;1836;1835;1833;1831;1829;1827;1826
R=1824;1822;1820;1818;1817;1815;1813;1811;1809;1808;1806;1804;1803;1802;1801
R=1800;1799;1798;1797;1795;1794;1794;1793;1793;1793;1792;1792;1792;1792;1792
R=1792;1792;1792;1793;1794;1794;1795;1795;1795;1796;1796;1796;1797;1797;1797
R=1797;1797;1798;1798;1798;1799;1799;1800;1800;1801;1802;1803;1804;1805;1806
R=1808;1809;1811;1812;1814;1815;1817;1819;1821;1823;1825;1827;1830;1832;1835
R=1837;1839;1841;1844;1847;1849;1852;1855;1858;1861;1864;1867;1871;1874;1878
R=1881;1886;1890;1894;1898;1902;1906;1911;1915;1919;1923;1927;1931;1936;1940
R=1945;1949;1954;1959;1964;1970;1975;1980;1986;1992;1998;2003;2009;2015;2021
R=2027;2033;2039;2045;2050;2056;2062;2068;2073;2079;2085;2092;2098;2104;2110
R=2116;2123;2129;2136;2143;2150;2157;2164;2171;2178;2186;2193;2201;2209;2217
R=2226;2234;2242;2251;2260;2269;2279;2288;2298;2308;2317;2326;2335;2344;2352
R=2361;2369;2377;2386;2394;2403;2412;2420;2429;2438;2446;2455;2464;2472;2481
R=2490;2500;2509;2519;2529;2539;2549;2559;2569;2580;2591;2603;2614;2626;2637
R=2648;2659;2669;2678;2686;2694;2702;2710;2718;2727;2735;2744;2753;2762;2771
R=2780;2789;2797;2805;2812;2819;2825;2830;2836;2841;2847;2852;2858;2863;2867
R=2871;2874;2876;2877;2878;2879;2879;2878;2876;2874;2871;2868;2865;2863;2861
R=2860;2859;2858;2857;2855;2853;2850;2846;2840;2834;2828;2821;2814;2808;2802
R=2796;2790;2785;2780;2775;2769;2764;2759;2754;2749;2743;2737;2730;2724;2718
R=2713;2707;2701;2695;2690;2685;2680;2674;2667;2661;2655;2650;2645;2639;2634
R=2629;2625;2620;2616;2611;2605;2599;2593;2587;2581;2575;2570;2564;2559;2554
R=2549;2545;2541;2538;2534;2530;2526;2522;2519;2515;2511;2506;2502;2497;2492
R=2487;2482;2477;2473;2468;2464;2459;2455;2450;2446;2442;2438;2434;2430;2426
R=2422;2417;2412;2406;2400;2394;2388;2383;2377;2371;2365;2360;2355;2349;2343
R=2337;2330;2323;2317;2310;2303;2297;2291;2286;2281;2275;2270;2265;2260;2255
R=2250;2245;2241;2236;2231;2227;2222;2219;2215;2211;2207;2204;2201;2199;2196
R=2192;2189;2185;2182;2178;2175;2172;2168;2165;2161;2158;2154;2150;2146;2142
R=2139;2135;2132;2129;2124;2120;2116;2112;2108;2104;2100;2097;2094;2091;2088
R=2086;2083;2081;2079;2077;2075;2072;2070;2068;2066;2064;2061;2058;2055;2052
R=2049;2045;2042;2038;2034;2030;2026;2022;2019;2015;2012;2009;2006;2002;1999
R=1996;1994;1991;1988;1985;1982;1979;1976;1973;1971;1968;1966;1963;1961;1958
R=1956;1954;1952;1950;1947;1945;1942;1940;1937;1934;1931;1928;1925;1922;1918
R=1915;1911;1907;1904;1901;1897;1894;1891;1888;1884;1881;1878;1875;1872;1868
R=1865;1862;1859;1856;1853;1850;1847;1844;1842;1839;1837;1835;1832;1830;1828
R=1826;1824;1823;1821;1820;1818;1817;1816;1815;1814;1813;1812;1811;1809;1808
R=1807;1806;1805;1804;1804;1803;1803;1802;1802;1802;1801;1801;1800;1800;1800
R=1800;1800;1800;1800;1800;1800;1800;1800;1800;1801;1801;1802;1803;1804;1804
R=1805;1806;1806;1806;1806;1806;1806;1805;1805;1805;1805;1805;1805;1805;1805
R=1805;1805;1805;1805;1806;1806;1807;1808;1809;1810;1811;1812;1814;1816;1817
R=1819;1821;1823;1825;1827;1829;1832;1834;1836;1838;1841;1843;1845;1847;1849
R=1851;1853;1855;1856;1858;1859;1860;1861;1862;1864;1865;1865;1866;1867;1868
R=1869;1870;1871;1872;1873;1874;1875;1876;1877;1879;1880;1882;1884;1886;1889
R=1891;1894;1896;1899;1902;1905;1908;1911;1914;1918;1921;1925;1929;1933;1937
R=1941;1945;1949;1952;1956;1959;1962;1966;1969;1972;1975;1978;1981;1984;1987
R=1990;1993;1996;1999;2002;2006;2009;2013;2016;2020;2023;2027;2031;2035;2039
R=2043;2047;2051;2054;2058;2061;2065;2069;2072;2076;2080;2084;2089;2094;2099
R=2104;2109;2114;2119;2124;2130;2135;2140;2145;2150;2155;2160;2164;2169;2173
R=2178;2182;2188;2193;2198;2204;2209;2214;2219;2224;2229;2234;2239;2243;2248
R=2253;2257;2262;2266;2270;2274;2279;2283;2289;2294;2300;2305;2310;2316;2322
R=2327;2333;2338;2344;2349;2355;2360;2365;2369;2374;2379;2384;2389;2394;2398
R=2403;2408;2413;2419;2424;2430;2435;2441;2447;2454;2460;2466;2473;2479;2485
R=2490;2496;2501;2505;2510;2516;2522;2528;2534;2541
A=24;60;96;132;168;204;240;276;312;348;384;420;456;492;528;564;600;636;672;708
A=744;780;816;852;888;924;960;996;1032;1068;1104;1140;1176;1212;1248;1284;1320
A=1356;1392;1428;1464;1500;1536;1572;1608;1644;1680;1716;1752;1788;1824;1860
A=1896;1932;1968;2004;2040;2076;2112;2148;2184;2220;2256;2292;2328;2364;2400
A=2436;2472;2508;2544;2580;2616;2652;2688;2724;2760;2796;2832;2868;2904;2940
A=2976;3012;3048;3084;3120;3156;3192;3228;3264;3300;3336;3372;3408;3444;3480
A=3516;3552;3588;3624;3660;3696;3732;3768;3804;3840;3876;3912;3948;3984;4020
A=4056;4092;4128;4164;4200;4236;4272;4308;4344;4380;4416;4452;4488;4524;4560
A=4596;4632;4668;4704;4740;4776;4812;4848;4884;4920;4956;4992;5028;5064;5100
A=5136;5172;5208;5244;5280;5316;5352;5388;5424;5460;5496;5532;5568;5604;5640
A=5676;5712;5748;5784;5820;5856;5892;5928;5964;6000;6036;6072;6108;6144;6180
A=6216;6252;6288;6324;6360;6396;6432;6468;6504;6540;6576;6612;6648;6684;6720
A=6756;6792;6828;6864;6900;6936;6972;7008;7044;7080;7116;7152;7188;7224;7260
A=7296;7332;7368;7404;7440;7476;7512;7548;7584;7620;7656;7692;7728;7764;7800
A=7836;7872;7908;7944;7980;8016;8052;8088;8124;8160;8196;8232;8268;8304;8340
A=8376;8412;8448;8484;8520;8556;8592;8628;8664;8700;8736;8772;8808;8844;8880
A=8916;8952;8988;9024;9060;9096;9132;9168;9204;9240;9276;9312;9348;9384;9420
A=9456;9492;9528;9564;9600;9636;9672;9708;9744;9780;9816;9852;9888;9924;9960
A=9996;10032;10068;10104;10140;10176;10212;10248;10284;10320;10356;10392;10428
A=10464;10500;10536;10572;10608;10644;10680;10716;10752;10788;10824;10860;10896
A=10932;10968;11004;11040;11076;11112;11148;11184;11220;11256;11292;11328;11364
A=11400;11436;11472;11508;11544;11580;11616;11652;11688;11724;11760;11796;11832
A=11868;11904;11940;11976;12012;12048;12084;12120;12156;12192;12228;12264;12300
A=12336;12372;12408;12444;12480;12516;12552;12588;12624;12660;12696;12732;12768
A=12804;12840;12876;12912;12948;12984;13020;13056;13092;13128;13164;13200;13236
A=13272;13308;13344;13380;13416;13452;13488;13524;13560;13596;13632;13668;13704
A=13740;13776;13812;13848;13884;13920;13956;13992;14028;14064;14100;14136;14172
A=14208;14244;14280;14316;14352;14388;14424;14460;14496;14532;14568;14604;14640
A=14676;14712;14748;14784;14820;14856;14892;14928;14964;15000;15036;15072;15108
A=15144;15180;15216;15252;15288;15324;15360;15396;15432;15468;15504;15540;15576
A=15612;15648;15684;15720;15756;15792;15828;15864;15900;15936;15972;16008;16044
A=16080;16116;16152;16188;16224;16260;16296;16332;16368;16404;16440;16476;16512
A=16548;16584;16620;16656;16692;16728;16764;16800;16836;16872;16908;16944;16980
A=17016;17052;17088;17124;17160;17196;17232;17268;17304;17340;17376;17412;17448
A=17484;17520;17556;17592;17628;17664;17700;17736;17772;17808;17844;17880;17916
A=17952;17988;18024;18060;18096;18132;18168;18204;18240;18276;18312;18348;18384
A=18420;18456;18492;18528;18564;18600;18636;18672;18708;18744;18780;18816;18852
A=18888;18924;18960;18996;19032;19068;19104;19140;19176;19212;19248;19284;19320
A=19356;19392;19428;19464;19500;19536;19572;19608;19644;19680;19716;19752;19788
A=19824;19860;19896;19932;19968;20004;20040;20076;20112;20148;20184;20220;20256
A=20292;20328;20364;20400;20436;20472;20508;20544;20580;20616;20652;20688;20724
A=20760;20796;20832;20868;20904;20940;20976;21012;21048;21084;21120;21156;21192
A=21228;21264;21300;21336;21372;21408;21444;21480;21516;21552;21588;21624;21660
A=21696;21732;21768;21804;21840;21876;21912;21948;21984;22020;22056;22092;22128
A=22164;22200;22236;22272;22308;22344;22380;22416;22452;22488;22524;22560;22596
A=22632;22668;22704;22740;22776;22812;22848;22884;22920;22956;22992;23028;23064
A=23100;23136;23172;23208;23244;23280;23316;23352;23388;23424;23460;23496;23532
A=23568;23604;23640;23676;23712;23748;23784;23820;23856;23892;23928;23964;24000
A=24036;24072;24108;24144;24180;24216;24252;24288;24324;24360;24396;24432;24468
A=24504;24540;24576;24612;24648;24684;24720;24756;24792;24828;24864;24900;24936
A=24972;25008;25044;25080;25116;25152;25188;25224;25260;25296;25332;25368;25404
A=25440;25476;25512;25548;25584;25620;25656;25692;25728;25764;25800;25836;25872
A=25908;25944;25980;26016;26052;26088;26124;26160;26196;26232;26268;26304;26340
A=26376;26412;26448;26484;26520;26556;26592;26628;26664;26700;26736;26772;26808
A=26844;26880;26916;26952;26988;27024;27060;27096;27132;27168;27204;27240;27276
A=27312;27348;27384;27420;27456;27492;27528;27564;27600;27636;27672;27708;27744
A=27780;27816;27852;27888;27924;27960;27996;28032;28068;28104;28140;28176;28212
A=28248;28284;28320;28356;28392;28428;28464;28500;28536;28572;28608;28644;28680
A=28716;28752;28788;28824;28860;28896;28932;28968;29004;29040;29076;29112;29148
A=29184;29220;29256;29292;29328;29364;29400;29436;29472;29508;29544;29580;29616
A=29652;29688;29724;29760;29796;29832;29868;29904;29940;29976;30012;30048;30084
A=30120;30156;30192;30228;30264;30300;30336;30372;30408;30444;30480;30516;30552
A=30588;30624;30660;30696;30732;30768;30804;30840;30876;30912;30948;30984;31020
A=31056;31092;31128;31164;31200;31236;31272;31308;31344;31380;31416;31452;31488
A=31524;31560;31596;31632;31668;31704;31740;31776;31812;31848;31884;31920;31956
A=31992;32028;32064;32100;32136;32172;32208;32244;32280;32316;32352;32388;32424
A=32460;32496;32532;32568;32604;32640;32676;32712;32748;32784;32820;32856;32892
A=32928;32964;33000;33036;33072;33108;33144;33180;33216;33252;33288;33324;33360
A=33396;33432;33468;33504;33540;33576;33612;33648;33684;33720;33756;33792;33828
A=33864;33900;33936;33972;34008;34044;34080;34116;34152;34188;34224;34260;34296
A=34332;34368;34404;34440;34476;34512;34548;34584;34620;34656;34692;34728;34764
A=34800;34836;34872;34908;34944;34980;35016;35052;35088;35124;35160;35196;35232
A=35268;35304;35340;35376;35412;35448;35484;35520;35556;35592;35628;35664;35700
A=35736;35772;35808;35844;35880;35916;35952;35988
ZFMT=0
`;
const STD_SHAPES = [
  { id:'rect',    n:'Rectangle', file:'1506.oma', raw:STD_OMA_RECT },
  { id:'round',   n:'Round',     file:'1287.oma', raw:STD_OMA_ROUND },
  { id:'aviator', n:'Aviator',   file:'1505.oma', raw:STD_OMA_AVIATOR },
  { id:'cateye',  n:'Cat eye',   file:'1504.oma', raw:STD_OMA_CATEYE }
];
let SHAPELIB = {};

/** shrink a 1000-point trace to 240 points — smooth on screen, small enough to store and ship */
function compactShape(oma, n) {
  n = n || 240;
  const idx = [], N = oma.points.R.length;
  for (let i = 0; i < n; i++) idx.push(Math.round(i * N / n) % N);
  const pick = arr => (arr && arr.length === N) ? idx.map(i => +arr[i].toFixed(2)) : [];
  return {
    job: oma.job, hbox: oma.hbox, vbox: oma.vbox, dbl: oma.dbl, ed: oma.ed,
    circ: oma.circ, edAxis: oma.edAxis, mirroredL: oma.mirroredL,
    points: { R: pick(oma.points.R), L: pick(oma.points.L) },
    angles: { R: pick(oma.angles.R), L: pick(oma.angles.L) }
  };
}
function saveLib(){ try{ localStorage.setItem(SHAPE_LIB_KEY, JSON.stringify(SHAPELIB)); }catch(e){} }
function loadLib(){ try{ SHAPELIB = JSON.parse(localStorage.getItem(SHAPE_LIB_KEY) || '{}'); }catch(e){ SHAPELIB = {}; } }

function autoLoadLib(){
  /* parsed straight from the STD_OMA_* constants above — no fetch, no CORS/file://
     restriction, works identically whether this page is opened from disk, hosted,
     or emailed as a single file. */
  if (Object.keys(SHAPELIB).length === STD_SHAPES.length) { buildShapePick(); return; }
  let got = 0;
  for (const s of STD_SHAPES) {
    if (SHAPELIB[s.id]) { got++; continue; }
    try {
      const parsed = parseOMA(s.raw);
      if (parsed && parsed.points.R.length) { SHAPELIB[s.id] = compactShape(parsed); got++; }
    } catch(e) { /* shouldn't happen — data is embedded, not fetched */ }
  }
  if (got) saveLib();
  buildShapePick();
}
function seedLibFromFiles(files){
  let n = 0;
  const pending = Array.from(files).length;
  Array.from(files).forEach(f => {
    const match = STD_SHAPES.find(s => f.name.toLowerCase() === s.file.toLowerCase()
      || f.name.replace(/\.\w+$/,'') === s.file.replace(/\.\w+$/,''));
    const rd = new FileReader();
    rd.onload = () => {
      const parsed = parseOMA(rd.result);
      if (match && parsed && parsed.points.R.length) { SHAPELIB[match.id] = compactShape(parsed); n++; }
      if (--files.__left === 0 || true) { saveLib(); buildShapePick(); }
      if (n) toast(n + ' standard shape' + (n>1?'s':'') + ' loaded and cached on this machine');
    };
    rd.readAsText(f);
  });
  if (!pending) toast('No files selected');
}

function shapeThumb(id, size){
  size = size || 46;
  const lib = SHAPELIB[id];
  if (!lib) return `<svg width="${size}" height="${size*0.7}" viewBox="0 0 100 70"><rect x="6" y="10" width="88" height="50" rx="14" fill="none" stroke="hsl(213 20% 78%)" stroke-width="3" stroke-dasharray="5 5"/></svg>`;
  const pts = scaleOutline(radiiToXY(lib.points.R, lib.angles.R), 92, 62);
  return `<svg width="${size}" height="${size*0.7}" viewBox="-50 -35 100 70" style="color:var(--fg)">
    <path d="${outlinePath(pts,false)}" fill="currentColor" fill-opacity=".06" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
}
function buildShapePick(){
  const box = $('#shapePick');
  const ready = STD_SHAPES.filter(s => SHAPELIB[s.id]).length;
  box.innerHTML = STD_SHAPES.map(s => `
    <div class="sp ${S.stdShape===s.id?'sel':''} " data-sid="${s.id}" tabindex="0" title="${s.file}">
      ${shapeThumb(s.id)}
      <div class="spn">${s.n}</div>
      <div class="spf">${SHAPELIB[s.id] ? '' : 'not loaded'}</div>
    </div>`).join('')
    + (S.stdShape ? `<div class="sp" data-sid="" tabindex="0" style="display:grid;place-items:center">
        <div style="font-size:19px;opacity:.4">✕</div><div class="spn">Clear</div></div>` : '');
  $$('#shapePick .sp').forEach(el => {
    el.addEventListener('click', () => pickStdShape(el.dataset.sid));
    el.addEventListener('keydown', e => { if(e.key===' '||e.key==='Enter'){ e.preventDefault(); el.click(); } });
  });
  $('#shapeHint').innerHTML = ready === STD_SHAPES.length
    ? 'Real traced outlines. The preview and the ED rescale live to the A, B and DBL you type.'
    : `<b>${ready} of ${STD_SHAPES.length} shapes loaded.</b> That shouldn't happen — the outlines are built into this page.
       <button class="linkbtn" id="seedLib" style="padding:4px 10px">Load from a file instead</button> as a fallback.`;
  const sb = $('#seedLib');
  if (sb) sb.addEventListener('click', () => $('#libInput').click());
}
function pickStdShape(id){
  if (!id) {
    S.stdShape=''; S.shape=null; buildShapePick(); render(); toast('Shape cleared');
    /* standard shape cleared — the trace dropzone is relevant again on remote edge */
    $('#traceBlock').classList.toggle('hide', S.scope!=='remote');
    return;
  }
  if (!SHAPELIB[id]) { toast('That shape isn\'t loaded yet — use Load shape library'); return; }
  if (S.file && !confirm('Replace the uploaded trace with the standard shape?')) return;
  S.stdShape = id; S.shape = SHAPELIB[id]; S.shapeSrc = 'standard';
  const meta = STD_SHAPES.find(s=>s.id===id);
  /* DBL is a real frame measurement — don't auto-fill it from a generic standard
     shape, wait for the optician to type/measure it. */
  buildShapePick(); render();
  /* a standard shape now stands in for the trace — collapse the upload
     dropzone so it doesn't look like a trace is still expected too. */
  $('#traceBlock').classList.add('hide');
  toast(meta.n + ' selected — resize it by typing A and B');
}

/** the shape currently in play, from either source */
function activeShape(){ return S.shape || null; }

/** live ED straight off the outline — this is what locks the ED field */
function liveMetrics(){
  const g = shapeGeometry(activeShape());
  return g ? g.metrics : null;
}

function updatePreview(){
  const sh = activeShape();
  const pb = $('#previewBlock');
  /* the trace/points verification is only meaningful when the lab is cutting to a
     trace (remote edge) — for uncut and full glaze the shape tile plus the auto
     ED above is all that's needed. */
  if (S.scope !== 'remote') { pb.classList.add('hide'); $('#shapePreview').innerHTML=''; return; }
  if (!sh) {
    if (S.file) {  /* a file is attached but yielded no usable outline — say so rather than show nothing */
      pb.classList.remove('hide');
      $('#shapePreview').innerHTML = `<div class="callout gold"><span class="ci">⚠</span><span>
        <b>${S.file.name}</b> attached, but no trace points could be read from it. The lab can still work from the
        box measures below — or re-export the trace and upload again.</span></div>`;
      return;
    }
    pb.classList.add('hide'); $('#shapePreview').innerHTML=''; return;
  }
  pb.classList.remove('hide');
  const g = shapeGeometry(sh);
  if (!g) { pb.classList.add('hide'); return; }
  const m = g.metrics;

  /* verified → collapse to a one-line strip so it stops eating the form */
  if (S.shapeOk && !S.shapeExpanded) {
    const thumb = S.shapeSrc==='standard' && S.stdShape ? shapeThumb(S.stdShape, 40) : miniThumb(g);
    $('#shapePreview').innerHTML = `
      <div class="shapemini">
        <div class="mini-art">${thumb}</div>
        <div style="min-width:0">
          <div class="mini-t">✓ Shape verified${sh.job?' — '+sh.job:''}</div>
          <div class="mini-d">A ${g.a.toFixed(2)} · B ${g.b.toFixed(2)} · ED ${m.ed.toFixed(2)} · DBL ${g.dbl.toFixed(2)} mm</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="shapeEdit" style="margin-left:auto">Change</button>
      </div>`;
    $('#shapeEdit').addEventListener('click',()=>{ S.shapeExpanded=true; updatePreview(); });
    return;
  }
  const src = S.shapeSrc === 'standard'
    ? (STD_SHAPES.find(s=>s.id===S.stdShape)||{}).n + ' — standard shape'
    : 'Traced file' + (sh.job ? ' · ' + sh.job : '');
  const single = sh.mirroredL;
  $('#shapePreview').innerHTML = `
    <div class="shapebox">
      <div class="shapebox-header" style="display:flex;align-items:center;gap:10px">
        <div style="min-width:0">
          <div class="sb-t">Shape verification${sh.job?' — '+sh.job:''}</div>
          <div class="sb-d">${src}${single?' · one side supplied, other side mirrored':' · both sides from the trace'}</div>
        </div>
        <span class="needbadge" style="margin-left:auto;background:var(--teal-soft);border-color:hsl(188 71% 36% / .3);color:var(--teal)">
          ${sh.points.R.length} points</span>
      </div>
      ${S.shapeSrc==='standard'?'':`<div class="pv-canvas ${g.ghost?'ghost':''}">${generateOMASVG(sh,{showDimensions:true})}</div>`}
      <div class="pv-stats">
        <div class="pv-stat"><div class="k">A width</div><div class="v">${g.a.toFixed(2)} mm</div></div>
        <div class="pv-stat"><div class="k">B height</div><div class="v">${g.b.toFixed(2)} mm</div></div>
        <div class="pv-stat"><div class="k">Effective dia</div><div class="v">${m.ed.toFixed(2)} mm</div></div>
        <div class="pv-stat"><div class="k">ED axis</div><div class="v">${m.edAxis.toFixed(1)}°</div></div>
        <div class="pv-stat"><div class="k">DBL gap</div><div class="v">${g.dbl.toFixed(2)} mm</div></div>
        <div class="pv-stat"><div class="k">Circumference</div><div class="v">${m.circ.toFixed(1)} mm</div></div>
      </div>
      <button type="button" class="confirmrow" id="shapeConfirm" aria-pressed="${S.shapeOk?'true':'false'}"
        ${frameBoxComplete()?'':'disabled'}>
        <span class="cri">✓</span><span>This is the correct shape for the frame in hand</span></button>
      <div class="pv-note">${frameBoxComplete()
        ? `Right lens shown left, as you face the patient. ED is measured from the boxing centre of the
           outline at the current A and B, so it is the field's source of truth and can't be typed over.
           Confirm it to collapse this panel.`
        : `Enter A, B, ED and DBL above before confirming — the shape is measured against that box, so
           confirming it first would verify the outline against numbers that aren't there yet.`}</div>
    </div>`;
  const cb = $('#shapeConfirm');
  if (cb) cb.addEventListener('click', () => {
    if (!frameBoxComplete()) return;
    S.shapeOk = !S.shapeOk;
    S.shapeExpanded = false;          /* verifying collapses it to the mini strip */
    render();
  });
}
/** Once the shape is verified the whole frame block folds to a one-line summary. */
function collapseFrame(){
  const done = !!activeShape() && S.shapeOk && !S.frameExpanded;
  const fs = $('#frameSummary'), fd = $('#frameDetail'), sb = $('#shapeBlock');
  fd.classList.toggle('hide', done);
  if (done) sb.classList.add('hide');
  fs.classList.toggle('hide', !done);
  if (!done) { fs.innerHTML=''; return; }
  const g = shapeGeometry(activeShape()), m = g.metrics;
  const mount = $('#mount').options[$('#mount').selectedIndex].text;
  fs.innerHTML = `
    <div class="summary">
      <div style="min-width:0">
        <div class="st">✓ ${$('#fname').value || 'Frame'} — ${mount}</div>
        <div class="sd">A ${g.a.toFixed(2)} · B ${g.b.toFixed(2)} · ED ${m.ed.toFixed(2)} @ ${m.edAxis.toFixed(1)}°
          · DBL ${g.dbl.toFixed(2)} mm</div>
      </div>
      <button class="btn btn-ghost btn-sm" id="frameEdit">Edit frame</button>
    </div>`;
  $('#frameEdit').addEventListener('click',()=>{
    S.frameExpanded=true; S.shapeExpanded=true; render();
    $('#frameDetail').scrollIntoView({behavior:'smooth',block:'center'});
  });
}

/** small outline chip used by the collapsed strip */
function miniThumb(g){
  const pts = scaleOutline(g.ptsR, 92, 62);
  return `<svg width="40" height="28" viewBox="-50 -35 100 70" style="color:var(--fg)">
    <path d="${outlinePath(pts,false)}" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>`;
}

/* ---------- order payload — one bundle for draft, cart and reorder ---------- */
function buildPayload(){
  const sh = activeShape(), g = sh ? shapeGeometry(sh) : null;
  const rows = {};
  ['od','os'].forEach(e => { if (activeEyes().includes(e)) rows[e] = readRow(e); });
  const c = CUR[S.cur], p = price();
  return {
    schema: 'cv.rxorder/1',
    orderNo: S.orderNo,
    rebuiltFrom: S.rebuiltFrom || null,
    createdAt: new Date().toISOString(),
    account: S.branch ? { id:S.branch.id, name:S.branch.name, currency:S.cur, pricesVisible:S.pricesOn } : null,
    reference: $('#ref').value || null,
    patient: { first:$('#pfirst').value, last:$('#plast').value },
    job: { scope:S.scope, eyes:S.eyes, vision:S.vision, purpose:S.purpose },
    frame: {
      name:$('#fname').value, mount:$('#mount').value, source:$('#fsource').value,
      a:parseNum($('#fa').value), b:parseNum($('#fb').value), ed:parseNum($('#fed').value),
      dbl:parseNum($('#fdbl').value)
    },
    shape: sh ? {
      source:S.shapeSrc, standardId:S.stdShape||null, file:S.file?S.file.name:null,
      job:sh.job||null, mirroredFrom: sh.mirroredL ? 'right' : null,
      pointCount: sh.points.R.length,
      nativeBox: { a:sh.hbox, b:sh.vbox, dbl:sh.dbl, ed:sh.ed },
      computed: { ed:+g.metrics.ed.toFixed(2), edAxis:+g.metrics.edAxis.toFixed(2), circ:+g.metrics.circ.toFixed(2) },
      confirmed: S.shapeOk,
      radii: { R: sh.points.R, L: sh.points.L },
      angles:{ R: sh.angles.R, L: sh.angles.L }
    } : null,
    /* `lens` stays the single job lens — for an unsplit order that is still
       the whole truth, and every downstream reader (persistPayload, the lab
       handoff, optilens-local) keeps working untouched. A split order adds
       `lensOs` and sets split:true; readers that don't know about the split
       still get the right-eye lens rather than nothing. */
    lens: { material:S.m, design:S.d, colour:S.c, diameter:effDiam(),
            corridor:$('#corridor').value, baseCurve:$('#basecurve').value },
    split: splitActive(),
    lensOs: splitActive() ? { material:S.m2, design:S.d2, colour:S.c2 } : null,
    rx: rows,
    treatments: Array.from(S.treat),
    tintConfig: tintSelected() ? { treatment:tintSelected(), ...S.tintCfg } : null,
    chemistrie: S.chemClips.length ? S.chemClips.map(c=>({ ...c })) : null,
    ownerReview: S.ownerReview,
    assistance: Array.from(S.assists),
    delivery: { service:$('#service').value, method:$('#delivery').value, notes:notesWithChemistrie($('#notes').value) },
    quote: S.pricesOn ? { currency:S.cur, symbol:c.sym, rate:c.rate,
      lines:p.lines.map(l=>({ label:l.n, detail:l.i, amount:+(l.v*c.rate).toFixed(2), ...(l.eye?{eye:l.eye}:{}), ...(l.lens?{lens:true}:{}) })),
      total:+(p.sub*c.rate).toFixed(2), lockedAt:new Date().toISOString() }
      : { currency:S.cur, hidden:true, reason:'pricing not enabled on account' }
  };
}
function payloadSize(p){ return (new Blob([JSON.stringify(p)]).size/1024).toFixed(1)+' KB'; }
function showPayload(){
  const p = buildPayload();
  const j = JSON.stringify(p, null, 2);
  $('#payloadBody').innerHTML = `<p class="hint" style="margin:0 0 10px">
      This is the bundle that travels with the order — saved as a draft, carried into the cart, and replayed from order history.
      Size <b>${payloadSize(p)}</b> including ${p.shape? p.shape.pointCount+' shape points per side':'no shape'}.</p>
    <pre style="font:11.5px/1.5 ui-monospace,Menlo,Consolas,monospace;background:hsl(43 25% 97%);border:1px solid var(--border-soft);border-radius:10px;padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-word">${j.replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]))}</pre>`;
  $('#payloadDrawer').classList.add('on');
}
function stashOrder(kind){
  const p = buildPayload();
  try{
    const hist = JSON.parse(localStorage.getItem('cv-rx-history')||'[]');
    hist.unshift({ kind, at:p.createdAt, label:(p.patient.first+' '+p.patient.last).trim()||'Unnamed', payload:p });
    localStorage.setItem('cv-rx-history', JSON.stringify(hist.slice(0,10)));
  }catch(e){}
  return p;
}
function restorePayload(p,{newOrderNumber=false}={}){
  if(!p) return;
  S.scope=p.job.scope; S.eyes=p.job.eyes; S.vision=p.job.vision; S.purpose=p.job.purpose;
  ['scopeSeg:scope','eyeSeg:eyes','visionSeg:vision','purposeSeg:purpose'].forEach(pair=>{
    const [id,key]=pair.split(':');
    $$('#'+id+' button').forEach(b=>b.setAttribute('aria-pressed', b.dataset[key]===S[key]));
  });
  $('#ref').value=p.reference||''; $('#pfirst').value=p.patient.first||''; $('#plast').value=p.patient.last||'';
  $('#fname').value=p.frame.name||''; $('#mount').value=p.frame.mount||'plastic';
  ['a','b','ed','dbl'].forEach((k,i)=>{
    const el=$(['#fa','#fb','#fed','#fdbl'][i]);
    el.value = p.frame[k]!=null ? p.frame[k] : '';
  });
  if(p.shape){
    S.shape={ job:p.shape.job, hbox:p.shape.nativeBox.a, vbox:p.shape.nativeBox.b, dbl:p.shape.nativeBox.dbl,
      ed:p.shape.nativeBox.ed, mirroredL:!!p.shape.mirroredFrom, edAxis:{R:null,L:null},
      points:p.shape.radii, angles:p.shape.angles };
    S.shapeSrc=p.shape.source; S.stdShape=p.shape.standardId||''; S.shapeOk=!!p.shape.confirmed;
  } else { S.shape=null; S.stdShape=''; }
  S.m=p.lens.material; S.d=p.lens.design; S.c=p.lens.colour;
  /* Older payloads have neither key; absent means unsplit, which is correct. */
  S.split=!!p.split&&!!p.lensOs;
  S.m2=p.lensOs?.material||''; S.d2=p.lensOs?.design||''; S.c2=p.lensOs?.colour||'';
  fillLensSelects();
  S.treat=new Set(p.treatments||[]); S.assists=new Set(p.assistance||[]);
  S.chemClips=Array.isArray(p.chemistrie) ? p.chemistrie.map(c=>({
    ...c,
    id:c.id||'clip'+(++chemClipSeq),
    colour:c.colour||'',
    mirror:c.mirror==='none'?'':(c.mirror||''),
    polarised:c.type==='sun'?true:!!c.polarised,
  })) : [];
  Object.entries(p.rx||{}).forEach(([e,r])=>{
    rowEls(e).forEach(i=>{ const v=r[i.dataset.f]; i.value=(v===null||v===undefined)?'':v; });
  });
  $('#service').value=p.delivery.service||'std'; $('#notes').value=stripChemNotes(p.delivery.notes||'');
  /* A saved delivery method is an explicit choice, so it must survive the
     account's export default rather than be overwritten on restore. */
  if(p.delivery.method){
    const dsel=$('#delivery'), opt=Array.from(dsel.options).find(o=>o.text===p.delivery.method);
    if(opt){ dsel.value=opt.value||opt.text; S.deliveryTouched=true; }
  }
  /* The coatings confirmation is not restored: a resumed order should be
     looked at again before it folds shut. */
  S.treatConfirmed=false;
  S.revealAll=true;
  /* Continuing a saved/in-progress order keeps its numeric PO identifier and
     its database draft. Rebuilding history is the one explicit new-order
     path, so it receives a fresh number and preserves the source reference. */
  const savedOrderNo=String(p.orderNo||'').trim();
  if(newOrderNumber||!/^\d+$/.test(savedOrderNo)){
    S.rebuiltFrom=savedOrderNo||null;
    newOrderNo();
  } else {
    S.rebuiltFrom=null;
    S.orderNo=savedOrderNo;
    const orderEl=$('#ordNo');
    if(orderEl) orderEl.innerHTML='<span>Order</span> '+S.orderNo;
  }
  $('#scopeSeg button[data-scope="'+S.scope+'"]').click();
  buildShapePick(); buildPopular(); buildTreatList(); render();
}

/* ---------- file + shape ---------- */
$('#drop').addEventListener('click',()=>$('#fileInput').click());
$('#drop').addEventListener('dragover',e=>{e.preventDefault();$('#drop').classList.add('hot');});
$('#drop').addEventListener('dragleave',()=>$('#drop').classList.remove('hot'));
$('#drop').addEventListener('drop',e=>{e.preventDefault();$('#drop').classList.remove('hot');takeFile(e.dataTransfer.files[0]);});
$('#fileInput').addEventListener('change',e=>takeFile(e.target.files[0]));

/**
 * Handles trace file reading, OMA parsing, field auto-populating, and preview rendering.
 * 
 * @param {File} f - Uploaded trace file
 */
function takeFile(f) {
  if (!f) return;
  if (!/\.(oma|tr|vca)$/i.test(f.name)) { toast('Trace files only — .oma, .tr or .vca'); return; }

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const omaData = parseOMA(text);

    S.file = {
      name: f.name,
      size: f.size,
      rawText: text,
      omaData: omaData
    };
    S.shapeOk = false;

    if (omaData) {
      if (omaData.hbox) { $('#fa').value = omaData.hbox.toFixed(2); S.edTouched = false; }
      if (omaData.vbox) { $('#fb').value = omaData.vbox.toFixed(2); S.edTouched = false; }
      if (omaData.ed) { $('#fed').value = omaData.ed.toFixed(2); S.edTouched = true; }
      /* DBL waits for the optician to enter it — not auto-filled from the trace. */
      if (omaData.job) { $('#fname').value = omaData.job; }

    }
    /* set the shape BEFORE syncED/render so the preview and the locked ED both see it */
    if (omaData && omaData.points && omaData.points.R.length) {
      S.shape = omaData; S.shapeSrc = 'trace'; S.stdShape = ''; S.shapeOk = false; S.edTouched = false;
    }
    syncED(); fillDiam();

    $('#drop').classList.add('hide');
    $('#fileList').innerHTML = `<div class="filerow"><div class="fi">${f.name.split('.').pop().toUpperCase()}</div>
      <div><div class="fn">${f.name}</div><div class="fs">${(f.size / 1024).toFixed(1)} KB · ${omaData ? 'OMA points parsed' : 'trace attached'}</div></div>
      <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
        <button type="button" class="btn btn-ghost btn-sm" id="changeFile">Upload new</button>
        <button type="button" class="btn btn-ghost btn-sm" id="rmFile" style="color:var(--danger)">Remove trace</button>
      </div></div>`;

    $('#rmFile').addEventListener('click', () => {
      S.file = null; S.shapeOk = false; $('#fileList').innerHTML = ''; $('#shapePreview').innerHTML = ''; $('#fileInput').value = '';
      $('#drop').classList.remove('hide'); render(); toast('Trace removed');
    });
    $('#changeFile').addEventListener('click', () => { $('#fileInput').click(); });

    render(); updatePreview();
    if (!S.shape) toast('File attached, but no trace points could be read from it');
    else toast(`Trace loaded: A ${$('#fa').value}, B ${$('#fb').value}, ED ${$('#fed').value}, DBL ${$('#fdbl').value}`);
  };
  reader.readAsText(f);
}

/**
 * Renders inline tiny shape thumbnail & sets up desktop hover enlargement popover.
 * 
 * @param {Object} omaData - Parsed OMA object
 */
function showShape(omaData) {
  if (!omaData) {
    $('#shapePreview').innerHTML = '';
    return;
  }

  const a = omaData.hbox || parseNum($('#fa').value) || 52.68;
  const b = omaData.vbox || parseNum($('#fb').value) || 43.59;
  const ed = omaData.ed || parseNum($('#fed').value) || 62.24;
  const dbl = omaData.dbl || parseNum($('#fdbl').value) || 17.37;
  const name = omaData.job || $('#fname').value || '1471';

  const tinySvg = generateOMASVG(omaData, { showDimensions: true });
  const popSvg = generateOMASVG(omaData, { showDimensions: true });

  $('#shapePreview').innerHTML = `
    <div class="shapebox">
      <div class="shapebox-header">
        <div style="min-width:0">
          <div class="sb-t">Traced Frame Shape: ${name}</div>
          <div class="sb-d">A ${a.toFixed(2)} mm · B ${b.toFixed(2)} mm · ED ${ed.toFixed(2)} mm · DBL ${dbl.toFixed(2)} mm</div>
        </div>
        <span class="needbadge" style="background:var(--teal-soft);border-color:hsl(188 71% 36% / .3);color:var(--teal)">✓ OMA Vector Shape Loaded</span>
      </div>
      <div class="shapebox-body">
        <div class="tiny-preview-wrap" id="tinyPreview" title="Hover to enlarge shape preview">
          ${tinySvg}
          <div class="tiny-hint">🔍 Hover to enlarge</div>
        </div>
        <div style="flex:1;min-width:200px">
          <label class="confirmrow"><input type="checkbox" id="shapeConfirm" ${S.shapeOk ? 'checked' : ''}><span>This trace matches the physical frame</span></label>
          <div class="hint" style="margin-top:6px">Shape generated directly from OMA polar radii vectors. Desktop users can hover thumbnail to magnify.</div>
        </div>
      </div>
    </div>
  `;

  let pop = $('#omaHoverPop');
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'omaHoverPop';
    pop.className = 'oma-popover';
    rootEl.appendChild(pop);
  }

  pop.innerHTML = `
    <div class="oma-pop-head">
      <div>
        <h4>Traced Shape Verification — ${name}</h4>
        <span>Live OMA Polar Vector Projection</span>
      </div>
      <span class="tag" style="background:var(--teal-soft);color:var(--teal);font-weight:700">${(omaData.points && omaData.points.R.length) || 800} Points</span>
    </div>
    <div style="background:#fff;border-radius:10px;overflow:hidden;border:1px solid var(--border-soft);padding:8px">
      ${popSvg}
    </div>
    <div class="oma-pop-stats">
      <div><span>A Width</span><b>${a.toFixed(2)} mm</b></div>
      <div><span>B Height</span><b>${b.toFixed(2)} mm</b></div>
      <div><span>Effective Dia (ED)</span><b>${ed.toFixed(2)} mm</b></div>
      <div><span>DBL Gap</span><b>${dbl.toFixed(2)} mm</b></div>
    </div>
  `;

  const tiny = $('#tinyPreview');
  if (tiny) {
    tiny.addEventListener('mouseenter', (e) => {
      pop.classList.add('on');
      positionPop(e);
    });
    tiny.addEventListener('mousemove', (e) => {
      positionPop(e);
    });
    tiny.addEventListener('mouseleave', () => {
      pop.classList.remove('on');
    });
  }

  function positionPop(e) {
    const popW = pop.offsetWidth || 520;
    const popH = pop.offsetHeight || 380;
    let x = e.clientX + 20;
    let y = e.clientY;

    if (x + popW > window.innerWidth - 15) {
      x = e.clientX - popW - 20;
    }
    if (y + popH / 2 > window.innerHeight - 15) {
      y = window.innerHeight - popH / 2 - 15;
    }
    if (y - popH / 2 < 15) {
      y = popH / 2 + 15;
    }
    pop.style.left = Math.max(10, x) + 'px';
    pop.style.top = Math.max(10, y) + 'px';
  }

  $('#shapeConfirm').addEventListener('change', e => {
    S.shapeOk = e.target.checked;
    render();
  });
}

/* ---------- branch ---------- */
let branchQuery='';
function renderBranches(){
  const q=branchQuery.trim().toLowerCase();
  const list=q?BRANCHES.filter(b=>(b.name+' '+b.info+' '+(b.code||'')).toLowerCase().includes(q)):BRANCHES;
  $('#branchList').innerHTML=list.length?list.map(b=>`<button class="branch ${S.branch&&S.branch.id===b.id?'cur':''}" data-b="${b.id}">
    <span class="bi">${b.code}</span><span><span class="bn">${b.name}</span><span class="bd">${b.info}</span></span>
    ${S.branch&&S.branch.id===b.id?'<span class="bt">Current</span>':''}</button>`).join('')
    :'<p class="chipnone" style="padding:22px 4px;text-align:center">No accounts match your search.</p>';
  $$('#branchList .branch').forEach(el=>el.addEventListener('click',()=>{
    const b=BRANCHES.find(x=>x.id===el.dataset.b), changing=S.branch&&S.branch.id!==b.id;
    if(changing&&!confirm('Move this order to '+b.name+'?\n\nPricing, currency and delivery may differ.')) return;
    S.branch=b; if(ADAPTER.onBranchChange) ADAPTER.onBranchChange(b.id); $('#branchName').textContent=b.name.replace('Bridgetown Optical — ','');
    applyDeliveryDefault();
    /* currency and price visibility follow the account */
    S.cur=b.cur||'USD'; S.pricesOn=b.prices!==false;
    $('#curSim').value=S.cur; $('#pricesOn').checked=S.pricesOn;
    $('#branchScrim').classList.remove('on');
    if(changing) toast('Order now placed against '+b.name+(S.pricesOn?'':' — pricing not enabled on that account'));
    render();
  }));
}
/* An overseas account cannot use the weekly courier run — that is the Barbados
   road round. Default them to the forwarder instead of making every export
   order correct the same wrong answer, but only until the dispenser picks for
   themselves, after which their choice stands even if the account changes. */
function applyDeliveryDefault(){
  const sel=$('#delivery'); if(!sel||S.deliveryTouched) return;
  const wanted=branchIsExport()?EXPORT_DELIVERY:'Weekly courier run';
  const opt=Array.from(sel.options).find(o=>o.text===wanted);
  if(opt) sel.value=opt.value||opt.text;
  const hint=$('#deliveryHint');
  if(hint){
    const on=branchIsExport();
    hint.classList.toggle('hide',!on);
    if(on) hint.textContent='This account ships outside Barbados, so export is the default.';
  }
}
function openBranchPicker(){
  branchQuery=''; const s=$('#branchSearch'); if(s) s.value='';
  renderBranches();
  $('#branchScrim').classList.add('on');
  if(s) setTimeout(()=>s.focus(),50);
}
$('#branchChip').addEventListener('click',openBranchPicker);
$('#reopenBranch').addEventListener('click',openBranchPicker);
$('#branchSearch').addEventListener('input',e=>{ branchQuery=e.target.value; renderBranches(); });

/* ---------- toast ---------- */
function toast(m,opts){
  opts=opts||{};
  const t=$('#toast'), actions=$('#toastActions');
  $('#toastMsg').textContent=m;
  if(actions){
    actions.innerHTML='';
    actions.style.display=opts.action?'inline-flex':'none';
    if(opts.action){
      const b=document.createElement('button');
      b.type='button'; b.className='toast-action'; b.textContent=opts.action.label;
      b.addEventListener('click',()=>{ clearTimeout(toast._t); t.classList.remove('on'); opts.action.onClick(); });
      actions.appendChild(b);
    }
  }
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t=setTimeout(()=>t.classList.remove('on'),opts.duration||2800);
}
window.__toast=toast;

/* ---------- prefill / draft / demo ---------- */
function applyLens(m,d,c){ S.m=m; S.d=d; S.c=c; fillLensSelects(); }
$('#btnPrefill').addEventListener('click',()=>{
  S.vision='mf'; $$('#visionSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.vision==='mf'));
  applyLens('1.60','pg-enh','ph-grey');
  S.prefilled=true; S.revealAll=true;
  const chip=$('#prefillChip'); chip.classList.remove('hide');
  chip.textContent='↩ Prefilled from your pricelist · '+(namedLens('a')||'lens');
  render(); toast('Lens prefilled from the price you clicked — everything stays swappable');
});
$('#btnDraft').addEventListener('click',()=>{
  fillDemo(true); S.fromDraft=true; S.revealAll=true;
  $('#draftBanner').classList.remove('hide');
  window.scrollTo({top:0,behavior:'smooth'});
  render(); toast('Draft restored into the Rx order form');
});
$('#btnTraceDemo').addEventListener('click',()=>{
  const omaData = parseOMA(SAMPLE_OMA_1471);
  S.file = {
    name: '1471.oma',
    size: 8681,
    rawText: SAMPLE_OMA_1471,
    omaData: omaData
  };
  S.scope = 'remote';
  $$('#scopeSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.scope==='remote'));
  $('#traceBlock').classList.remove('hide');
  $('#fsourceField').classList.add('hide');

  if (omaData) {
    if (omaData.hbox) $('#fa').value = omaData.hbox.toFixed(2);
    if (omaData.vbox) $('#fb').value = omaData.vbox.toFixed(2);
    if (omaData.ed) $('#fed').value = omaData.ed.toFixed(2);
    /* DBL waits for the optician to enter it — not auto-filled from the trace. */
    if (omaData.job) $('#fname').value = omaData.job;
  }

  $('#drop').classList.add('hide');
  $('#fileList').innerHTML = `<div class="filerow"><div class="fi">OMA</div>
    <div><div class="fn">1471.oma</div><div class="fs">8.7 KB · sample OMA trace loaded</div></div>
    <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
      <button type="button" class="btn btn-ghost btn-sm" id="changeFile">Upload new</button>
      <button type="button" class="btn btn-ghost btn-sm" id="rmFile" style="color:var(--danger)">Remove trace</button>
    </div></div>`;

  $('#rmFile').addEventListener('click',()=>{
    S.file=null; S.shapeOk=false; $('#fileList').innerHTML=''; $('#shapePreview').innerHTML=''; $('#fileInput').value='';
    $('#drop').classList.remove('hide'); render(); toast('Trace removed');
  });
  $('#changeFile').addEventListener('click',()=>{ $('#fileInput').click(); });

  S.revealAll = true;
  syncED();
  fillDiam();
  showShape(omaData);
  render();
  toast('Loaded 1471.oma trace sample — shape & dimensions auto-populated');
});
$('#btnClearAll').addEventListener('click',()=>{ if(confirm('Clear the whole form?')) { clearAll(); toast('Form cleared'); } });
$('#discardDraft').addEventListener('click',()=>{ if(confirm('Discard this draft and clear the form?')){ clearAll(); toast('Draft discarded'); } });
function fillDemo(quiet){
  S.vision='mf'; $$('#visionSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.vision==='mf'));
  applyLens('1.60','pg-enh','clear');
  $('#pfirst').value='Marcus'; $('#plast').value='Grant'; $('#ref').value='JOB-2291';
  $('#fname').value='Ray-Ban RB5154'; $('#mount').value='plastic'; $('#fa').value='52'; $('#fb').value='38'; $('#fdbl').value='18';
  S.edTouched=false;
  const v={od:{sph:'-325',cyl:'1-',axis:'175',add:'2',prism:'',base:'',pd:'64',npd:'',ht:'22'},
           os:{sph:'-275',cyl:'-075',axis:'185',add:'2',prism:'',base:'',pd:'',npd:'',ht:'22'}};
  ['od','os'].forEach(e=>rowEls(e).forEach(i=>{ if(i.dataset.f in v[e]) i.value=v[e][i.dataset.f]; }));
  S.revealAll=true;
  $$('.rxtable input').forEach(i=>{ if(i.value) normalise(i); });
  render();
  if(!quiet) toast('Demo filled — watch -325, 1-, 185 and 64 normalise');
}
$('#btnDemo').addEventListener('click',()=>fillDemo(false));

/* ---------- draft / print / submit ---------- */
/* Autosave: any settled change (1.5s of no further edits) quietly persists a
   draft, so a person who never touches the Save Draft button still doesn't
   lose work. Silent — no toast, no clearing the form — that's only for the
   explicit button below. Re-checks orderIsEmpty() at fire time (not schedule
   time) so a save queued right before a clear doesn't resurrect it. Builds
   the payload directly rather than via stashOrder() — that also pushes into
   the local "reorder from history" list, and an entry per idle pause would
   drown out the handful of saves that list is actually for. */
let autosaveTimer=null, autosaveBusy=false;
function scheduleAutosave(){
  clearTimeout(autosaveTimer);
  autosaveTimer=setTimeout(()=>{
    if(autosaveBusy||orderIsEmpty()) return;
    autosaveBusy=true;
    Promise.resolve(ADAPTER.onDraftSaved?.(buildPayload())).catch(()=>{}).finally(()=>{autosaveBusy=false;});
  },1500);
}
['#saveDraft','#saveDraft2','#saveDraft3'].forEach(s=>$(s).addEventListener('click',()=>{
  if(shouldOfferGoToDrafts()){ ADAPTER.onGoToDrafts?.(); return; }
  const n=S.assists.size, p=stashOrder('draft');
  Promise.resolve(ADAPTER.onDraftSaved?.(p)).then(()=>{
    /* The form is about to be cleared for a new order — give the person a
       beat (and a one-click way back) in case that wasn't what they wanted. */
    toast('Draft saved'+(n?` · ${n} flagged for assistance`:''),{
      duration:4800,
      action:{label:'Resume draft',onClick:()=>{ restorePayload(p); toast('Draft resumed'); }}
    });
    clearAll();
  }).catch(error=>{
    toast('Draft could not be saved to your account'+(error?.message?`: ${error.message}`:''));
  });
}));

$('#printBtn').addEventListener('click',()=>{
  const c=CUR[S.cur], {sub}=price();
  const rows=activeEyes().map(e=>({e,r:readRow(e)}));
  const tr=Array.from(S.treat).map(id=>(TREAT.find(x=>x.id===id)||{}).n).filter(Boolean);
  const f=v=>(v===null||v===undefined||v==='')?'—':v;
  const htLbl=S.vision!=='mf'?'OC Ht':(isProg()?'Fitting Ht':'Segment Ht');
  const rx=rows.map(({e,r})=>`<tr><th>${e.toUpperCase()}</th>
    <td>${r.sph!==null?sgn(r.sph):'—'}</td><td>${r.cyl!==null?sgn(r.cyl):'—'}</td><td>${f(r.axis)}</td>
    ${needsAdd()?`<td>${r.add!==null?sgn(r.add):'—'}</td>`:''}
    <td>${r.pd!==null?r.pd.toFixed(1):'—'}</td>
    ${needsNearPD()?`<td>${r.npd!==null?r.npd.toFixed(1):'—'}</td>`:''}
    <td>${r.ht!==null?r.ht.toFixed(1):'—'}</td>
    <td>${r.prism?r.prism.toFixed(2):'—'}</td><td>${f(r.base)}</td></tr>`).join('');
  const plusCylOn=$('#plusCylOn').checked;
  const pcRows=plusCylOn?activeEyes().map(e=>{
    const sph=$('#pc-'+e+'-sph').value||'—', cyl=$('#pc-'+e+'-cyl').value||'—', axis=$('#pc-'+e+'-axis').value||'—';
    return `<tr><th>${e.toUpperCase()}</th><td>${sph}</td><td>${cyl}</td><td>${axis}</td></tr>`;
  }).join(''):'';
  const lensNm=splitActive()
    ? `OD ${namedLens('a')||'—'} / OS ${namedLens('b')||'—'}`
    : (namedLens('a')||'—');
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rx Order — ${$('#pfirst').value} ${$('#plast').value}</title>
  <style>body{font:13px/1.55 ui-sans-serif,system-ui,Segoe UI,Arial;color:#0B1E35;margin:34px;max-width:760px}
  .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0B1E35;padding-bottom:12px;margin-bottom:18px}
  .hd h1{margin:0;font-size:19px}.hd .s{font-size:12px;color:#557;margin-top:3px}
  .biz{text-align:right;font-size:12px;color:#557}.biz b{display:block;font-size:14px;color:#0B1E35}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#557;margin:20px 0 7px;border-bottom:1px solid #ddd;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  th,td{border:1px solid #ccd;padding:6px 8px;text-align:center}th{background:#f3f1ec;font-weight:650}
  tbody th{text-align:left;width:52px}
  .kv{display:grid;grid-template-columns:130px 1fr;gap:3px 12px;font-size:12.5px}.kv span{color:#557}
  .tot{margin-top:16px;padding:11px 14px;background:#f3f1ec;border-radius:8px;display:flex;justify-content:space-between;font-size:15px;font-weight:650}
  .sig{margin-top:34px;display:flex;gap:40px}.sig div{flex:1;border-top:1px solid #99a;padding-top:6px;font-size:11px;color:#557}
  .ft{margin-top:26px;font-size:10.5px;color:#889;text-align:center}
  @media print{body{margin:14mm}}</style></head><body>
  <div class="hd"><div><h1>Rx Order Sheet</h1><div class="s"><b style="font-size:14px">No. ${S.orderNo}</b> · ${$('#ref').value?'Ref '+$('#ref').value+' · ':''}${new Date().toLocaleDateString()} · ${S.scope==='uncut'?'Uncut Rx lenses':S.scope==='remote'?'Remote edge':'Full glaze'}</div></div>
  <div class="biz"><b>${S.branch?S.branch.name:'—'}</b>${S.branch?S.branch.info:''}<br>Classic Visions Rx Laboratory</div></div>
  <h2>Patient</h2><div class="kv"><span>Name</span><div>${$('#pfirst').value} ${$('#plast').value}</div>
  <span>Eyes supplied</span><div>${S.eyes==='pair'?'Pair (OD + OS)':S.eyes==='od'?'Right lens only':'Left lens only'}</div></div>
  <h2>Prescription</h2><table><thead><tr><th></th><th>Sphere</th><th>Cyl</th><th>Axis</th>${needsAdd()?'<th>Add</th>':''}<th>Dist PD</th>${needsNearPD()?'<th>Near PD</th>':''}<th>${htLbl}</th><th>Prism</th><th>Base</th></tr></thead><tbody>${rx}</tbody></table>
  ${pcRows?`<div style="margin-top:8px;font-size:11px;color:#557">As prescribed — plus cylinder form; converted to minus cylinder above for production.</div>
  <table style="margin-top:4px"><thead><tr><th></th><th>Sphere</th><th>Cyl</th><th>Axis</th></tr></thead><tbody>${pcRows}</tbody></table>`:''}
  ${(function(){
    const sh=activeShape(); if(!sh) return '';
    const g=shapeGeometry(sh); if(!g) return '';
    const m=g.metrics;
    const src=S.shapeSrc==='standard'?((STD_SHAPES.find(s=>s.id===S.stdShape)||{}).n+' — standard shape')
      :('Traced'+(sh.job?' · '+sh.job:''));
    return `<h2>Frame shape</h2>
      <div style="border:1px solid #ccd;border-radius:6px;padding:8px;background:#fbfaf7;max-width:430px">
        ${generateOMASVG(sh,{showDimensions:true})}
      </div>
      <div class="kv" style="margin-top:8px">
        <span>Shape source</span><div>${src} · ${sh.points.R.length} points${sh.mirroredL?' · second side mirrored':''}</div>
        <span>Measured</span><div>A ${g.a.toFixed(2)} · B ${g.b.toFixed(2)} · ED ${m.ed.toFixed(2)} @ ${m.edAxis.toFixed(1)}° · DBL ${g.dbl.toFixed(2)} · Circ ${m.circ.toFixed(1)} mm</div>
        <span>Verified</span><div>${S.shapeOk?'Confirmed by the dispenser':'NOT confirmed'}</div>
      </div>`;
  })()}
  <h2>Lens</h2><div class="kv"><span>Lens</span><div>${lensNm}</div>
  <span>Blank</span><div>${effDiam()} mm</div>
  <span>Treatments</span><div>${tr.length?tr.join(', '):'None'}</div>
  <span>Frame</span><div>${$('#fname').value||'—'} · A ${$('#fa').value||'—'} B ${$('#fb').value||'—'} ED ${$('#fed').value||'—'} DBL ${$('#fdbl').value||'—'} · ${$('#mount').options[$('#mount').selectedIndex].text}</div>
  <span>Service</span><div>${$('#service').options[$('#service').selectedIndex].text} · ${$('#delivery').value}</div>
  ${(function(){ const notes=notesWithChemistrie($('#notes').value); return notes?`<span>Notes</span><div>${notes.replace(/</g,'&lt;')}</div>`:''; })()}</div>
  ${S.pricesOn?`<div class="tot"><span>Quoted price</span><span>${c.sym} ${money(sub*c.rate)}</span></div>`
    :`<div class="tot" style="font-size:12.5px;font-weight:500;color:#557"><span>Pricing not enabled on this account</span><span>Confirmed before production</span></div>`}
  ${S.ownerReview?'<p style="font-size:11.5px;color:#8a6a20;margin-top:10px">⚑ Contains specialty work pending owner review.</p>':''}
  <div class="sig"><div>Dispenser signature</div><div>Date received at lab</div></div>
  <div class="ft">Classic Visions Rx Laboratory · Barbados · prototype document</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},250);}<\/script></body></html>`;
  const w=window.open('','_blank');
  if(!w){ toast('Allow pop-ups to print the order sheet'); return; }
  w.document.write(html); w.document.close();
});

/* ---------- instant submission (credit-approved accounts) ----------
   A credit-approved account has nothing to settle at checkout, so the cart is
   pure ceremony for them: the Rx form already knows the job, the delivery
   method and the account to bill. ADAPTER.canSubmitDirect is the surface's
   answer to "is this account credit-approved" — the privilege is re-checked
   server-side in place_rx_order_direct(), so a stale or tampered client
   cannot grant itself the shortcut. */
const canSubmitDirect=()=>!!ADAPTER.canSubmitDirect&&!!ADAPTER.onSubmittedDirect;
function syncTreatConfirm(){
  const b=$('#treatConfirm'); if(!b) return;
  b.setAttribute('aria-pressed', S.treatConfirmed?'true':'false');
  const label=$('#treatConfirmLabel');
  if(label) label.textContent=S.treat.size||S.chemClips.length
    ? 'Done — these are all the coatings for this job'
    : 'Done — no coatings needed on this job';
}
/* The lead time the customer is quoted has to follow what they actually chose. */
function syncServiceLead(){
  const sel=$('#service'); if(!sel) return;
  const std=sel.querySelector('option[value="std"]');
  if(std) std.textContent='Standard — '+(arSelected()?AR_LEAD:PLAIN_LEAD);
}
function syncSubmitMode(){
  const direct=canSubmitDirect();
  const note=$('#directNote');
  ['#submitBtn','#submitBtn2'].forEach(sel=>{
    const b=$(sel); if(!b) return;
    const wasDisabled=b.disabled;
    b.textContent=direct?'Place order now':'Submit to cart';
    b.disabled=wasDisabled;
  });
  if(note){
    note.classList.toggle('hide',!direct);
    note.textContent='Your account is credit-approved — this order goes straight to the lab and is billed to your account. Nothing else to check out.';
  }
}

let submitInFlight=false;
let lastSubmittedPayload=null;
async function submit(){
  if(submitInFlight) return;
  const V=secValid();
  if(!(V['sec-patient']&&V['sec-frame']&&V['sec-lens']&&V['sec-rx']&&V['sec-treat'])) return;
  const c=CUR[S.cur], {sub}=price();
  const rows=activeEyes().map(e=>({e,r:readRow(e)}));
  const fmt=r=>`${r.sph!==null?sgn(r.sph):'—'} / ${r.cyl!==null?sgn(r.cyl):'—'} × ${r.axis??'—'}`;
  const tr=Array.from(S.treat).map(id=>(TREAT.find(x=>x.id===id)||{}).n).filter(Boolean);
  $('#mSum').innerHTML=`
    <div class="r"><span>Order number</span><b>${S.orderNo}</b></div>
    <div class="r"><span>Store</span><b>${S.branch?S.branch.name:'—'}</b></div>
    ${splitActive()
      ? `<div class="r"><span>Lens OD</span><b>${namedLens('a')||'—'}</b></div><div class="r"><span>Lens OS</span><b>${namedLens('b')||'—'}</b></div>`
      : `<div class="r"><span>Lens</span><b>${namedLens('a')||'—'}</b></div>`}
    ${rows.map(({e,r})=>`<div class="r"><span>${e.toUpperCase()}</span><b>${fmt(r)}</b></div>`).join('')}
    <div class="r"><span>Treatments</span><b>${tr.length?tr.join(', '):'None'}</b></div>
    <div class="r"><span>Job</span><b>${S.scope==='uncut'?'Uncut Rx lenses':S.scope==='remote'?'Remote edge':'Full glaze'} · ${S.eyes==='pair'?'pair':S.eyes==='od'?'right only':'left only'}</b></div>
    ${S.ownerReview?'<div class="r"><span>Flag</span><b style="color:hsl(38 70% 30%)">Owner review before production</b></div>':''}
    <div class="r" style="border-top:1px solid var(--border-soft);margin-top:6px;padding-top:8px"><span>${S.pricesOn?'Locked price':'Price'}</span><b>${S.pricesOn?c.sym+' '+money(sub*c.rate):'Confirmed with you before production'}</b></div>`;
  const direct=canSubmitDirect();
  $('#scrim .mhead h2').textContent=direct?'Order placed':'Added to your cart';
  $('#scrim .mhead p').textContent=direct
    ? (S.pricesOn
        ? 'This order is with the lab and billed to your account at the price above.'
        : 'This order is with the lab and billed to your account. We will confirm the final details before production.')
    : (S.pricesOn
        ? 'Price is now locked at this quote and will be honoured through checkout.'
        : 'Your order is in the cart. We will confirm the final order details before production.');
  /* A placed order has nothing left to check out, and duplicating it would
     place a second real order rather than copy a basket row. */
  $$('#scrim .choice').forEach(b=>{
    const n=b.dataset.next;
    b.classList.toggle('hide',direct&&(n==='checkout'||n==='duplicate'));
  });
  submitInFlight=true;
  try{
    const __p=stashOrder('submitted');
    lastSubmittedPayload=__p;
    if(direct) await ADAPTER.onSubmittedDirect(__p);
    else if(ADAPTER.onSubmitted) await ADAPTER.onSubmitted(__p);
    $('#scrim').classList.add('on');
  }catch(err){
    console.error('Rx order submission could not be persisted',err);
    toast(direct
      ? ('Could not place the order'+(err&&err.message?': '+err.message:'')+'. Please try again.')
      : 'Could not save the order and add it to the cart. Please try again.');
  }finally{ submitInFlight=false; }
}
$('#submitBtn').addEventListener('click',()=>{void submit();});
$('#submitBtn2').addEventListener('click',()=>{void submit();});
$$('#scrim .choice').forEach(b=>b.addEventListener('click',async()=>{
  const n=b.dataset.next; $('#scrim').classList.remove('on');
  if(n==='another'){
    // A blank in-place reset (clearAll) keeps this quote's id, and the cart's
    // synthetic product id is a hash of that id — so a second submit under
    // the same quote collides with the first job's cart row and fails to
    // add. onAnother (when wired) starts a genuinely new quote instead.
    if(ADAPTER.onAnother) ADAPTER.onAnother();
    else setTimeout(()=>{ clearAll(); toast('New blank Rx order · previous job is in your cart'); },260);
  }
  else if(n==='duplicate'){
    if(!ADAPTER.onDuplicate){ toast('Duplicate wiring not enabled on this surface'); return; }
    try{ await ADAPTER.onDuplicate(lastSubmittedPayload); toast('Duplicated — a second copy is in your cart'); }
    catch(err){ console.error('Rx order duplicate failed',err); toast('Could not duplicate this order'+(err&&err.message?': '+err.message:'')+'. Please try again.'); }
  }
  else if(n==='checkout'){ if(ADAPTER.onCheckout) ADAPTER.onCheckout(); else toast('Checkout wiring not enabled on this surface'); }
  else { if(ADAPTER.onStore) ADAPTER.onStore(); else toast('Store return not enabled on this surface'); }
}));
$('#scrim').addEventListener('click',e=>{ if(e.target===$('#scrim')) $('#scrim').classList.remove('on'); });
$('#scrimClose').addEventListener('click',()=>{ $('#scrim').classList.remove('on'); });
docListen('keydown',e=>{ if(e.key!=='Escape') return;
  $('#scrim').classList.remove('on'); $('#treatDrawer').classList.remove('on'); $('#coachDrawer').classList.remove('on'); });

/* ---------- wiring ---------- */
docListen('input',e=>{
  /* checkboxes/radios fire 'input' before 'change' — re-rendering here would
     re-sync the checkbox to the still-stale state and swallow the pending
     'change' event (that was the Chemistrie-checkbox-doesn't-open-anything bug).
     Let their dedicated 'change' handlers own the render instead. */
  if(e.target.type==='checkbox'||e.target.type==='radio') return;
  if(e.target.closest('.wrap')) render();
});
docListen('change',e=>{
  if(e.target.id==='curSim') S.cur=e.target.value;
  if(e.target.id==='pricesOn'){ S.pricesOn=e.target.checked;
    toast(S.pricesOn?'Prices visible — quote panel restored':'Prices hidden — ordering and checkout still work'); }
  render();
});

$('#delivery').addEventListener('change',()=>{ S.deliveryTouched=true; });
$('#treatConfirm').addEventListener('click',()=>{
  S.treatConfirmed=!S.treatConfirmed;
  render();
  if(S.treatConfirmed) toast('Coatings confirmed');
});
$('#notesConfirmed').addEventListener('change',e=>{
  S.notesConfirmed=e.target.checked; render();
});
/* patient and frame names print on lab tickets — the lab standardises on caps. */
['pfirst','plast','fname'].forEach(id=>{
  const el=$('#'+id);
  el.addEventListener('input',()=>{
    const pos=el.selectionStart;
    el.value=el.value.toUpperCase();
    el.setSelectionRange(pos,pos);
  });
});
$('#chemOn').addEventListener('change',e=>{
  if(e.target.checked){ if(!S.chemClips.length) S.chemClips=[newChemClip()]; }
  else { S.chemClips=[]; }
  render();
  toast(e.target.checked?'Chemistrie layer added — configure it below':'Chemistrie layer removed');
});

/* remove a treatment or Chemistrie clip straight from the live quote — the base
   lens line (material · design · colour) has no rm data, so it can't be removed here. */
$('#qLines').addEventListener('click',e=>{
  const b=e.target.closest('.qline-rm'); if(!b) return;
  const {rmtype,rmid}=b.dataset;
  if(rmtype==='treat'){ toggleTreat(rmid); toast('Removed from the order'); }
  else if(rmtype==='chem'){ S.chemClips=S.chemClips.filter(c=>c.id!==rmid); render(); toast('Clip removed'); }
});

/* ---------- settings gear ---------- */
$('#gearBtn').addEventListener('click',e=>{
  e.stopPropagation();
  const m=$('#gearMenu'), open=!m.classList.contains('on');
  m.classList.toggle('on',open);
  $('#gearBtn').setAttribute('aria-expanded',String(open));
});
docListen('click',e=>{
  if(!e.target.closest('.gearwrap')) $('#gearMenu').classList.remove('on');
});
$('#gearMenu').addEventListener('click',e=>{ if(e.target.closest('.linkbtn')) $('#gearMenu').classList.remove('on'); });

/* ---------- annotate mode (reviewer feedback capture) ----------
   Prototype-only tool: click any element on the form to leave a timestamped
   note (priority: must change / prefer / idea), then export everything as
   rx-order-form-FEEDBACK.md. Notes persist to localStorage so the list and
   export survive a reload, but the on-screen pins need a live DOM reference,
   so pins only render for notes captured in the current page session. */
const ANNO_KEY='cv-rx-anno-notes';
function loadAnnoNotes(){ try{ return JSON.parse(localStorage.getItem(ANNO_KEY)||'[]'); }catch(e){ return []; } }
function saveAnnoNotes(){ try{ localStorage.setItem(ANNO_KEY, JSON.stringify(annoNotes.map(({el,...rest})=>rest))); }catch(e){} }
let annoOn=false, annoNotes=loadAnnoNotes(), annoEditId=null, annoPendingEl=null, annoPinsRaf=null;

function escAnno(s){ return String(s).replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch])); }
function priLabel(p){ return p==='must'?'Must change':p==='idea'?'Idea':"I'd prefer"; }
function annoLabel(el){
  if(!el) return 'General note';
  const aria=el.getAttribute&&el.getAttribute('aria-label');
  if(aria&&aria.trim()) return aria.trim();
  if(el.id){ const lab=$$('label').find(l=>l.htmlFor===el.id); if(lab&&lab.textContent.trim()) return lab.textContent.trim(); }
  const fieldLab=el.closest&&el.closest('.field')&&el.closest('.field').querySelector('label');
  if(fieldLab&&fieldLab.textContent.trim()) return fieldLab.textContent.trim().replace(/\s+/g,' ');
  const hint=el.getAttribute&&(el.getAttribute('placeholder')||el.getAttribute('title'));
  if(hint&&hint.trim()) return hint.trim();
  const txt=(el.textContent||'').trim().replace(/\s+/g,' ');
  if(txt) return txt.length<=70?txt:txt.slice(0,67)+'…';
  if(el.id) return '#'+el.id;
  const cls=(typeof el.className==='string'?el.className:'').trim().split(/\s+/).filter(Boolean).slice(0,2).join('.');
  return el.tagName.toLowerCase()+(cls?'.'+cls:'');
}
function annoSelector(el){
  if(!el) return '';
  const parts=[]; let n=el, depth=0;
  while(n&&n!==rootEl&&n.nodeType===1&&depth<6){
    let seg=n.tagName.toLowerCase();
    if(n.id){ parts.unshift(seg+'#'+n.id); break; }
    const cls=(typeof n.className==='string'?n.className:'').trim().split(/\s+/).filter(Boolean).slice(0,2);
    if(cls.length) seg+='.'+cls.join('.');
    parts.unshift(seg); n=n.parentElement; depth++;
  }
  return parts.join(' > ');
}
function updateAnnoCounts(){
  const n=annoNotes.length;
  $('#annoCount').textContent=n?'('+n+')':'';
  $('#abCount').textContent=String(n);
  $('#drCount').textContent=n===1?'1 note':n+' notes';
}
function hideAnnoHi(){ $('#annoHi').style.display='none'; }
function showAnnoHi(el){
  const hi=$('#annoHi'), r=el.getBoundingClientRect();
  hi.style.display='block'; hi.style.left=r.left+'px'; hi.style.top=r.top+'px';
  hi.style.width=r.width+'px'; hi.style.height=r.height+'px';
}
function positionAnnoPopup(el){
  const pop=$('#annoPop'), vw=window.innerWidth, vh=window.innerHeight, w=330, pad=12;
  let top,left;
  if(el&&el.getBoundingClientRect){ const r=el.getBoundingClientRect(); top=r.bottom+10; left=r.left; }
  else { top=vh/2-140; left=vw/2-165; }
  left=Math.max(pad,Math.min(left,vw-w-pad));
  top=Math.max(pad,Math.min(top,vh-340));
  pop.style.left=left+'px'; pop.style.top=top+'px';
}
function openAnnoPopup(el,existingNote){
  annoEditId=existingNote?existingNote.id:null;
  annoPendingEl=existingNote?null:el;
  $('#apEl').textContent=existingNote?existingNote.label:annoLabel(el);
  $('#apText').value=existingNote?existingNote.text:'';
  const pri=existingNote?existingNote.priority:'prefer';
  $$('#apPri button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.p===pri)));
  $('#apDel').style.display=existingNote?'':'none';
  positionAnnoPopup((existingNote&&existingNote.el)||el);
  hideAnnoHi();
  $('#annoPop').classList.add('on');
  setTimeout(()=>{ const t=$('#apText'); t.focus(); t.select(); },10);
}
function closeAnnoPop(){ $('#annoPop').classList.remove('on'); annoEditId=null; annoPendingEl=null; }
function renderPins(){
  const layer=$('#annoLayer'); layer.innerHTML='';
  let i=0;
  annoNotes.forEach(n=>{
    if(!n.el||!n.el.isConnected) return;
    i++;
    const r=n.el.getBoundingClientRect();
    const pin=document.createElement('button');
    pin.type='button';
    pin.className='pin'+(n.priority==='must'?' p-must':n.priority==='idea'?' p-idea':'');
    pin.style.left=(r.left+r.width/2-11)+'px';
    pin.style.top=(r.top-11)+'px';
    pin.textContent=String(i);
    pin.title=n.label;
    pin.addEventListener('click',e=>{ e.stopPropagation(); openAnnoPopup(pin,n); });
    layer.appendChild(pin);
  });
}
function scheduleRenderPins(){
  if(!annoOn||annoPinsRaf) return;
  annoPinsRaf=requestAnimationFrame(()=>{ annoPinsRaf=null; renderPins(); });
}
function renderAnnoDrawerList(){
  const body=$('#drBody');
  if(!annoNotes.length){
    body.innerHTML='<p class="dr-empty">No notes yet. Turn on Annotate mode from the gear menu, then click anything on the form you\'d like changed.</p>';
    return;
  }
  body.innerHTML=annoNotes.map((n,i)=>`<div class="note${n.priority==='must'?' must':n.priority==='idea'?' idea':''}" data-id="${n.id}">
      <div class="nh"><span class="nn">${i+1}</span><span class="nl">${escAnno(n.label)}</span><span class="np">${priLabel(n.priority)}</span></div>
      <div class="nt">${escAnno(n.text)}</div>
    </div>`).join('');
}
function buildAnnoMarkdown(){
  const ord={must:0,prefer:1,idea:2};
  const sorted=[...annoNotes].sort((a,b)=>(ord[a.priority]??1)-(ord[b.priority]??1));
  const lines=['# Rx order form — reviewer feedback','',`Captured ${new Date().toLocaleString()} · ${annoNotes.length} note${annoNotes.length===1?'':'s'}`,''];
  sorted.forEach((n,i)=>{
    lines.push(`## ${i+1}. ${priLabel(n.priority)} — ${n.label}`);
    if(n.selector) lines.push(`*Element:* \`${n.selector}\``);
    lines.push('',n.text,'');
  });
  return lines.join('\n');
}
function setAnnoMode(on){
  annoOn=!!on;
  rootEl.classList.toggle('anno-on',annoOn);
  $('#annoBar').classList.toggle('on',annoOn);
  $('#gearMenu').classList.remove('on');
  if(annoOn){ renderPins(); toast('Annotate mode on — click anything you\'d like changed'); }
  else { hideAnnoHi(); closeAnnoPop(); }
}
$('#annoToggle').addEventListener('click',()=>setAnnoMode(!annoOn));
$('#abExit').addEventListener('click',()=>setAnnoMode(false));
$('#abGeneral').addEventListener('click',()=>openAnnoPopup(null,null));
$('#abList').addEventListener('click',()=>{ renderAnnoDrawerList(); $('#annoDrawer').classList.add('on'); });
$('#drClose').addEventListener('click',()=>$('#annoDrawer').classList.remove('on'));
$('#drBody').addEventListener('click',e=>{
  const card=e.target.closest('.note'); if(!card) return;
  const n=annoNotes.find(x=>x.id===card.dataset.id); if(!n) return;
  $('#annoDrawer').classList.remove('on');
  openAnnoPopup(n.el||null,n);
});
$('#drCopy').addEventListener('click',async()=>{
  if(!annoNotes.length){ toast('No notes to copy yet'); return; }
  try{ await navigator.clipboard.writeText(buildAnnoMarkdown()); toast('Feedback copied as markdown'); }
  catch(e){ toast('Copy blocked by the browser'); }
});
$('#drDownload').addEventListener('click',()=>{
  if(!annoNotes.length){ toast('No notes to download yet'); return; }
  const blob=new Blob([buildAnnoMarkdown()],{type:'text/markdown'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='rx-order-form-FEEDBACK.md';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Downloaded rx-order-form-FEEDBACK.md');
});
$('#drClear').addEventListener('click',()=>{
  if(!annoNotes.length) return;
  if(!confirm('Clear all annotate notes? This can\'t be undone.')) return;
  annoNotes.length=0; saveAnnoNotes(); updateAnnoCounts(); renderPins(); renderAnnoDrawerList();
  toast('Notes cleared');
});
$('#apPri').addEventListener('click',e=>{
  const b=e.target.closest('button[data-p]'); if(!b) return;
  $$('#apPri button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
});
$('#apCancel').addEventListener('click',closeAnnoPop);
$('#apSave').addEventListener('click',()=>{
  const text=$('#apText').value.trim();
  if(!text){ toast('Add a note before saving'); return; }
  const priBtn=$$('#apPri button').find(b=>b.getAttribute('aria-pressed')==='true');
  const priority=priBtn?priBtn.dataset.p:'prefer';
  if(annoEditId){
    const n=annoNotes.find(x=>x.id===annoEditId);
    if(n){ n.text=text; n.priority=priority; n.updatedAt=new Date().toISOString(); }
  } else {
    annoNotes.push({
      id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
      label:annoLabel(annoPendingEl), selector:annoSelector(annoPendingEl),
      text, priority, at:new Date().toISOString(), el:annoPendingEl||null
    });
  }
  saveAnnoNotes(); updateAnnoCounts(); closeAnnoPop();
  if(annoOn) renderPins();
  toast('Note saved');
});
$('#apDel').addEventListener('click',()=>{
  if(!annoEditId) return;
  if(!confirm('Delete this note?')) return;
  const idx=annoNotes.findIndex(x=>x.id===annoEditId);
  if(idx>-1) annoNotes.splice(idx,1);
  saveAnnoNotes(); updateAnnoCounts(); closeAnnoPop();
  if(annoOn) renderPins();
  renderAnnoDrawerList();
  toast('Note deleted');
});
rootEl.addEventListener('mousemove',e=>{
  if(!annoOn) return;
  if(e.target.closest('#annoUI')||e.target.closest('.gearwrap')){ hideAnnoHi(); return; }
  showAnnoHi(e.target);
});
rootEl.addEventListener('mouseleave',()=>{ if(annoOn) hideAnnoHi(); });
rootEl.addEventListener('click',e=>{
  if(!annoOn) return;
  if(e.target.closest('#annoUI')||e.target.closest('.gearwrap')) return;
  e.preventDefault(); e.stopPropagation();
  openAnnoPopup(e.target,null);
},true);
docListen('keydown',e=>{
  if(e.key!=='Escape') return;
  if($('#annoPop').classList.contains('on')){ closeAnnoPop(); return; }
  if($('#annoDrawer').classList.contains('on')){ $('#annoDrawer').classList.remove('on'); return; }
  if(annoOn) setAnnoMode(false);
});
winListen('scroll',scheduleRenderPins,true);
winListen('resize',scheduleRenderPins);
updateAnnoCounts();

/* ---------- standard shapes on remote edge ---------- */
$('#openStdShapes').addEventListener('click',()=>{
  S.stdShapesOpen=true;
  $('#scopeSeg button[data-scope="remote"]').click();
  $('#shapeBlock').scrollIntoView({behavior:'smooth',block:'center'});
  toast('Standard shapes available — the uploaded trace still takes precedence if you add one');
});

/* ---------- shape library + payload wiring ---------- */
$('#libInput').addEventListener('change',e=>{ seedLibFromFiles(e.target.files); e.target.value=''; });
$('#btnPayload').addEventListener('click',showPayload);
$('#payloadClose').addEventListener('click',()=>$('#payloadDrawer').classList.remove('on'));
$('#payloadCopy').addEventListener('click',async()=>{
  const j=JSON.stringify(buildPayload(),null,2);
  try{ await navigator.clipboard.writeText(j); toast('Payload JSON copied'); }
  catch(e){ toast('Copy blocked by the browser'); }
});
$('#btnReorder').addEventListener('click',()=>{
  let hist=[]; try{ hist=JSON.parse(localStorage.getItem('cv-rx-history')||'[]'); }catch(e){}
  if(!hist.length){ toast('No order history yet — submit or save a draft first'); return; }
  const h=hist[0];
  restorePayload(h.payload,{newOrderNumber:true});
  $('#draftBanner').classList.remove('hide');
  $('#draftBanner').querySelector('span:nth-child(2)').innerHTML=
    `<b>Rebuilt from order history</b> — ${h.label}, ${h.kind} on ${new Date(h.at).toLocaleString()}. Everything is editable; the quote reprices at today's rates.`;
  window.scrollTo({top:0,behavior:'smooth'});
  toast('Order rebuilt from history — shape, Rx and treatments restored');
});

/* ---------- keep the sticky quote panel clear of the sticky step rail ----------
   .steps' sticky top offset depends on the host surface (see .has-fixed-header
   in the CSS) and its rendered height varies (it can wrap to two rows on
   narrower desktop widths), so a fixed top offset on .quote either left a gap
   or let it slide underneath the step rail depending on viewport width.
   Reading .steps' own computed offset and pushing .quote's sticky top just
   past it keeps a consistent gap at any width/surface, and never overlaps. */
function syncQuoteStickyTop(){
  const steps=$('.steps'), quote=$('.quote');
  if(!steps||!quote) return;
  if(window.innerWidth<=1080){ quote.style.top=''; return; } // matches the .quote{position:static} breakpoint
  const stepsTop=parseFloat(getComputedStyle(steps).top)||0; // matches .steps{top:...} in CSS
  quote.style.top=(stepsTop+steps.offsetHeight+8)+'px';
}
winListen('resize',syncQuoteStickyTop);
winListen('load',syncQuoteStickyTop);

/* ---------- adapter data (live catalog/accounts replace the prototype statics) ---------- */
function applyAdapterData(){
  const D=ADAPTER.data; if(!D) return;
  const swap=(arr,next)=>{ if(Array.isArray(next)&&next.length){ arr.length=0; next.forEach(x=>arr.push(x)); } };
  swap(BRANCHES,D.branches); swap(MATERIALS,D.materials); swap(DESIGNS,D.designs);
  swap(COLOURS,D.colours); swap(TREAT,D.treatments); swap(CLASH,D.clashes);
  if(D.matrix&&Object.keys(D.matrix).length){
    Object.keys(MATRIX).forEach(k=>delete MATRIX[k]); Object.assign(MATRIX,D.matrix);
  }
  COMBOS.length=0;
  if(Array.isArray(D.combos)&&D.combos.length){ D.combos.forEach(x=>COMBOS.push(x)); }
  else Object.entries(MATRIX).forEach(([m,v])=>v.d.forEach(d=>v.c.forEach(c=>COMBOS.push({m,d,c}))));
  if(D.currencies&&Object.keys(D.currencies).length){
    Object.keys(CUR).forEach(k=>delete CUR[k]); Object.assign(CUR,D.currencies);
    /* The gear's currency list is static markup and offers codes the live table
       may not have (CAD, GYD). Selecting one of those reads .rate off undefined
       and takes the quote down, so rebuild the options from the table itself. */
    const sim=$('#curSim');
    if(sim){
      sim.innerHTML=Object.entries(CUR)
        .map(([code,c])=>`<option value="${code}">${c.sym}${c.indicative?' · indicative':''}</option>`).join('');
      if(!CUR[S.cur]) S.cur=Object.keys(CUR)[0];
      sim.value=S.cur;
    }
  }
}

/* ---------- init ---------- */
applyAdapterData();
newOrderNo();
loadLib(); autoLoadLib();
fillLensSelects(); buildPopular(); buildTreatList();
$('#scopeSeg button[data-scope="uncut"]').click();
renderBranches();
if(ADAPTER.lockedBranchId){
  const el=$$('#branchList .branch').find(b=>b.dataset.b===String(ADAPTER.lockedBranchId));
  if(el) el.click();
  const chip=$('#branchChip'); if(chip) chip.style.pointerEvents='none';
} else if(ADAPTER.defaultBranchId && $$('#branchList .branch').find(b=>b.dataset.b===String(ADAPTER.defaultBranchId))){
  // Preselected, not locked — the picker (chip, gear "Store picker") stays open to switching accounts.
  $$('#branchList .branch').find(b=>b.dataset.b===String(ADAPTER.defaultBranchId)).click();
} else {
  $('#branchScrim').classList.add('on');
}
/* Arriving from the Lens Assistant: replay a partial payload, then flag the
   form as prefilled so the skipped-mandatory beacon glows what's still missing. */
if(ADAPTER.prefill){
  restorePayload(ADAPTER.prefill);
  S.fromDraft=true;
  const banner=$('#draftBanner');
  if(banner){
    banner.classList.remove('hide');
    if(ADAPTER.prefillBanner) banner.querySelector('span:nth-child(2)').innerHTML=ADAPTER.prefillBanner;
  }
}
render();
syncQuoteStickyTop();

return {
  destroy(){
    __docL.forEach(([t,f,o])=>document.removeEventListener(t,f,o));
    __winL.forEach(([t,f,o])=>window.removeEventListener(t,f,o));
    /* the combo portal root (see comboPortalRoot) lives outside rootEl, so
       hostRef.current.innerHTML="" won't reach it — drop it explicitly, list
       and all, or it (and whichever list was open) leaks as an orphaned node. */
    const comboPortal=document.getElementById('cvRxComboPortal');
    if(comboPortal) comboPortal.remove();
  },
  refreshData(){ applyAdapterData(); repair(); fillLensSelects(); buildPopular(); buildTreatList(); renderBranches(); render(); },
  getPayload: buildPayload,
  restorePayload,
  clearAll,
  state: S,
};
}
