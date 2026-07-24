import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Loader2, Pencil, QrCode, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { StaffPublicCardEditorDialog } from "@/features/staff-cards/components/StaffPublicCardEditorDialog";
import { fetchStaffPublicCard, getPublicCardUrl, isStaffRole } from "@/features/staff-cards/staffPublicCards";
import { useToast } from "@/hooks/use-toast";

const NetworkingCardPage = () => {
  const { user } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const cardQuery = useQuery({ queryKey: ["staff-public-card", user?.id], enabled: Boolean(user?.id) && isStaffRole(role), queryFn: () => fetchStaffPublicCard(user!.id) });
  const card = cardQuery.data;
  const url = card ? getPublicCardUrl(card.slug) : "";
  const defaults = { display_name: typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user?.email?.split("@")[0], email: user?.email, avatar_url: typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined };

  if (roleLoading || cardQuery.isLoading) return <div className="grid min-h-[420px] place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isStaffRole(role)) return <Card><CardHeader><CardTitle>Networking cards are for staff</CardTitle><CardDescription>Ask an administrator if you need a public networking profile.</CardDescription></CardHeader></Card>;

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    toast({ title: "Public link copied" });
  };
  const share = async () => {
    if (navigator.share) await navigator.share({ title: `${card?.display_name} | Classic Visions`, url });
    else await copyLink();
  };

  return <>
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="rounded-2xl bg-[linear-gradient(135deg,#0b1e35,#125a69)] p-6 text-white shadow-medium sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#efb53a]">Networking</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Share my card</h1>
        <p className="mt-2 text-sm text-white/75">Open this screen at an event and let someone scan your QR code to save your details.</p>
      </section>
      {card ? <Card className="overflow-hidden"><CardContent className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-sm font-semibold">{card.is_published ? "Your card is live" : "Your card is still a draft"}</p><p className="mt-1 break-all text-sm text-muted-foreground">{url}</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={share}><Share2 className="mr-2 h-4 w-4" />Share</Button><Button variant="outline" onClick={copyLink}><Copy className="mr-2 h-4 w-4" />Copy link</Button><Button variant="outline" onClick={() => setEditorOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>{card.is_published ? <Button asChild variant="ghost"><a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open</a></Button> : null}</div>{!card.is_published ? <p className="mt-3 text-xs text-amber-700">Publish your card before sharing the QR code.</p> : null}</div><div className="rounded-2xl bg-white p-4 shadow-sm"><QRCodeSVG value={url} size={190} includeMargin title={`QR code for ${card.display_name}`} /></div></CardContent></Card> : <Card><CardHeader><CardTitle>Create your networking card</CardTitle><CardDescription>Choose the public details you are comfortable sharing, then publish when ready.</CardDescription></CardHeader><CardContent><Button onClick={() => setEditorOpen(true)}><QrCode className="mr-2 h-4 w-4" />Set up my card</Button></CardContent></Card>}
    </div>
    {user ? <StaffPublicCardEditorDialog open={editorOpen} onOpenChange={setEditorOpen} userId={user.id} defaults={defaults} /> : null}
  </>;
};

export default NetworkingCardPage;
