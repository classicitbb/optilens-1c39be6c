import Footer from "@/components/Footer";
import Header from "@/components/Header";
import RetailerDirectory from "@/components/retailers/RetailerDirectory";
import Seo from "@/components/seo/Seo";
import { retailerCountries } from "@/data/retailers";

const FindARetailerPage = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Find a retailer",
    description:
      "Search Classic Visions optical retailers and ophthalmology clinics across Barbados and the wider Caribbean.",
    url: "https://www.classicvisions.net/find-a-retailer",
    about: retailerCountries.map((market) => market.name),
    hasPart: retailerCountries.map((market) => ({
      "@type": "ListItem",
      position: retailerCountries.findIndex((item) => item.slug === market.slug) + 1,
      name: market.name,
      url: `https://www.classicvisions.net/find-a-retailer#${market.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Find a retailer across Barbados and the Caribbean | Classic Visions"
        description="Search optical retailers and ophthalmology clinics across Barbados and the Caribbean, then filter by island, provider name, or care type."
        canonicalPath="/find-a-retailer"
        jsonLd={jsonLd}
      />
      <Header />
      <main className="pb-16 pt-24">
        <div className="container mx-auto max-w-7xl px-4 lg:px-8">
          <RetailerDirectory featuredMarketSlug="barbados" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FindARetailerPage;
