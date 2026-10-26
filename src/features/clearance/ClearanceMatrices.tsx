import { useId } from "react";
import { formatPower, formatPrice, type LensFamily } from "./model";
export default function ClearanceMatrices({family}:{family:LensFamily}) {
  const id=useId(),unit=family.unit==="pairs"?"pairs":"individual lenses",priceUnit=family.unit==="pairs"?"pair":"lens";
  const prices=family.items.map(i=>i.priceBbd),low=Math.min(...prices),high=Math.max(...prices);
  return <section className="cc-family">
    <div className="cc-family-heading"><div><p className="cc-eyebrow">{family.material} · {family.manufacturer}</p><h2>{family.design} · {family.option}</h2></div>
      <p>{family.quantity.toLocaleString()} {unit}<br/>BBD {formatPrice(low)}{low!==high?"–"+formatPrice(high):""} / {priceUnit}</p></div>
    {family.grids.map((grid,index)=><div key={grid.diameter}>
      <h3 id={id+index}>{grid.diameter} mm · {family.family} · quantities in {unit}</h3>
      <div className="cc-power-wrap" tabIndex={0} role="region" aria-labelledby={id+index}>
        <table className="cc-power-grid" style={{width:"calc(var(--clearance-cell-width, 80px) * "+(grid.columns.length+1)+")"}}><caption className="sr-only">{grid.verticalAxis} by {grid.horizontalAxis}; quantity and BBD price per {priceUnit}</caption><colgroup><col style={{width:"var(--clearance-cell-width, 80px)"}}/><col span={grid.columns.length} style={{width:"var(--clearance-cell-width, 80px)"}}/></colgroup>
          <thead><tr><th scope="col">{grid.verticalAxis} \ {grid.horizontalAxis}</th>{grid.columns.map(c=><th key={c} scope="col">{formatPower(c)}</th>)}</tr></thead>
          <tbody>{grid.rows.map(r=><tr key={r}><th scope="row">{formatPower(r)}</th>{grid.columns.map(c=>{
            const variants=grid.cells.get(r+":"+c)||[];
            return <td key={c}>{variants.length?variants.map((item,i)=><div className="cc-power-stock" key={item.sku+":"+i}
              title={item.quantity+" "+unit+" · BBD "+formatPrice(item.priceBbd)+" / "+priceUnit+" · SKU "+item.sku}>
              <strong>{item.quantity.toLocaleString()}</strong><small>BBD {formatPrice(item.priceBbd)}</small></div>):<span className="cc-no-stock" aria-label="No stock">—</span>}</td>;
          })}</tr>)}</tbody></table>
      </div></div>)}
  </section>;
}
