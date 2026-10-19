import './shared-ui.css';
import { mountLensPicker, unmountLensPicker } from './lensPickerMount';
// Selected Rx supplies layout: seeded state, shared admin tokens, no API or storage.
const supplies = [
  { id: 'cloth', sku: '2817200', name: 'Plain lens cloth 150 × 130', category: 'Cleaning & care', detail: 'Microfibre · individual cloth', price: 1.5 },
  { id: 'cleaner', sku: '2817201', name: 'Vizionize lens cleaner', category: 'Cleaning & care', detail: '60 ml spray · individual bottle', price: 6.44 },
  { id: 'kit', sku: '2817202', name: 'Lens cleaning kit', category: 'Cleaning & care', detail: 'Spray, cloth and travel pouch', price: 12 },
  { id: 'case', sku: '2817300', name: 'Classic hard spectacle case', category: 'Cases & accessories', detail: 'Navy · individual case', price: 4.8 },
  { id: 'cord', sku: '2817301', name: 'Adjustable spectacle cord', category: 'Cases & accessories', detail: 'Black · individual cord', price: 3.25 },
  { id: 'shield', sku: '2817400', name: 'Eye Shield 5', category: 'Lab supplies', detail: 'Protective lab accessory · pack of 5', price: 18 },
  { id: 'pads', sku: '2817401', name: 'Silicone nose pads', category: 'Lab supplies', detail: 'Screw fit · pack of 10 pairs', price: 8.5 },
];
const lensCatalog = [
  { id: 'sv150', vision: 'Single vision', material: '1.50 Resin', design: 'Regular', option: 'Clear', price: 25.2, finish: 'Finished', rows: [-2,-1.5,-1,-.5,0,.5,1,1.5,2], cols: [-2,-1.5,-1,-.5,0], rowLabel: 'Sphere', colLabel: 'Cylinder' },
  { id: 'sv156', vision: 'Single vision', material: '1.56 Resin', design: 'Aspheric', option: 'Clear · AR', price: 32, finish: 'Finished', rows: [-2,-1,0,1,2,3], cols: [-2,-1,0], rowLabel: 'Sphere', colLabel: 'Cylinder' },
  { id: 'sv156photo', vision: 'Single vision', material: '1.56 Resin', design: 'Aspheric', option: 'Photochromic grey · AR', price: 48, finish: 'Finished', rows: [-2,-1,0,1,2,3], cols: [-2,-1,0], rowLabel: 'Sphere', colLabel: 'Cylinder' },
  { id: 'bf', vision: 'Multifocal / progressive', material: '1.50 Resin', design: 'Flat top 28', option: 'Clear', price: 30, finish: 'Semi-finished', rows: [2,4,6,8], cols: [1,1.5,2,2.5,3], rowLabel: 'Base curve', colLabel: 'ADD' },
  { id: 'pal', vision: 'Multifocal / progressive', material: '1.56 Resin', design: 'Progressive', option: 'Clear · AR', price: 45, finish: 'Semi-finished', rows: [2,4,6,8], cols: [1,1.5,2,2.5,3], rowLabel: 'Base curve', colLabel: 'ADD' },
];
const accounts = {
  full: { name: 'Harbour Optical', description: 'Stock lenses + supplies', supplies: true, lenses: true, factor: 1 },
  supplies: { name: 'Seaside Eyecare', description: 'Supplies only', supplies: true, lenses: false, factor: 1.1 },
  lenses: { name: 'Island Vision', description: 'Stock lenses only', supplies: false, lenses: true, factor: .9 },
  empty: { name: 'New trade account', description: 'No assigned stock pricing', supplies: false, lenses: false, factor: 1 },
};
const state = { surface: 'admin', account: 'full', reference: '', po: '', instructions: '', lines: [], fallback: false };
let picker = { kind: '', category: 'All supplies', search: '' };
const app = document.querySelector('#app');
const dialog = document.querySelector('#picker');
const escape = (value) => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = value => new Intl.NumberFormat('en-BB', { style: 'currency', currency: 'BBD' }).format(value);
const power = value => value.toFixed(2);
const account = () => accounts[state.account];
const priceFor = value => Math.round(value * account().factor * 100) / 100;
const total = () => state.lines.reduce((sum, line) => sum + Math.round(line.price * 100) * line.qty, 0) / 100;
let noticeTimer;
function notify(message) { document.querySelector('#notice').textContent = message; clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { document.querySelector('#notice').textContent = ''; }, 4200); }
function detailsCard() {
  return `<section class="card identification" aria-label="Order identification"><div class="fields"><label for="reference">Patient / order reference <span class="required" aria-hidden="true">*</span><input id="reference" data-field="reference" value="${escape(state.reference)}" maxlength="20" required placeholder="Patient name or reference"></label><label for="po">PO number <span class="optional">(optional)</span><input id="po" data-field="po" value="${escape(state.po)}" maxlength="15" placeholder="Purchase order number"></label><label for="instructions">Special instructions <span class="optional">(optional)</span><textarea id="instructions" data-field="instructions" placeholder="Anything we should know?">${escape(state.instructions)}</textarea></label></div></section>`;
}
function addActions() {
  return `<div class="actions">${account().supplies ? '<button class="teal" data-action="supplies">▧ &nbsp; Add supplies</button>' : ''}${account().lenses ? '<button class="primary" data-action="lenses">⊙ &nbsp; Add stock lenses</button>' : ''}</div>`;
}
function linesCard() {
  return `<section class="card"><div class="card-head"><div><h2>Order lines</h2><small>Browse your account’s items, or scan an SKU / OPC.</small></div>${addActions()}</div>${!account().supplies && !account().lenses ? '<div class="pending"><h2>Stock / supplies ordering is unavailable</h2><p>This demo account has no stock items on its assigned pricelist.</p><small>Switch the demo account above to explore availability.</small></div>' : `<div class="table-wrap"><table><thead><tr><th>#</th><th>SKU / OPC</th><th>Description</th><th>Line ref.</th><th>Qty</th><th>Unit price</th><th>Subtotal</th><th></th></tr></thead><tbody>${state.lines.length ? state.lines.map((l,i) => `<tr><td>${i+1}</td><td>${escape(l.sku)}</td><td><b>${escape(l.name)}</b><br><small>${escape(l.detail)}</small></td><td><input class="ref" data-line="${i}" data-prop="reference" value="${escape(l.reference)}" aria-label="Line ${i+1} reference" placeholder="Optional"></td><td><input class="qty" type="number" min="1" max="999" step="1" data-line="${i}" data-prop="qty" value="${l.qty}" aria-label="Line ${i+1} quantity"></td><td class="money">${money(l.price)}<br><small>per ${l.unit}</small></td><td class="money" data-subtotal="${i}"><b>${money(l.price*l.qty)}</b></td><td><button class="ghost" data-remove="${i}" aria-label="Remove line ${i+1}">×</button></td></tr>`).join('') : '<tr><td colspan="8" class="empty"><span style="font-size:28px;color:#1a8a9c">▧</span><strong>Your order starts here</strong>Choose supplies, stock lenses, or scan a barcode.</td></tr>'}</tbody></table></div><form id="scan-form" class="scanline"><button type="button" data-action="scanner" aria-label="Open barcode scanner">⌗ &nbsp; Scan</button><input id="scan-code" aria-label="Scan SKU or OPC" placeholder="Scan SKU / OPC, then Enter…" autocomplete="off"><small>Try demo barcode 2817201</small></form><div class="total"><div><div class="eyebrow">Checkout estimate · BBD</div><small data-count>${state.lines.reduce((s,l)=>s+l.qty,0)} items · seeded account prices · tax excluded</small></div><strong data-total>${money(total())}</strong></div>`}</section>`;
}
function workflow() { return `<section class="card toolbar"><div><h2>Ready when you are</h2><p>Review your items and reference before continuing.</p><small>Demo only · refreshing clears this order.</small></div><div class="actions"><button data-action="draft">Save demo draft</button><button class="primary" data-action="review">Review demo order →</button></div></section>`; }
function render() {
  app.innerHTML = `<div class="banner"><b>INTERACTIVE PROTOTYPE</b><span>Seeded information only · no live orders or customer data</span></div><main class="workspace">${detailsCard()}${linesCard()}${workflow()}<details><summary>Prototype state / sync preview</summary><label><input id="fallback" type="checkbox" ${state.fallback?'checked':''}> Demo option: copy unit price into an empty line reference on simulated sync</label><pre id="state-preview"></pre></details></main>`;
  updatePreview();
}
function payload() { return { prototype: true, account: account().name, reference: state.reference, poNumber: state.po, instructions: state.instructions, currency: 'BBD', lines: state.lines.map(l=>({...l, reference: l.reference || (state.fallback ? l.price.toFixed(2) : '')})), estimate: total() }; }
function updatePreview() { document.querySelector('#state-preview').textContent = JSON.stringify(payload(),null,2); }
function addSupply(item) {
  const existing = state.lines.find(l=>l.id===item.id);
  if (existing) existing.qty += 1;
  else state.lines.push({ id:item.id, sku:item.sku, name:item.name, detail:item.detail, price:priceFor(item.price), unit:'item', qty:1, reference:'' });
  render(); notify(`${item.name} added`);
}
function openPicker(kind) {
  picker = { kind, category:'All supplies', search:'' };
  renderPicker(); dialog.showModal();
}
function renderSupplyResults() {
  return supplies.filter(s=>(picker.category==='All supplies'||s.category===picker.category)&&`${s.name} ${s.sku}`.toLowerCase().includes(picker.search.toLowerCase())).map(s=>`<article class="product"><div><span class="tag">${escape(s.category)}</span><h3>${escape(s.name)}</h3><p>${escape(s.detail)}</p><small>SKU ${s.sku}</small></div><div><b class="price">${money(priceFor(s.price))}</b><button data-supply="${s.id}">+ Add item</button></div></article>`).join('') || '<div class="pending">No priced supplies match your search.</div>';
}
function renderPicker() {
  unmountLensPicker();
  if(picker.kind==='supplies') {
    dialog.className='';
    dialog.innerHTML=`<div class="dialog-head"><div><div class="eyebrow">Shared supplies browser</div><h2 id="picker-title">Supplies for your practice</h2><p>Categories from the assigned pricelist · ${escape(account().name)} · BBD</p></div><button class="ghost" data-close aria-label="Close supplies browser">×</button></div><div class="dialog-body"><div class="browser-layout"><nav class="categories" aria-label="Supply categories">${['All supplies',...new Set(supplies.map(s=>s.category))].map(c=>`<button data-category="${escape(c)}" class="${picker.category===c?'active':''}">${escape(c)}</button>`).join('')}</nav><div><input id="supply-search" aria-label="Search supplies" value="${escape(picker.search)}" placeholder="Search supplies by name or SKU…"><div id="supply-results">${renderSupplyResults()}</div></div></div></div><div class="dialog-foot"><span class="summary-chip">${state.lines.length} order lines</span><button class="primary" data-close>Done</button></div>`;
  } else if(picker.kind==='lenses') {
    dialog.className='lens-dialog';
    mountLensPicker(dialog, {
      lenses: lensCatalog, priceFor, money, onAdd: addLensLine,
      onDone: () => { dialog.close(); render(); notify('Selected powers added to your order.'); },
      onClose: () => dialog.close(),
    });
  } else if(picker.kind==='scanner') {
    dialog.className='scanner';
    dialog.innerHTML=`<div class="dialog-head"><div><div class="eyebrow">Slim barcode scanner · demo</div><h2 id="picker-title">Scan an item</h2><p>A narrow target for the barcode on your item.</p></div><button class="ghost" data-close aria-label="Close scanner">×</button></div><div class="dialog-body"><div class="viewfinder"><span>Align the barcode within the scanning line</span></div><p>Camera capture is a visual simulation in this prototype. A USB scanner can type into the barcode field below.</p><form id="scanner-form"><label for="scanner-code">SKU / OPC</label><input id="scanner-code" autofocus placeholder="Scan or enter demo code…"><div class="actions" style="margin-top:15px"><button class="primary">Add scanned item</button><button type="button" data-action="demo-scan">Simulate scan · lens cleaner</button></div></form><small>Known demo codes: 2817201 (cleaner), 2817200 (cloth), DEMO-SV-1 (stock lens).</small></div>`;
  } else if(picker.kind==='review') {
    dialog.className='';
    dialog.innerHTML=`<div class="dialog-head"><div><div class="eyebrow">Prototype review</div><h2 id="picker-title">Review demo order</h2><p>${escape(account().name)} · Reference: ${escape(state.reference)}</p></div><button class="ghost" data-close aria-label="Close review">×</button></div><div class="dialog-body"><p><b>${state.lines.length} lines · ${money(total())} estimate</b></p><p>This is the proposed sync payload. All items and prices are seeded.</p><pre class="review">${escape(JSON.stringify(payload(),null,2))}</pre></div><div class="dialog-foot"><small>Simulation only · no order is transmitted or stored.</small><button class="primary" data-action="sync">Simulate sync</button></div>`;
  }
}
function scan(code) {
  const item=supplies.find(s=>s.sku===code.trim());
  if(item&&account().supplies) { addSupply(item); return true; }
  if(code.trim()==='DEMO-SV-1'&&account().lenses) { addLensLine(lensCatalog[0],4,4,1,'Pair');render();notify('Demo stock lens added');return true; }
  notify('Barcode not found on this demo account’s pricelist. Try 2817201.');return false;
}
function addLensLine(l,r,c,qty,side) {
  const id=`${l.id}:${r}:${c}:${side}`;
  const existing=state.lines.find(line=>line.id===id);
  if(existing) existing.qty+=qty;
  else state.lines.push({id,sku:`DEMO-${l.id}-${r}${c}`,name:`${l.material} ${l.design} ${l.option}`,detail:`${l.rowLabel} ${power(l.rows[r])} / ${l.colLabel} ${power(l.cols[c])} · ${side}`,side,price:Math.round(priceFor(l.price)*(side==='Pair'?2:1)*100)/100,unit:side==='Pair'?'pair':'lens',qty,reference:''});
}
function validate() {
  if(!state.reference.trim()) { render(); document.querySelector('#reference')?.focus();notify('Enter a patient name or order reference first.');return false; }
  if(!state.lines.length) { render();notify('Add at least one item first.');return false; }
  return true;
}
document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b) return;
  if(b.hasAttribute('data-close')) {dialog.close();return;}
  if(b.dataset.remove!==undefined) {state.lines.splice(Number(b.dataset.remove),1);render();return;}
  if(b.dataset.category) {picker.category=b.dataset.category;renderPicker();return;}
  if(b.dataset.supply) {addSupply(supplies.find(s=>s.id===b.dataset.supply));renderPicker();dialog.querySelector(`[data-supply="${b.dataset.supply}"]`)?.focus();return;}
  const action=b.dataset.action;
  if(['supplies','lenses'].includes(action)) {openPicker(action);return;}
  if(action==='scanner') {openPicker('scanner');return;}
  if(action==='demo-scan') {scan('2817201');dialog.close();return;}
  if(action==='draft') {if(validate())notify('Demo draft checked in memory. Refreshing clears it.');return;}
  if(action==='review') {if(validate()){picker.kind='review';renderPicker();dialog.showModal();}return;}
  if(action==='sync') {dialog.close();notify('Demo sync completed. Nothing was sent to the lab.');}
});
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.dataset.field) {state[el.dataset.field]=el.value;updatePreview();}
  if(el.id==='supply-search') {picker.search=el.value;document.querySelector('#supply-results').innerHTML=renderSupplyResults();}
  if(el.dataset.line!==undefined) {
    const line=state.lines[Number(el.dataset.line)];
    line[el.dataset.prop]=el.dataset.prop==='qty'?Math.min(999,Math.max(1,Math.trunc(Number(el.value)||1))):el.value;
    document.querySelector(`[data-subtotal="${el.dataset.line}"]`).textContent=money(line.qty*line.price);
    document.querySelector('[data-total]').textContent=money(total());document.querySelector('[data-count]').textContent=`${state.lines.reduce((s,l)=>s+l.qty,0)} items · seeded account prices · tax excluded`;updatePreview();
  }
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.dataset.line!==undefined && el.dataset.prop==='qty') el.value=state.lines[Number(el.dataset.line)].qty;
  if(el.id==='surface') {state.surface=el.value;render();}
  if(el.id==='account') {state.account=el.value;state.lines=[];render();notify('Demo account changed. Order lines cleared to avoid carrying another account’s prices.');}
  if(el.id==='fallback') {state.fallback=el.checked;updatePreview();}

});
document.addEventListener('submit',event=>{
  event.preventDefault();
  if(event.target.id==='scan-form') {const el=document.querySelector('#scan-code');if(scan(el.value))document.querySelector('#scan-code')?.focus();}
  if(event.target.id==='scanner-form') {if(scan(document.querySelector('#scanner-code').value))dialog.close();}
});
dialog.addEventListener('close', unmountLensPicker);
if(!('closedBy' in HTMLDialogElement.prototype))dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
});
const cleanUrl = new URL(location.href);
cleanUrl.searchParams.delete('variant');
history.replaceState(null, '', cleanUrl);
render();
