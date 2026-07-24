import { Navigate, useSearchParams } from "react-router";
import SmartHome from "@/components/home/SmartHome";
import Seo from "@/components/seo/Seo";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { COMPANY_CONTACT } from "@/config/companyContact";
import { shouldRedirectAuthenticatedCustomer } from "@/features/home/smartHomeActions";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Classic Visions",
  url: "https://www.classicvisions.net",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://www.classicvisions.net/knowledge?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Classic Visions",
  url: "https://www.classicvisions.net",
  logo: "https://www.classicvisions.net/favicon.ico",
  telephone: COMPANY_CONTACT.phoneDisplay,
  address: {
    "@type": "PostalAddress",
    streetAddress: COMPANY_CONTACT.streetAddress,
    addressLocality: COMPANY_CONTACT.locality,
    postalCode: COMPANY_CONTACT.postalCode,
    addressCountry: COMPANY_CONTACT.countryCode,
  },
  sameAs: [
    "https://www.facebook.com/classicvisionscb",
    "https://www.instagram.com/classicvisionscb",
    "https://www.linkedin.com/company/classic-visions/",
  ],
};

const Index = () => {
  const { user, loading } = useAuth();
  const { hasAccess: isStaff, isLoading: roleLoading } = useUserRole();
  const [searchParams] = useSearchParams();
  const publicPreview = searchParams.get("view") === "public";

  if (loading || (user && roleLoading)) {
    return <div className="min-h-screen bg-[#f8f6f1]" aria-label="Loading Classic Visions" />;
  }

  if (shouldRedirectAuthenticatedCustomer({ isSignedIn: Boolean(user), isStaff, publicPreview })) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <>
      <Seo
        title="Classic Visions | Order, Track and Find the Right Lens"
        description="Order prescription lenses, check jobs, find account pricing, get technical help, or locate a participating Caribbean optical retailer."
        canonicalPath="/"
        jsonLd={[websiteJsonLd, organizationJsonLd]}
      />
      <SmartHome />
    </>
  );
};

export default Index;
