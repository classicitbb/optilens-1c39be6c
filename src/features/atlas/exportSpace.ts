import { canonicalToMarkdown } from "@/lib/wikiMarkdown";
import { slugifyHelpValue } from "@/lib/helpCenter";
import { toPageSlug } from "./pageTree";
import type { AtlasPage, AtlasSection } from "./source/types";

/**
 * Content must be able to leave Atlas: every page as Markdown and as canonical JSON, laid out by
 * section and parent, plus a manifest with slugs, statuses and hierarchy. Pure, so it is testable
 * and does not depend on any storage.
 */
export interface ExportFile {
  path: string;
  content: string;
}

const safe = (value: string) => slugifyHelpValue(value) || "untitled";

export const buildSpaceExport = (spaceLabel: string, pages: AtlasPage[], sections: AtlasSection[]): ExportFile[] => {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const sectionById = new Map(sections.map((section) => [section.id, section]));

  const folderOf = (page: AtlasPage): string => {
    const chain: string[] = [];
    const seen = new Set<string>([page.id]);
    let parent = page.parentId ? byId.get(page.parentId) : undefined;
    while (parent && !seen.has(parent.id)) {
      seen.add(parent.id);
      chain.unshift(safe(toPageSlug(parent)));
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    const root = chain.length > 0 ? pages.find((candidate) => safe(toPageSlug(candidate)) === chain[0]) : page;
    const section = sectionById.get((root ?? page).sectionId ?? "")?.title;
    return ["pages", section ? safe(section) : "no-section", ...chain].join("/");
  };

  const files: ExportFile[] = [];
  const manifest = pages.map((page) => {
    const slug = toPageSlug(page);
    const folder = folderOf(page);
    const base = `${folder}/${safe(slug)}`;
    const title = page.draftTitle ?? page.title;
    const doc = page.draftDoc ?? page.doc;
    files.push({ path: `${base}.md`, content: canonicalToMarkdown(title, doc) });
    files.push({ path: `${base}.json`, content: `${JSON.stringify({ title, doc }, null, 2)}\n` });
    return {
      id: page.id,
      title,
      slug,
      status: page.status,
      parentId: page.parentId,
      section: sectionById.get(page.sectionId ?? "")?.title ?? null,
      sortOrder: page.sortOrder,
      properties: page.props,
      contexts: page.contexts,
      updatedAt: page.updatedAt,
      markdown: `${base}.md`,
      canonical: `${base}.json`,
    };
  });
  files.unshift({
    path: "manifest.json",
    content: `${JSON.stringify({ space: spaceLabel, exportedAt: new Date().toISOString(), format: "atlas-export/1", pages: manifest }, null, 2)}\n`,
  });
  return files;
};

// ── Minimal ZIP (store only, no compression) ────────────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: Uint8Array) => {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

export const zipFiles = (files: ExportFile[]): Uint8Array => {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    offset += bytes.length;
  };
  for (const file of files) {
    const name = encoder.encode(file.path);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);
    push(new Uint8Array(local.buffer));
    push(name);
    push(data);
  }
  const centralStart = offset;
  for (const part of central) push(part);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, offset - centralStart, true);
  end.setUint32(16, centralStart, true);
  push(new Uint8Array(end.buffer));

  const out = new Uint8Array(offset);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
};
