import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useParams } from "react-router-dom";
import { useLegalPage } from "@/hooks/useContentArticles";
import { Skeleton } from "@/components/ui/skeleton";
import BlogPostRenderer from "@/components/blog/BlogPostRenderer";

const LEGAL_FALLBACKS: Record<string, { title: string; content: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    content: `Last updated: March 2026

Classic Visions ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.

## Information We Collect

### Personal Data
We may collect personally identifiable information that you voluntarily provide, including:
- Business name, contact person, email address, and phone number
- Billing and shipping addresses
- Order history and prescription details
- Account credentials

### Automatically Collected Data
When you access our website, we automatically collect:
- IP address and browser type
- Device information and operating system
- Pages visited and time spent
- Referring website addresses

## How We Use Your Information
We use the information we collect to:
- Process and fulfill your orders accurately
- Provide customer support and respond to inquiries
- Send service updates, order confirmations, and account notifications
- Improve our website, products, and services
- Comply with legal obligations

## Legal Basis for Processing (GDPR)
Under the General Data Protection Regulation (GDPR) and UK GDPR, we process your data based on:
- **Contract Performance**: To fulfill orders and provide services
- **Legitimate Interests**: To improve our services and prevent fraud
- **Legal Obligations**: To comply with applicable laws
- **Consent**: Where you have given explicit consent

## Your Data Protection Rights
Depending on your location, you may have the following rights:
- **Right of Access**: Request copies of your personal data
- **Right to Rectification**: Request correction of inaccurate data
- **Right to Erasure**: Request deletion of your personal data
- **Right to Restrict Processing**: Request limitation of data processing
- **Right to Data Portability**: Request transfer of your data in a structured format
- **Right to Object**: Object to processing based on legitimate interests
- **Right to Withdraw Consent**: Withdraw consent at any time without affecting the lawfulness of prior processing

### CCPA/CPRA Rights (California)
If you are a California resident, you additionally have the right to:
- Know what personal information is collected and how it is used
- Request deletion of your personal information
- Opt out of the sale or sharing of personal information
- Non-discrimination for exercising your privacy rights

### Brazilian LGPD Rights
If you are located in Brazil, under the Lei Geral de Proteção de Dados (LGPD), you have the right to:
- Confirmation of data processing
- Access to your data
- Correction of incomplete or inaccurate data
- Anonymization, blocking, or deletion of unnecessary data
- Data portability

### Caribbean and Latin American Data Protection
We comply with applicable data protection laws across the Caribbean and Latin American jurisdictions where we operate, including Barbados and the wider CARICOM region.

To exercise any of these rights, contact us at info@classicvisions.net. We will respond within 30 days (or sooner if required by local law).

## International Data Transfers
If you are located outside of Barbados, your information may be transferred to and processed in countries with different data protection laws. We implement appropriate safeguards including Standard Contractual Clauses for EU/UK transfers.

## Data Retention
We retain your personal data only as long as necessary for the purposes set out in this policy, unless a longer retention period is required by law. When data is no longer needed, it is securely deleted or anonymized.

## Data Security
We implement appropriate technical and organizational measures to protect your personal data, including encryption, access controls, and secure data transmission.

## Third-Party Services
We may share your information with:
- Payment processors (for transaction processing)
- Shipping carriers (for order delivery)
- Analytics providers (for website improvement)

All third parties are required to maintain the confidentiality and security of your data and may only process it in accordance with our instructions.

## Cookies
We use cookies and similar technologies. For details, please see our [Cookie Policy](/legal/cookie-policy).

## Children's Privacy
Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.

## Data Protection Officer
For privacy inquiries, you may contact our designated privacy representative at info@classicvisions.net.

## Supervisory Authority
If you believe your data protection rights have been violated, you have the right to lodge a complaint with the relevant supervisory authority in your jurisdiction (e.g., the ICO in the UK, your national DPA in the EU).

## Changes to This Policy
We may update this Privacy Policy periodically. We will notify you of material changes by posting the updated policy on our website with a revised "Last updated" date.

## Contact Us
For privacy questions or to exercise your data rights, contact us at:
- Email: info@classicvisions.net
- Address: Regency Park, Christ Church, Barbados`,
  },
  "terms-conditions": {
    title: "Terms of Use",
    content: `Last updated: March 2026

These Terms of Use ("Terms") govern your access to and use of Classic Visions services, websites, and applications. By using our services, you agree to be bound by these Terms.

## Acceptance of Terms
By accessing or using our services, you confirm that you are at least 18 years old and have the legal capacity to enter into these Terms. If you are using our services on behalf of a business, you represent that you have authority to bind that business.

## Account Registration
- You must provide accurate and complete registration information
- You are responsible for maintaining the confidentiality of your account credentials
- You must notify us immediately of any unauthorized account access
- We reserve the right to suspend or terminate accounts that violate these Terms

## Use of Services
You agree to use our services only for lawful purposes and in accordance with these Terms. You shall not:
- Violate any applicable laws or regulations
- Interfere with or disrupt the services or servers
- Attempt to gain unauthorized access to any part of our systems
- Use automated tools to scrape or extract data without permission
- Impersonate any person or misrepresent your affiliation

## Orders and Payments
- All orders are subject to acceptance and availability
- Prices are subject to change without notice
- Payment is due at the time of order unless credit terms are established
- We reserve the right to refuse or cancel orders at our discretion

## Prescription and Custom Orders
- Custom prescription and surfaced lens orders may be non-returnable
- You are responsible for verifying prescription accuracy before submission
- Turnaround times are estimates and may vary by product and treatment

## Intellectual Property
All content, trademarks, logos, and intellectual property on our website are owned by Classic Visions or its licensors. You may not use, reproduce, or distribute any content without prior written permission.

## Limitation of Liability
TO THE FULLEST EXTENT PERMITTED BY LAW:
- Our services are provided "as is" without warranties of any kind
- We are not liable for indirect, incidental, special, or consequential damages
- Our total liability shall not exceed the amount paid by you in the preceding 12 months

## Indemnification
You agree to indemnify and hold harmless Classic Visions, its affiliates, and employees from any claims, damages, or expenses arising from your use of our services or violation of these Terms.

## Governing Law
These Terms are governed by the laws of Barbados. Any disputes shall be resolved in the courts of Barbados, without regard to conflict of law principles.

## International Users
If you access our services from outside Barbados, you are responsible for compliance with local laws. We make no representation that our services are appropriate for use in all jurisdictions.

## Severability
If any provision of these Terms is found unenforceable, the remaining provisions shall continue in full force and effect.

## Changes to Terms
We may modify these Terms at any time. Continued use of our services after changes constitutes acceptance of the modified Terms.

## Contact
Questions about these Terms can be directed to info@classicvisions.net.`,
  },
  "cookie-policy": {
    title: "Cookie Policy",
    content: `Last updated: March 2026

This Cookie Policy explains how Classic Visions ("we", "us", or "our") uses cookies and similar technologies when you visit our website.

## What Are Cookies?
Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work efficiently and provide information to website owners.

## Types of Cookies We Use

### Essential Cookies
These cookies are strictly necessary for the website to function. They enable core features such as:
- User authentication and session management
- Shopping cart functionality
- Security features and fraud prevention

You cannot opt out of essential cookies as they are required for the website to operate.

### Analytics Cookies
These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. We use this data to improve our services and user experience.

### Marketing Cookies
These cookies track your browsing activity to deliver personalized advertisements and measure campaign effectiveness. They may be set by us or third-party advertising partners.

### Functional Cookies
These cookies enable enhanced functionality and personalization, such as remembering your preferences, language settings, and display options.

## How to Manage Cookies

### Cookie Consent Banner
When you first visit our website, you will see a cookie consent banner allowing you to:
- Accept all cookies
- Reject non-essential cookies
- Customize your preferences

### Browser Settings
You can also control cookies through your browser settings:
- **Chrome**: Settings > Privacy and security > Cookies
- **Firefox**: Settings > Privacy & Security > Cookies
- **Safari**: Preferences > Privacy > Cookies
- **Edge**: Settings > Privacy, search, and services > Cookies

Note that blocking certain cookies may impact website functionality.

## Third-Party Cookies
We may use third-party services that set their own cookies, including:
- Google Analytics (analytics)
- Social media platforms (sharing features)
- Payment processors (transaction security)

These third parties have their own privacy policies governing cookie use.

## Cookie Retention
Cookies are retained for different periods depending on their purpose:
- Session cookies: Deleted when you close your browser
- Persistent cookies: Retained for up to 2 years or until deleted

## Your Rights Under GDPR
Under the EU General Data Protection Regulation (GDPR) and UK GDPR, you have the right to:
- Be informed about cookie usage (this policy)
- Give or withdraw consent for non-essential cookies
- Access information about cookies we use
- Request deletion of cookie data

## Updates to This Policy
We may update this Cookie Policy periodically. The "Last updated" date at the top indicates when changes were made.

## Contact Us
For questions about our use of cookies, contact us at info@classicvisions.net.`,
  },
  "disclaimer": {
    title: "Disclaimer",
    content: `Last updated: March 2026

## General Disclaimer

The information provided on Classic Visions website and services is for general informational purposes only. While we strive to provide accurate and up-to-date information, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the information, products, services, or related graphics.

## Professional Advice

Our website provides information about optical lenses and related products. This information is not intended to replace professional medical advice, diagnosis, or treatment. Always seek the advice of your eye care professional or other qualified health provider with any questions you may have regarding eye care or vision correction.

## Product Information

Product descriptions, specifications, and images are provided for reference purposes. Actual products may vary slightly from images shown. We reserve the right to modify product specifications without prior notice.

## Pricing

While we make every effort to ensure pricing accuracy, errors may occur. We reserve the right to correct pricing errors and cancel orders placed at incorrect prices. Prices are subject to change without notice.

## External Links

Our website may contain links to external websites. We have no control over the content, privacy policies, or practices of third-party websites and accept no responsibility for them.

## Limitation of Liability

To the fullest extent permitted by applicable law, Classic Visions shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your access to or use of our website or services.

## Indemnification

You agree to defend, indemnify, and hold harmless Classic Visions, its affiliates, officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses arising from your use of our website or violation of these terms.

## Jurisdiction

This disclaimer shall be governed by and construed in accordance with the laws of Barbados, without regard to its conflict of law provisions.

## Changes

We reserve the right to modify this disclaimer at any time. Changes will be effective immediately upon posting to the website.

## Contact

For questions regarding this disclaimer, contact us at info@classicvisions.net.`,
  },
  "accessibility": {
    title: "Accessibility Statement",
    content: `Last updated: March 2026

## Our Commitment

Classic Visions is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards to make our website accessible to all users.

## Accessibility Standards

We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. These guidelines explain how to make web content more accessible for people with disabilities, including:
- Visual impairments
- Hearing impairments
- Motor impairments
- Cognitive disabilities

## Accessibility Features

Our website includes the following accessibility features:

### Navigation
- Consistent navigation throughout the site
- Logical heading structure
- Breadcrumb navigation where applicable

### Visual Design
- Sufficient color contrast ratios
- Resizable text without loss of functionality
- Alternative text for images
- Clear focus indicators for keyboard users

### Content
- Plain language wherever possible
- Descriptive link text
- Form labels and error messages

### Technical
- Semantic HTML markup
- ARIA landmarks and labels where appropriate
- Keyboard-accessible interactive elements
- Compatible with assistive technologies

## Ongoing Efforts

We are continuously working to improve accessibility by:
- Conducting regular accessibility audits
- Training our staff on accessibility best practices
- Incorporating accessibility into our development process
- Responding to user feedback

## Known Limitations

While we strive for full accessibility, some content may have limitations:
- Some PDF documents may not be fully accessible
- Third-party content may not meet our accessibility standards
- Complex interactive features may require alternative methods

## Feedback and Assistance

We welcome your feedback on the accessibility of our website. If you encounter any barriers or need assistance, please contact us:

- **Email**: info@classicvisions.net
- **Phone**: +1 246 433-4928
- **Address**: Regency Park, Christ Church, Barbados

We aim to respond to accessibility feedback within 5 business days.

## Enforcement Procedure

If you are not satisfied with our response, you may file a complaint with the relevant accessibility enforcement body in your jurisdiction.`,
  },
  "return-policy": {
    title: "Return Policy",
    content: `Last updated: March 2026

## Overview

Classic Visions is committed to your satisfaction. This Return Policy outlines the conditions under which products may be returned or exchanged.

## Standard Returns

### Eligible Products
- Unused stock lenses in original packaging
- Frames in original, undamaged condition
- Accessories and supplies that are unopened

### Return Window
- Standard returns must be requested within 30 days of delivery
- Products must be in resalable condition

### How to Return
1. Contact us at info@classicvisions.net to request a Return Authorization (RA) number
2. Include the RA number with your return shipment
3. Ship products in secure packaging to prevent damage

## Custom and Prescription Orders

### Non-Returnable Items
The following items cannot be returned or exchanged:
- Custom-cut or surfaced prescription lenses
- Lenses with special coatings applied per order specifications
- Products made to your specific prescription

### Exceptions
Custom orders may be accepted for return only in cases of:
- Manufacturing defects verified by our quality team
- Incorrect specifications due to our error
- Damage during shipping (must be reported within 48 hours)

## Damaged or Defective Products

If you receive a damaged or defective product:
1. Report the issue within 48 hours of delivery
2. Provide photos of the damage or defect
3. We will arrange for replacement or credit at no additional cost

## Refund Processing

### Timeline
- Refunds are processed within 5–10 business days of receiving returned items
- Credit will be issued to the original payment method

### Restocking Fees
- Returns due to customer error may be subject to a 15% restocking fee
- Defective products and our errors are exempt from restocking fees

## Exchanges

For exchanges:
- Contact us to arrange the exchange before shipping
- Include the original order number and desired replacement specifications
- Price differences will be adjusted accordingly

## Shipping Costs

- Original shipping costs are non-refundable unless the return is due to our error
- Customer is responsible for return shipping costs unless the product is defective

## Contact

For return inquiries, contact us at:
- Email: info@classicvisions.net
- Phone: +1 246 433-4928`,
  },
};

const SLUG_MAP: Record<string, string> = {
  "privacy-policy": "privacy-policy",
  "terms": "terms-conditions",
  "return-policy": "return-policy",
  "disclaimer": "disclaimer",
  "cookie-policy": "cookie-policy",
  "accessibility": "accessibility",
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
              <BlogPostRenderer content={content} className="text-sm" />
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
