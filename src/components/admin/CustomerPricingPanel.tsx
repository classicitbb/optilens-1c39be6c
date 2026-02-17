import { useCustomerPricingAccess } from "@/hooks/useCustomerPricingAccess";
import { usePricingSheets } from "@/hooks/usePricingSheets";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: string;
}

const CustomerPricingPanel = ({ userId }: Props) => {
  const { access, assign, remove } = useCustomerPricingAccess(userId);
  const { data: sheets = [] } = usePricingSheets();
  const { toast } = useToast();

  const assignedIds = new Set(access.map((a) => a.pricing_sheet_id));

  const handleToggle = (sheetId: string, checked: boolean) => {
    if (checked) {
      assign.mutate(
        { userId, sheetId },
        { onError: () => toast({ title: "Error", description: "Failed to assign pricelist", variant: "destructive" }) }
      );
    } else {
      const entry = access.find((a) => a.pricing_sheet_id === sheetId);
      if (entry) {
        remove.mutate(entry.id, {
          onError: () => toast({ title: "Error", description: "Failed to remove pricelist", variant: "destructive" }),
        });
      }
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium" style={{ color: "hsl(215 30% 15%)" }}>
        Assign Pricelists for this Customer
      </p>
      {sheets.length === 0 ? (
        <p className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>No pricing sheets available.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {sheets.map((sheet) => (
            <label key={sheet.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox
                checked={assignedIds.has(sheet.id)}
                onCheckedChange={(v) => handleToggle(sheet.id, !!v)}
              />
              <span style={{ color: "hsl(215 30% 15%)" }}>{sheet.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerPricingPanel;
