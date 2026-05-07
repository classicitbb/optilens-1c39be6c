import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  BlogEntryType,
  BlogPost,
  BlogPostStatus,
  useAdminBlogPosts,
} from "@/hooks/useBlogPosts";
import {
  Eye,
  EyeOff,
  Globe2,
  ImagePlus,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSearchParams } from "react-router";

const RichTextEditor = lazy(() => import("@/components/admin/RichTextEditor"));

type BlogPostDraft = Partial<BlogPost>;

const STATUS_OPTIONS: { value: BlogPostStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const ENTRY_TYPE_OPTIONS: { value: BlogEntryType; label: string }[] = [
  { value: "blog_post", label: "Blog Post" },
  { value: "newsletter", label: "Newsletter" },
];

const formatDateTimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
};

const toIsoDateTime = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const asTagString = (value?: string[] | null) => (value ?? []).join(", ");

const fromTagString = (value: string) =>
  [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))];

const buildNewDraft = (): BlogPostDraft => ({
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  body_json: null,
  cover_image_url: "",
  cover_image_alt: "",
  author_name: "",
  published_at: null,
  category: "",
  tags: [],
  related_post_slugs: [],
  seo_title: "",
  seo_description: "",
  source_url: "",
  status: "draft",
  entry_type: "blog_post",
  is_featured: false,
});

