import { AtSign, Download, ExternalLink, Globe2, MessageCircle, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { StaffPublicCard } from "@/features/staff-cards/staffPublicCards";
import { downloadPublicCardVCard, whatsappUrl } from "@/features/staff-cards/staffPublicCards";

const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

export const StaffPublicCardView = ({ card, publicUrl, showContactDownload = true }: {
  card: StaffPublicCard;
  publicUrl: string;
  showContactDownload?: boolean;
}) => {
  const whatsapp = card.whatsapp_phone ? whatsappUrl(card.whatsapp_phone) : null;
  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
      <div className="bg-[linear-gradient(135deg,#0b1e35,#125a69)] px-6 pb-16 pt-8 text-white sm:px-9">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 border-4 border-white/25 bg-white/10 sm:h-24 sm:w-24">
            <AvatarImage src={card.avatar_url || undefined} alt="" />
            <AvatarFallback className="bg-white/15 text-lg font-bold text-white">{initials(card.display_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 pt-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#efb53a]">Classic Visions</p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl">{card.display_name}</h1>
            {card.title ? <p className="mt-1 text-sm text-white/80">{card.title}</p> : null}
            {card.organization_name ? <p className="mt-1 text-sm text-white/65">{card.organization_name}</p> : null}
          </div>
        </div>
      </div>
      <div className="space-y-6 px-6 pb-7 pt-6 sm:px-9">
        {card.bio ? <p className="text-sm leading-6 text-muted-foreground">{card.bio}</p> : null}
        {card.skills.length ? (
          <div className="flex flex-wrap gap-2" aria-label="Skills">
            {card.skills.map((skill) => <span key={skill} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{skill}</span>)}
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {card.email ? <Button asChild variant="outline" className="justify-start"><a href={`mailto:${card.email}`}><AtSign className="mr-2 h-4 w-4" />Email {card.display_name.split(" ")[0]}</a></Button> : null}
          {whatsapp ? <Button asChild variant="outline" className="justify-start"><a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button> : null}
          {card.phone ? <Button asChild variant="outline" className="justify-start"><a href={`tel:${card.phone}`}><Phone className="mr-2 h-4 w-4" />Call</a></Button> : null}
          {card.linkedin_url ? <Button asChild variant="outline" className="justify-start"><a href={card.linkedin_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />LinkedIn</a></Button> : null}
          {card.website_url ? <Button asChild variant="outline" className="justify-start"><a href={card.website_url} target="_blank" rel="noopener noreferrer"><Globe2 className="mr-2 h-4 w-4" />Website</a></Button> : null}
        </div>
        {showContactDownload ? <Button className="w-full" onClick={() => downloadPublicCardVCard(card, publicUrl)}><Download className="mr-2 h-4 w-4" />Save contact</Button> : null}
      </div>
    </article>
  );
};
