export function parseSnapshot(input: unknown, now = Date.now()) {
  if (!input || typeof input !== "object") throw Error("Invalid snapshot");
  const value=input as Record<string,unknown>;
  const asOf=typeof value.asOf==="string"?Date.parse(value.asOf):NaN;
  const expiry=typeof value.expiresAt==="string"?Date.parse(value.expiresAt):NaN;
  if(value.currency!=="BBD"||!Number.isFinite(asOf)||!Number.isFinite(expiry)||asOf>now+300000||expiry<=now||expiry<=asOf||expiry-asOf>86400000)throw Error("Invalid snapshot freshness");
  if(!Array.isArray(value.items)||value.items.length>20000)throw Error("Invalid items");
  const text=(row:Record<string,unknown>,key:string,required=true)=>{
    const field=row[key];
    if(typeof field!=="string"||field.length>500||(required&&!field.trim()))throw Error("Invalid "+key);
    return field;
  };
  const number=(row:Record<string,unknown>,key:string)=>{
    const field=row[key];if(typeof field!=="number"||!Number.isFinite(field))throw Error("Invalid "+key);return field;
  };
  const items=value.items.map(raw=>{
    if(!raw||typeof raw!=="object")throw Error("Invalid item");
    const row=raw as Record<string,unknown>;
    const family=text(row,"family"),single=/^single vision$/i.test(family);
    if(!single&&!/^(progressive|bifocal|trifocal|double segs)$/i.test(family))throw Error("Invalid lens family");
    if(row.unit!==(single?"each":"pairs")||row.verticalAxis!==(single?"Sphere":"Base curve")||row.horizontalAxis!==(single?"Cylinder":"Add"))throw Error("Invalid sale unit");
    const quantity=number(row,"quantity"),priceBbd=number(row,"priceBbd");
    if(!Number.isSafeInteger(quantity)||quantity<=0||priceBbd<=0||Math.abs(priceBbd*100-Math.round(priceBbd*100))>0.00001)throw Error("Invalid quantity or price");
    const diameter=number(row,"diameter");if(diameter<=0)throw Error("Invalid diameter");
    return {
      sku:text(row,"sku",false),skuRight:typeof row.skuRight==="string"?text(row,"skuRight",false):"",
      skuLeft:typeof row.skuLeft==="string"?text(row,"skuLeft",false):"",
      description:text(row,"description",false),name:text(row,"name"),material:text(row,"material"),manufacturer:text(row,"manufacturer"),
      family,design:text(row,"design"),option:text(row,"option"),diameter,base:number(row,"base"),addPower:number(row,"addPower"),
      unit:single?"each":"pairs",verticalAxis:single?"Sphere":"Base curve",horizontalAxis:single?"Cylinder":"Add",quantity,priceBbd
    };
  });
  return {currency:"BBD",asOf:new Date(asOf).toISOString(),expiresAt:new Date(expiry).toISOString(),items};
}
export function isLinkToken(value: unknown): value is string {
  return typeof value==="string"&&/^[A-Za-z0-9_-]{43}$/.test(value);
}
export async function tokenHash(token:string) {
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
}

export function familyKey(item:Record<string,unknown>) {
  return JSON.stringify([item.material,item.manufacturer,item.design,item.option,item.family]);
}
export function visibleSnapshot(snapshot:Record<string,unknown>,disabled:string[]) {
  const excluded=new Set(disabled);
  return {...snapshot,items:(snapshot.items as Record<string,unknown>[]).filter(item=>!excluded.has(familyKey(item)))};
}