const BlogPostsManager = ({
  canEdit,
  isAdmin,
}: {
  canEdit: boolean;
  isAdmin: boolean;
}) => {
  const { toast } = useToast();
  const { posts, upsertBlogPost, deleteBlogPost, seedBlogPosts, isSaving, isSeeding } =
    useAdminBlogPosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState<BlogPostDraft | null>(null);
  const [tagInput, setTagInput] = useState("");
  const requestedBlogId = searchParams.get("blogId");

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return posts;
    const lower = searchTerm.trim().toLowerCase();
    return posts.filter((post) =>
      [
        post.title,
        post.slug,
        post.excerpt,
        post.author_name,
        post.category,
        ...(post.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(lower),
    );
  }, [posts, searchTerm]);

  const grouped = useMemo(() => {
    const map = new Map<string, BlogPost[]>();
    for (const post of filtered) {
      const key =
        post.entry_type === "newsletter"
          ? "Newsletters"
          : post.category?.trim() || "Uncategorized";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(post);
    }
    return map;
  }, [filtered]);

  const relatedCandidates = useMemo(
    () =>
      posts.filter((post) => post.id !== editing?.id).sort((left, right) => left.title.localeCompare(right.title)),
    [editing?.id, posts],
  );

  const openNewPost = () => {
    const draft = buildNewDraft();
    setEditing(draft);
    setTagInput("");
  };

  const openEditPost = (post: BlogPost) => {
    setEditing({ ...post });
    setTagInput(asTagString(post.tags));
  };

  useEffect(() => {
    if (!requestedBlogId || editing) return;
    const match = posts.find((post) => post.id === requestedBlogId);
    if (!match) return;
    openEditPost(match);
    const next = new URLSearchParams(searchParams);
    next.delete("blogId");
    setSearchParams(next, { replace: true });
  }, [editing, posts, requestedBlogId, searchParams, setSearchParams]);

  const handleSave = async () => {
    if (!editing?.title?.trim()) return;

    try {
      await upsertBlogPost({
        id: editing.id,
        title: editing.title.trim(),
        slug: editing.slug?.trim() || null,
        excerpt: editing.excerpt?.trim() || null,
        content: editing.content || "",
        body_json: null,
        cover_image_url: editing.cover_image_url?.trim() || null,
        cover_image_alt: editing.cover_image_alt?.trim() || null,
        author_name: editing.author_name?.trim() || null,
        published_at: editing.published_at ?? null,
        category: editing.category?.trim() || null,
        tags: fromTagString(tagInput),
        related_post_slugs: editing.related_post_slugs ?? [],
        seo_title: editing.seo_title?.trim() || null,
        seo_description: editing.seo_description?.trim() || null,
        source_url: editing.source_url?.trim() || null,
        status: (editing.status ?? "draft") as BlogPostStatus,
        entry_type: (editing.entry_type ?? "blog_post") as BlogEntryType,
        is_featured: editing.is_featured ?? false,
      });
      toast({ title: editing.id ? "Blog entry updated" : "Blog entry created" });
      setEditing(null);
      setTagInput("");
    } catch {
      toast({ title: "Could not save blog entry", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this blog entry permanently?")) return;
    try {
      await deleteBlogPost(id);
      toast({ title: "Blog entry deleted" });
    } catch {
      toast({ title: "Could not delete blog entry", variant: "destructive" });
    }
  };

  const handleImportDrafts = async () => {
    try {
      const count = await seedBlogPosts();
      toast({ title: "Legacy drafts imported", description: `${count ?? 0} Classic Visions posts are now available in Blog Posts.` });
    } catch {
      toast({ title: "Could not import drafts", variant: "destructive" });
    }
  };

  if (editing) {
    const selectedRelated = new Set(editing.related_post_slugs ?? []);

    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              {editing.id ? "Edit Blog Entry" : "New Blog Entry"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Editable slugs, metadata, related posts, cover media, and rich article body.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(null)}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <ScrollArea className="flex-1 bg-background">
          <div className="mx-auto max-w-5xl space-y-5 p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Title *</label>
                    <Input
                      value={editing.title || ""}
                      onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Manual slug</label>
                    <Input
                      value={editing.slug || ""}
                      onChange={(event) => setEditing({ ...editing, slug: event.target.value })}
                      className="h-9 text-sm"
                      placeholder="editable-url-slug"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Excerpt</label>
                  <Textarea
                    value={editing.excerpt || ""}
                    onChange={(event) => setEditing({ ...editing, excerpt: event.target.value })}
                    className="min-h-[86px] text-sm"
                    placeholder="Summary used on cards, search, and article intros"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Cover image URL</label>
                    <Input
                      value={editing.cover_image_url || ""}
                      onChange={(event) => setEditing({ ...editing, cover_image_url: event.target.value })}
                      className="h-9 text-sm"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Cover image alt</label>
                    <Input
                      value={editing.cover_image_alt || ""}
                      onChange={(event) => setEditing({ ...editing, cover_image_alt: event.target.value })}
                      className="h-9 text-sm"
                      placeholder="Describe the cover image"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Author</label>
                    <Input
                      value={editing.author_name || ""}
                      onChange={(event) => setEditing({ ...editing, author_name: event.target.value })}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Publish date</label>
                    <Input
                      type="datetime-local"
                      value={formatDateTimeLocal(editing.published_at)}
                      onChange={(event) => setEditing({ ...editing, published_at: toIsoDateTime(event.target.value) })}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Status</label>
                    <Select
                      value={(editing.status ?? "draft") as BlogPostStatus}
                      onValueChange={(value) => setEditing({ ...editing, status: value as BlogPostStatus })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Entry type</label>
                    <Select
                      value={(editing.entry_type ?? "blog_post") as BlogEntryType}
                      onValueChange={(value) => setEditing({ ...editing, entry_type: value as BlogEntryType })}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTRY_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Category</label>
                    <Input
                      value={editing.category || ""}
                      onChange={(event) => setEditing({ ...editing, category: event.target.value })}
                      className="h-9 text-sm"
                      placeholder="Eyecare, Lens Education, Community, etc."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Tags</label>
                    <Input
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      className="h-9 text-sm"
                      placeholder="caribbean optics, lens care, community"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Body content</label>
                  <Suspense fallback={<div className="h-[420px] animate-pulse rounded-lg border border-border bg-muted/20" />}>
                    <RichTextEditor
                      content={editing.content || ""}
                      onChange={(html) => setEditing({ ...editing, content: html })}
                      placeholder="Write the article body..."
                      minHeight="420px"
                    />
                  </Suspense>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Publishing
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={editing.status === "published" ? "secondary" : "outline"}>
                      {editing.status === "published" ? (
                        <Eye className="mr-1 h-3 w-3" />
                      ) : (
                        <EyeOff className="mr-1 h-3 w-3" />
                      )}
                      {(editing.status ?? "draft").replace(/^\w/, (match) => match.toUpperCase())}
                    </Badge>
                    <Badge variant="outline">
                      <Globe2 className="mr-1 h-3 w-3" />
                      {(editing.entry_type ?? "blog_post") === "newsletter" ? "Newsletter" : "Blog Post"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-foreground">Feature on home page</p>
                      <p className="text-xs text-muted-foreground">Shows in the blog carousel</p>
                    </div>
                    <Switch
                      checked={editing.is_featured ?? false}
                      onCheckedChange={(checked) => setEditing({ ...editing, is_featured: checked })}
                    />
                  </div>
                  {editing.is_featured && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
                      <Star className="h-3 w-3 fill-accent" />
                      This post will appear in the home page carousel
                    </div>
                  )}
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Published entries appear on `/blog`. Published blog posts can also surface from Knowledge Base without duplicating the canonical article route.
                  </p>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">SEO title</label>
                  <Input
                    value={editing.seo_title || ""}
                    onChange={(event) => setEditing({ ...editing, seo_title: event.target.value })}
                    className="h-9 text-sm"
                    placeholder="Optional override for the browser title"
                  />
                  <label className="mb-3 mt-3 block text-[11px] font-medium text-muted-foreground">SEO description</label>
                  <Textarea
                    value={editing.seo_description || ""}
                    onChange={(event) => setEditing({ ...editing, seo_description: event.target.value })}
                    className="min-h-[92px] text-sm"
                    placeholder="Search-friendly meta description"
                  />
                </div>

                <div className="rounded-xl border border-border p-4">
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Source URL</label>
                  <Input
                    value={editing.source_url || ""}
                    onChange={(event) => setEditing({ ...editing, source_url: event.target.value })}
                    className="h-9 text-sm"
                    placeholder="Original source article URL"
                  />
                  <div className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ImagePlus className="h-3.5 w-3.5" />
                      Images in the article body are preserved by the editor, so migrated layouts remain editable instead of collapsing to plain text.
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">Related posts</p>
                      <p className="text-xs text-muted-foreground">Shown on article detail pages</p>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          Select posts
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-2" align="end">
                        <div className="max-h-72 space-y-1 overflow-y-auto">
                          {relatedCandidates.map((candidate) => {
                            const checked = selectedRelated.has(candidate.slug || "");
                            return (
                              <label
                                key={candidate.id}
                                className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(next) => {
                                    const current = new Set(editing.related_post_slugs ?? []);
                                    if (next && candidate.slug) {
                                      current.add(candidate.slug);
                                    } else if (candidate.slug) {
                                      current.delete(candidate.slug);
                                    }
                                    setEditing({ ...editing, related_post_slugs: Array.from(current) });
                                  }}
                                />
                                <div>
                                  <p className="text-sm font-medium text-foreground">{candidate.title}</p>
                                  <p className="text-xs text-muted-foreground">{candidate.category || "Uncategorized"}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(editing.related_post_slugs ?? []).length > 0 ? (
                      (editing.related_post_slugs ?? []).map((slug) => (
                        <Badge key={slug} variant="secondary" className="text-[10px]">
                          {posts.find((post) => post.slug === slug)?.title ?? slug}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No related posts selected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={isSaving}>
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Saving..." : "Save Blog Entry"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Blog Posts</h2>
            <p className="text-xs text-muted-foreground">
              Editorial posts and future newsletters, managed in one CMS workflow.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleImportDrafts} disabled={isSeeding}>
                <Sparkles className="h-3.5 w-3.5" />
                {isSeeding ? "Importing..." : "Import Legacy Drafts"}
              </Button>
            )}
            {canEdit && (
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openNewPost}>
                <Plus className="h-3.5 w-3.5" />
                New Blog Entry
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-border bg-muted/10 px-4 py-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search blog entries..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {posts.length} entries in the editorial CMS
        </p>
      </div>

      <ScrollArea className="flex-1 bg-background">
        <div className="space-y-4 p-4">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No blog entries yet.</p>
              {canEdit ? (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Button size="sm" className="gap-1.5" onClick={openNewPost}>
                    <Plus className="h-3 w-3" />
                    Create entry
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleImportDrafts}>
                    <Sparkles className="h-3 w-3" />
                    Import migration drafts
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            Array.from(grouped.entries()).map(([group, groupPosts]) => (
              <div key={group}>
                <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group} <span className="text-muted-foreground/60">({groupPosts.length})</span>
                </h3>
                <div className="space-y-1.5">
                  {groupPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      {post.status === "published" ? (
                        <Eye className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[13px] font-medium text-foreground">{post.title}</p>
                          {post.is_featured && (
                            <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" aria-label="Featured" />
                          )}
                          <Badge variant="outline" className="text-[9px]">
                            {post.entry_type === "newsletter" ? "Newsletter" : "Blog Post"}
                          </Badge>
                          <Badge variant={post.status === "published" ? "secondary" : "outline"} className="text-[9px]">
                            {post.status}
                          </Badge>
                          {post.tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[9px]">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {post.slug || "No slug"} {post.author_name ? `• ${post.author_name}` : ""} {post.published_at ? `• ${new Date(post.published_at).toLocaleDateString()}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditPost(post)}>
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(post.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default BlogPostsManager;
