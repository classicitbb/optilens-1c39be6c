import { useEffect } from "react";

const BASE_URL = "https://www.classicvisions.net";

type SeoProps = {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const ensureMetaTag = (selector: string, attributes: Record<string, string>) => {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);

  if (!meta) {
    meta = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => meta?.setAttribute(key, value));
    document.head.appendChild(meta);
  }

  return meta;
};

const ensureLinkTag = (selector: string, attributes: Record<string, string>) => {
  let link = document.head.querySelector<HTMLLinkElement>(selector);

  if (!link) {
    link = document.createElement("link");
    Object.entries(attributes).forEach(([key, value]) => link?.setAttribute(key, value));
    document.head.appendChild(link);
  }

  return link;
};

const Seo = ({ title, description, canonicalPath, image = "/og-default.jpg", jsonLd }: SeoProps) => {
  useEffect(() => {
    const canonicalUrl = new URL(canonicalPath, BASE_URL).toString();
    const imageUrl = image.startsWith("http") ? image : new URL(image, BASE_URL).toString();

    document.title = title;

    ensureMetaTag('meta[name="description"]', { name: "description" }).content = description;
    ensureMetaTag('meta[property="og:title"]', { property: "og:title" }).content = title;
    ensureMetaTag('meta[property="og:description"]', { property: "og:description" }).content = description;
    ensureMetaTag('meta[property="og:type"]', { property: "og:type" }).content = "website";
    ensureMetaTag('meta[property="og:url"]', { property: "og:url" }).content = canonicalUrl;
    ensureMetaTag('meta[property="og:image"]', { property: "og:image" }).content = imageUrl;
    ensureMetaTag('meta[name="twitter:card"]', { name: "twitter:card" }).content = "summary_large_image";
    ensureMetaTag('meta[name="twitter:title"]', { name: "twitter:title" }).content = title;
    ensureMetaTag('meta[name="twitter:description"]', { name: "twitter:description" }).content = description;
    ensureMetaTag('meta[name="robots"]', { name: "robots" }).content = "index,follow";
    ensureLinkTag('link[rel="canonical"]', { rel: "canonical" }).href = canonicalUrl;

    const scriptId = "page-jsonld";
    const existingScript = document.getElementById(scriptId);
    existingScript?.remove();

    if (jsonLd) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [canonicalPath, description, image, jsonLd, title]);

  return null;
};

export default Seo;
