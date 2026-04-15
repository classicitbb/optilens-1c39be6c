import fs from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";

const FEED_URL = "https://www.classicvisions.net/blog-feed.xml";
const OUTPUT_PATH = path.resolve(process.cwd(), "src/data/blogMigrationSeed.json");
const BLOG_INDEX_URLS = ["https://www.classicvisions.net/blog"];

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const inlineToHtml = (node) => {
  switch (node.type) {
    case "text":
      return escapeHtml(node.text).replaceAll("\n", "<br />");
    case "strong":
      return `<strong>${node.children.map(inlineToHtml).join("")}</strong>`;
    case "emphasis":
      return `<em>${node.children.map(inlineToHtml).join("")}</em>`;
    case "link":
      return `<a href="${escapeHtml(node.href)}">${node.children.map(inlineToHtml).join("")}</a>`;
    default:
      return "";
  }
};

const canonicalToHtml = (doc) =>
  doc.blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `<h${block.level}>${block.children.map(inlineToHtml).join("")}</h${block.level}>`;
        case "paragraph":
          return `<p>${block.children.map(inlineToHtml).join("")}</p>`;
        case "blockquote":
          return `<blockquote>${block.children.map(inlineToHtml).join("")}</blockquote>`;
        case "list": {
          const tag = block.ordered ? "ol" : "ul";
          const items = block.items.map((item) => `<li>${item.map(inlineToHtml).join("")}</li>`).join("");
          return `<${tag}>${items}</${tag}>`;
        }
        case "image":
          return `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt ?? "")}" />`;
        default:
          return "";
      }
    })
    .join("\n");

const cleanText = (value) => value.replace(/\s+/g, " ").trim();

const dedupe = (values) => [...new Set(values.filter(Boolean))];

const toIsoOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const slugFromUrl = (url) => {
  const pathname = new URL(url).pathname;
  return pathname.split("/").filter(Boolean).pop() ?? "";
};

const toImageUrl = (uri) => {
  if (!uri) return null;
  if (uri.startsWith("http")) return uri;
  return `https://static.wixstatic.com/media/${uri}`;
};

const parseInlineChildren = (node) => {
  const { Node, HTMLElement } = node.ownerDocument.defaultView;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    return text ? [{ type: "text", text }] : [];
  }

  if (!(node instanceof HTMLElement)) return [];

  const children = Array.from(node.childNodes).flatMap(parseInlineChildren);
  const tag = node.tagName.toLowerCase();

  if (tag === "strong" || tag === "b") return [{ type: "strong", children }];
  if (tag === "em" || tag === "i") return [{ type: "emphasis", children }];
  if (tag === "a") {
    const href = node.getAttribute("href") ?? "#";
    return [{ type: "link", href, children: children.length ? children : [{ type: "text", text: href }] }];
  }
  if (tag === "br") return [{ type: "text", text: "\n" }];

  return children;
};

