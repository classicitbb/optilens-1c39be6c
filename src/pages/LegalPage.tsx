import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useParams } from "react-router-dom";
import { useLegalPage } from "@/hooks/useContentArticles";
import { Skeleton } from "@/components/ui/skeleton";

const LEGAL_FALLBACKS: Record<string, { title: string; content: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    content: `Last updated: March 2026

OptiLens Pro collects only the information needed to provide account access, order fulfillment, customer support, and quality improvements.

What we collect
- Account details such as business name, contact person, email address, and phone number
- Order and shipment records needed to process prescriptions, coatings, and deliveries
- Basic site usage and device information for performance, security, and fraud prevention

How we use your information
- To process and deliver your orders accurately
- To provide technical, order, and customer support
- To share service updates, policy notices, and account-related communications
- To improve product availability, website usability, and educational resources

How we protect your information
We use role-based access controls, secure transmission methods, and operational safeguards to limit unauthorized access to customer data.

Your choices
You may request updates to account information, request a copy of data associated with your account, or request deletion where legally permissible.

Contact
For privacy questions, contact us at info@classicvisions.net.`,
  },
  "terms-conditions": {
    title: "Terms of Use",
    content: `Last updated: March 2026

By using OptiLens Pro services, catalogs, and ordering tools, you agree to these terms.

Use of services
- You agree to provide accurate account information and keep credentials secure
- You are responsible for prescription accuracy and order verification before submission
- You may not use the platform in a way that disrupts service availability or security

Orders and fulfillment
- Product availability, turnaround times, and pricing may vary by product line and treatment
- Custom prescription and surfaced lens orders may be non-returnable unless there is a verified production defect
- Shipping windows are estimates and may vary by carrier or destination

Intellectual property
All platform content, product names, and materials are the property of their respective owners and may not be reused without permission.

Limitation of liability
To the fullest extent permitted by law, OptiLens Pro is not liable for indirect or consequential damages arising from the use of this platform.

Contact
Questions about these terms can be directed to info@classicvisions.net.`,
  },
};

const SLUG_MAP: Record<string, string> = {
  "privacy-policy": "privacy-policy",
  "terms": "terms-conditions",
  "return-policy": "return-policy",
  "disclaimer": "disclaimer",
  "cookie-policy": "cookie-policy",
};

const LegalPage = () => {
  const { slug = "" } = useParams();
  const dbSlug = SLUG_MAP[slug] || slug;
  const { data: article, isLoading } = useLegalPage(dbSlug);
  const fallback = LEGAL_FALLBACKS[dbSlug];
  const content = article?.content || fallback?.content || "";
  const title = article?.title || fallback?.title;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : title ? (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-6">{title}</h1>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                {content}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">This page is not yet available.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
