import { BadgeDollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AssignedPricelistsSection = () => {
  const { identity } = usePortalIdentity();
  const assignedPricelistId = identity?.assignedPricelistId ?? null;
  const { data: pricelist } = useQuery({
    queryKey: ["customer-assigned-pricelist", assignedPricelistId],
    enabled: typeof assignedPricelistId === "number",
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pricelist_versions")
        .select("id,name,active,created_at,updated_at")
        .eq("id", assignedPricelistId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: number; name: string; active: boolean; created_at: string; updated_at: string } | null;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BadgeDollarSign className="h-5 w-5" />
          Assigned Pricelist
        </CardTitle>
        <CardDescription>Pricing profile assigned to your approved customer account.</CardDescription>
      </CardHeader>
      <CardContent>
        {!assignedPricelistId ? <p className="text-sm text-muted-foreground">No pricelist has been assigned yet.</p> : null}
        {assignedPricelistId && !pricelist ? <p className="text-sm text-muted-foreground">Assigned pricelist #{assignedPricelistId}</p> : null}
        {pricelist ? (
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-medium">{pricelist.name}</p>
            <p className="text-muted-foreground">Version #{pricelist.id} · {pricelist.active ? "Active" : "Inactive"}</p>
            <p className="text-muted-foreground">Updated {new Date(pricelist.updated_at).toLocaleString()}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default AssignedPricelistsSection;