const closestRelevantAncestor = (element, root) => {
  let current = element.parentElement;

  while (current && current !== root) {
    const tag = current.tagName.toLowerCase();
    if (["h1", "h2", "h3", "h4", "p", "blockquote", "ul", "ol", "wow-image", "img", "a"].includes(tag)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
};

const extractBody = (article, fallbackCoverImage) => {
  const richRoot = article.querySelector("[data-rce-version] .PEJjB");
  if (!richRoot) return { blocks: [] };

  const walker = article.ownerDocument.createTreeWalker(
    richRoot,
    article.ownerDocument.defaultView.NodeFilter.SHOW_ELEMENT,
  );

  const blocks = [];

  while (walker.nextNode()) {
    const element = walker.currentNode;
    const tag = element.tagName.toLowerCase();

    if (!["h1", "h2", "h3", "h4", "p", "blockquote", "ul", "ol", "wow-image", "img", "a"].includes(tag)) {
      continue;
    }

    if (closestRelevantAncestor(element, richRoot)) continue;

    if (tag === "a") {
      const href = element.getAttribute("href") ?? "";
      const text = cleanText(element.textContent ?? "");
      if (!href || !text) continue;
      if (href.includes("/blog/tags/") || href.includes("/blog/categories/") || href.includes("/profile/")) continue;
      blocks.push({
        type: "paragraph",
        children: [{ type: "link", href, children: [{ type: "text", text }] }],
      });
      continue;
    }

    if (tag === "wow-image" || tag === "img") {
      let src = tag === "img" ? element.getAttribute("src") : "";
      let alt = "";

      if (tag === "wow-image") {
        const data = element.getAttribute("data-image-info");
        const childImg = element.querySelector("img");
        alt = childImg?.getAttribute("alt") ?? "";

        if (data) {
          try {
            const parsed = JSON.parse(data);
            src = toImageUrl(parsed?.imageData?.uri) ?? src;
          } catch {
            // Ignore malformed image-info payloads.
          }
        }

        if (!src && childImg?.getAttribute("src")) {
          src = childImg.getAttribute("src");
        }
      } else {
        alt = element.getAttribute("alt") ?? "";
      }

      const normalized = src || fallbackCoverImage;
      if (normalized) {
        blocks.push({ type: "image", src: normalized, alt });
      }
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const items = Array.from(element.querySelectorAll(":scope > li"))
        .map((item) => parseInlineChildren(item))
        .filter((item) => item.some((child) => child.type !== "text" || child.text.trim().length > 0));

      if (items.length > 0) {
        blocks.push({ type: "list", ordered: tag === "ol", items });
      }
      continue;
    }

    const children = Array.from(element.childNodes).flatMap(parseInlineChildren);
    const text = cleanText(element.textContent ?? "");
    if (!text && children.length === 0) continue;

    if (tag === "blockquote") {
      blocks.push({ type: "blockquote", children: children.length ? children : [{ type: "text", text }] });
      continue;
    }

    if (tag.startsWith("h")) {
      blocks.push({
        type: "heading",
        level: Number(tag[1]),
        children: children.length ? children : [{ type: "text", text }],
      });
      continue;
    }

    blocks.push({ type: "paragraph", children: children.length ? children : [{ type: "text", text }] });
  }

  const filteredBlocks = blocks.filter((block, index) => {
    if (block.type === "image") {
      return Boolean(block.src?.trim());
    }

    if (block.type === "paragraph" || block.type === "blockquote" || block.type === "heading") {
      const text = cleanText(block.children.map((child) => ("text" in child ? child.text : child.children.map((nested) => nested.text ?? "").join(""))).join(" "));
      if (!text) return false;

      const previous = blocks[index - 1];
      if (
        previous?.type === "list" &&
        previous.items.some((item) => cleanText(item.map((child) => ("text" in child ? child.text : child.children.map((nested) => nested.text ?? "").join(""))).join("")) === text)
      ) {
        return false;
      }
    }

    return true;
  });

  return { blocks: filteredBlocks };
};

const parseFeed = async () => {
  const xml = await fetch(FEED_URL).then((response) => response.text());
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const items = Array.from(dom.window.document.querySelectorAll("item"));

  return items.map((item) => ({
    title: item.querySelector("title")?.textContent?.trim() ?? "",
    description: item.querySelector("description")?.textContent?.trim() ?? "",
    link: item.querySelector("link")?.textContent?.trim() ?? "",
    guid: item.querySelector("guid")?.textContent?.trim() ?? "",
    pubDate: item.querySelector("pubDate")?.textContent?.trim() ?? "",
    creator: item.querySelector("creator, dc\\:creator")?.textContent?.trim() ?? "",
    categories: dedupe(Array.from(item.querySelectorAll("category")).map((node) => node.textContent?.trim() ?? "")),
    enclosure: item.querySelector("enclosure")?.getAttribute("url") ?? null,
  }));
};

const parseIndexSlugs = async () => {
  const slugs = new Set();

  for (const url of BLOG_INDEX_URLS) {
    const html = await fetch(url).then((response) => response.text());
    const dom = new JSDOM(html);
    const postLinks = Array.from(dom.window.document.querySelectorAll('a[href*="/post/"]'));

    for (const link of postLinks) {
      const href = link.getAttribute("href");
      if (!href) continue;
      slugs.add(slugFromUrl(new URL(href, url).toString()));
    }
  }

  return [...slugs];
};

const scrapePost = async (feedItem) => {
  const pageHtml = await fetch(feedItem.link).then((response) => response.text());
  const articleMatch = [...pageHtml.matchAll(/<article[\s\S]*?<\/article>/gi)][0];
  if (!articleMatch) {
    throw new Error(`Could not find article content for ${feedItem.link}`);
  }

  const articleDom = new JSDOM(articleMatch[0]);
  const { document } = articleDom.window;
  const article = document.querySelector("article");
  if (!article) {
    throw new Error(`Could not parse article for ${feedItem.link}`);
  }

  const coverImage = feedItem.enclosure;
  const ogImage = pageHtml.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1] ?? null;
  const title = cleanText(document.querySelector("[data-hook='post-title']")?.textContent ?? feedItem.title);
  const author = cleanText(document.querySelector("[data-hook='user-name']")?.textContent ?? feedItem.creator);
  const publishedAt = document.querySelector("li.wBTynn [data-hook='time-ago']")?.getAttribute("title") ?? feedItem.pubDate;
  const updatedAt = document.querySelector("p.NfKpG_ [data-hook='time-ago']")?.getAttribute("title") ?? publishedAt;

  const tags = dedupe(
    Array.from(document.querySelectorAll("a[href*='/blog/tags/']")).map((node) => cleanText(node.textContent ?? "")),
  );

  const categories = dedupe([
    ...feedItem.categories,
    ...Array.from(document.querySelectorAll("a[href*='/blog/categories/']")).map((node) => cleanText(node.textContent ?? "")),
  ]);

  const canonical = extractBody(article, coverImage);
  const slug = slugFromUrl(feedItem.link);
  const excerpt = feedItem.description || cleanText(
    canonical.blocks.find((block) => block.type === "paragraph")?.children?.map((child) => ("text" in child ? child.text : "")).join(" ") ?? "",
  );

  return {
    legacy_guid: feedItem.guid,
    entry_type: "blog_post",
    status: "draft",
    title,
    slug,
    excerpt,
    cover_image_url: coverImage ?? ogImage,
    cover_image_alt: title,
    author_name: author,
    published_at: toIsoOrNull(feedItem.pubDate || publishedAt),
    updated_at: toIsoOrNull(updatedAt),
    category: categories[0] ?? "Information",
    categories,
    tags,
    seo_title: title,
    seo_description: excerpt,
    source_url: feedItem.link,
    body_json: canonical,
    body_html: canonicalToHtml(canonical),
    content: canonicalToHtml(canonical),
    related_post_slugs: [],
  };
};

const computeRelatedPosts = (posts) =>
  posts.map((post) => {
    const scored = posts
      .filter((candidate) => candidate.slug !== post.slug)
      .map((candidate) => {
        const sharedTags = candidate.tags.filter((tag) => post.tags.includes(tag)).length;
        const sharedCategories = candidate.categories.filter((category) => post.categories.includes(category)).length;
        const proximityBonus = candidate.published_at && post.published_at
          ? Math.max(0, 12 - Math.abs(new Date(candidate.published_at).getFullYear() - new Date(post.published_at).getFullYear()))
          : 0;
        return {
          slug: candidate.slug,
          score: sharedTags * 4 + sharedCategories * 2 + proximityBonus,
        };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => right.score - left.score || left.slug.localeCompare(right.slug))
      .slice(0, 3)
      .map((candidate) => candidate.slug);

    return {
      ...post,
      related_post_slugs: scored,
    };
  });

const main = async () => {
  const feedItems = await parseFeed();
  const allowedSlugs = await parseIndexSlugs();
  const feedBySlug = new Map(feedItems.map((item) => [slugFromUrl(item.link), item]));
  const scrapedPosts = [];

  for (const slug of allowedSlugs) {
    const item = feedBySlug.get(slug) ?? {
      title: slug,
      description: "",
      link: `https://www.classicvisions.net/post/${slug}`,
      guid: slug,
      pubDate: "",
      creator: "",
      categories: [],
      enclosure: null,
    };

    scrapedPosts.push(await scrapePost(item));
  }

  const posts = computeRelatedPosts(scrapedPosts).sort(
    (left, right) => new Date(right.published_at ?? 0).getTime() - new Date(left.published_at ?? 0).getTime(),
  );

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
  console.log(`Wrote ${posts.length} blog drafts to ${OUTPUT_PATH}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
