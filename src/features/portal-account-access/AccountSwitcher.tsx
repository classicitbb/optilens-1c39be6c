import { Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useToast } from "@/hooks/use-toast";

interface AccountSwitcherProps {
  compact?: boolean;
}

const AccountSwitcher = ({ compact = false }: AccountSwitcherProps) => {
  const { activeMembership, memberships, selectAccount } = usePortalIdentity();
  const { toast } = useToast();
  const activeMemberships = memberships.filter((membership) => membership.status === "active");

  if (!activeMembership || activeMemberships.length < 2) return null;

  return (
    <Select
      value={String(activeMembership.customerId)}
      onValueChange={async (value) => {
        const customerId = Number(value);
        const next = activeMemberships.find((membership) => membership.customerId === customerId);
        if (!next || next.customerId === activeMembership.customerId) return;
        try {
          await selectAccount(next.customerId);
          toast({
            title: `Now viewing ${next.customerName}`,
            description: next.accountNumber ? `Account ${next.accountNumber}` : "Account context updated.",
          });
        } catch (error) {
          toast({
            title: "Could not switch accounts",
            description: error instanceof Error ? error.message : "Try again.",
            variant: "destructive",
          });
        }
      }}
    >
      <SelectTrigger
        className={compact ? "h-8 w-full text-xs" : "h-8 w-[240px] text-xs"}
        aria-label="Active customer account"
      >
        <Building2 className="mr-1 h-3.5 w-3.5 shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {activeMemberships.map((membership) => (
          <SelectItem key={membership.membershipId} value={String(membership.customerId)}>
            {membership.customerName}{membership.accountNumber ? ` · ${membership.accountNumber}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AccountSwitcher;
