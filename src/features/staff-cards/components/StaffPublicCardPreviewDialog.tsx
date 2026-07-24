import { useQuery } from "@tanstack/react-query";
import { Loader2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StaffPublicCardView } from "@/features/staff-cards/components/StaffPublicCardView";
import { fetchStaffPublicCard, getPublicCardUrl } from "@/features/staff-cards/staffPublicCards";

export const StaffPublicCardPreviewDialog = ({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (open: boolean) => void; userId: string }) => {
  const cardQuery = useQuery({ queryKey: ["staff-public-card", userId], enabled: open && Boolean(userId), queryFn: () => fetchStaffPublicCard(userId) });
  const card = cardQuery.data;
  const url = card ? getPublicCardUrl(card.slug) : "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Networking card preview</DialogTitle><DialogDescription>{card?.is_published ? "This is the public card visitors receive after scanning." : "Draft preview — publish it before sharing this QR code."}</DialogDescription></DialogHeader>
        {cardQuery.isLoading ? <div className="grid min-h-64 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : card ? <div className="space-y-5"><StaffPublicCardView card={card} publicUrl={url} /><div className="flex flex-col items-center rounded-2xl border bg-white p-5"><QRCodeSVG value={url} size={180} includeMargin /><p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><QrCode className="h-3.5 w-3.5" />{url}</p></div></div> : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No networking card has been configured yet. Use the ID-card action to create one.</p>}
      </DialogContent>
    </Dialog>
  );
};
