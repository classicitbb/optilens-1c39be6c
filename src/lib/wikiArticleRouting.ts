interface WikiArticleRouteInput {
  id: string;
  title: string;
  slug?: string | null;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const toWikiArticleSlug = ({ id, title, slug }: WikiArticleRouteInput): string => {
  const normalizedSlug = slug ? slugify(slug) : "";
  if (normalizedSlug) return normalizedSlug;

  const base = slugify(title) || "article";
  const suffix = slugify(id).slice(0, 10) || "item";
  return `${base}-${suffix}`;
};

export const toAdminWikiArticlePath = (article: WikiArticleRouteInput): string =>
  `/admin/knowledge/wiki/${toWikiArticleSlug(article)}`;
