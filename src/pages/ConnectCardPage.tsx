import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/seo/Seo";
import { StaffPublicCardView } from "@/features/staff-cards/components/StaffPublicCardView";
import { fetchPublishedStaffPublicCard, getPublicCardPath, getPublicCardUrl } from "@/features/staff-cards/staffPublicCards";

const ConnectCardPage = () => {
  const { slug = "" } = useParams();
  const cardQuery = useQuery({ queryKey: ["published-staff-public-card", slug], enabled: Boolean(slug), queryFn: () => fetchPublishedStaffPublicCard(slug) });
  const card = cardQuery.data;
  if (cardQuery.isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  if (!card) return <div className="grid min-h-screen place-items-center bg-muted px-4 text-center"><div><h1 className="text-2xl font-bold">This networking card is unavailable</h1><p className="mt-2 text-sm text-muted-foreground">It may have been unpublished or the link is incorrect.</p><Link to="/" className="mt-5 inline-block text-sm font-medium text-primary underline">Visit Classic Visions</Link></div></div>;
  const path = getPublicCardPath(card.slug);
  return (
    <div className="min-h-screen bg-muted/30">
      <Seo title={`${card.display_name} | Classic Visions`} description={card.title || `Connect with ${card.display_name} at Classic Visions.`} canonicalPath={path} image={card.avatar_url || undefined} />
      <Header />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-28 sm:px-6"><StaffPublicCardView card={card} publicUrl={getPublicCardUrl(card.slug)} /></main>
      <Footer />
    </div>
  );
};

export default ConnectCardPage;
