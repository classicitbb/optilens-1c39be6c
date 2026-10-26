export interface ClearanceItem {
  sku: string; skuRight?: string; skuLeft?: string; description: string; name: string;
  material: string; manufacturer: string; family: string; design: string; option: string;
  diameter: number; base: number; addPower: number; unit: "each" | "pairs";
  verticalAxis: "Sphere" | "Base curve"; horizontalAxis: "Cylinder" | "Add";
  quantity: number; priceBbd: number;
}
export interface ClearanceSnapshot { currency: "BBD"; asOf: string; expiresAt: string; items: ClearanceItem[] }
export interface PowerGrid { diameter: number; verticalAxis: string; horizontalAxis: string; rows: number[]; columns: number[]; cells: Map<string, ClearanceItem[]> }
export interface LensFamily {
  key: string; material: string; manufacturer: string; design: string; option: string;
  family: string; unit: "each" | "pairs"; quantity: number; items: ClearanceItem[]; grids: PowerGrid[];
}
export function groupFamilies(items: ClearanceItem[]): LensFamily[] {
  const families = new Map<string, LensFamily>();
  for (const item of items) {
    const key = JSON.stringify([item.material,item.manufacturer,item.design,item.option,item.family]);
    let family = families.get(key);
    if (!family) {
      family = {key,material:item.material,manufacturer:item.manufacturer,design:item.design,option:item.option,
        family:item.family,unit:item.unit,quantity:0,items:[],grids:[]}; families.set(key,family);
    }
    family.quantity += item.quantity; family.items.push(item);
    let grid = family.grids.find(g => g.diameter === item.diameter);
    if (!grid) { grid={diameter:item.diameter,verticalAxis:item.verticalAxis,horizontalAxis:item.horizontalAxis,rows:[],columns:[],cells:new Map()};family.grids.push(grid); }
    const row=Math.round(item.base*100),column=Math.round(item.addPower*100),cell=row+":"+column;
    if (!grid.rows.includes(row)) grid.rows.push(row);
    if (!grid.columns.includes(column)) grid.columns.push(column);
    grid.cells.set(cell,[...(grid.cells.get(cell)||[]),item]);
  }
  for (const family of families.values()) {
    family.grids.sort((a,b)=>a.diameter-b.diameter);
    for (const grid of family.grids) {grid.rows.sort((a,b)=>b-a);grid.columns.sort((a,b)=>grid.horizontalAxis==="Cylinder"?b-a:a-b);}
  }
  return [...families.values()].sort((a,b)=>a.items[0].name.localeCompare(b.items[0].name));
}
export const formatPower=(value:number)=>(value>0?"+":"")+(value/100).toFixed(2);
export const formatPrice=(value:number)=>value.toLocaleString("en-BB",{minimumFractionDigits:2,maximumFractionDigits:2});
