import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { stockVision, type StockLensIdentity } from './stockOrderModel';

interface LensRow { id: string; material_id: string | null; mftype_id: string | null; lenstype_id: string | null; finishtype_id: string | null }
interface RefRow { id: string; name: string }

/** Only display identities are read. Account catalog membership and prices stay authoritative. */
export function useStockLensIdentities(accountId: number | null, ids: string[]) {
  return useQuery<StockLensIdentity[]>({
    queryKey: ['stock-lens-identities', accountId, [...ids].sort()], enabled: accountId != null && ids.length > 0,
    queryFn: async () => {
      const batches: string[][] = [];
      for (let i = 0; i < ids.length; i += 100) batches.push(ids.slice(i, i + 100));
      const [lensBatches, linksBatches, ...refs] = await Promise.all([
        Promise.all(batches.map(async batch => {
          const { data, error } = await supabase.rpc('get_lenses_safe').select('id,material_id,mftype_id,lenstype_id,finishtype_id').in('id', batch);
          if (error) throw error; return (data ?? []) as LensRow[];
        })),
        Promise.all(batches.map(async batch => {
          const { data, error } = await supabase.from('lens_lens_options').select('lens_id,lens_option_id').in('lens_id', batch);
          if (error) throw error; return data ?? [];
        })),
        ...(['materials', 'mftypes', 'lenstypes', 'finishtypes', 'lens_options'] as const).map(async table => {
          const { data, error } = await supabase.from(table).select('id,name');
          if (error) throw error; return new Map((data as RefRow[] ?? []).map(r => [r.id, r.name]));
        }),
      ]);
      const [materials, visions, designs, finishes, options] = refs;
      const links = linksBatches.flat();
      return lensBatches.flat().map(l => ({
        productId: l.id,
        material: materials.get(l.material_id ?? '') ?? 'Material not configured',
        design: designs.get(l.lenstype_id ?? '') ?? 'Design not configured',
        // Linked options describe this exact product, not separately priced modifiers.
        option: [...new Set(links.filter(x => x.lens_id === l.id).map(x => options.get(x.lens_option_id)).filter(Boolean))].sort().join(' / ') || 'Standard (as listed)',
        vision: stockVision(visions.get(l.mftype_id ?? '') ?? ''),
        finish: finishes.get(l.finishtype_id ?? '') ?? '',
      }));
    }, staleTime: 60_000,
  });
}
