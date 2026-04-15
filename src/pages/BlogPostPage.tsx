import BlogPostRenderer, { type BlogContentInput } from "@/components/blog/BlogPostRenderer";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/seo/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicBlogPostBySlug, usePublicBlogPosts } from "@/hooks/useBlogPosts";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router";

const formatPublishDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "Draft";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = usePublicBlogPostBySlug(slug);
  const { data: allPosts = [] } = usePublicBlogPosts("blog_post");

  const relatedPosts = useMemo(() => {
    if (!post) return [];

    const explicit = (post.related_post_slugs ?? [])
      .map((relatedSlug) => allPosts.find((candidate) => candidate.slug === relatedSlug))
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

    if (explicit.length >= 3) return explicit.slice(0, 3);

    const fallback = allPosts
      .filter((candidate) => candidate.slug !== post.slug)
      .map((candidate) => {
        const sharedTags = (candidate.tags ?? []).filter((tag) => (post.tags ?? []).includes(tag)).length;
        const sharedCategory = candidate.category && candidate.category === post.category ? 1 : 0;
        return { candidate, score: sharedTags * 3 + sharedCategory };
      })
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.candidate.title.localeCompare(right.candidate.title))
      .map((item) => item.candidate);

    return [...explicit, ...fallback].filter((candidate, index, array) => array.findIndex((item) => item.id === candidate.id) === index).slice(0, 3);
  }, [allPosts, post]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={post ? `${post.seo_title || post.title} | Classic Visions` : "Blog | Classic Visions"}
        description={post?.seo_description || post?.excerpt || "Classic Visions editorial blog post"}
        canonicalPath={post?.slug ? `/blog/${post.slug}` : "/blog"}
      />
      <Header />

      <main id="main-content" className="pb-16 pt-20">
        <div className="container mx-auto px-4 lg:px-8">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-20 w-full max-w-4xl" />
              <Skeleton className="h-[28rem] rounded-[1.75rem]" />
            </div>
          ) : !post ? (
            <Card className="border-dashed border-border/70">
              <CardContent className="px-6 py-16 text-center">
                <h1 className="text-2xl font-semibold text-foreground">Article not found</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This story is unavailable or has not been published yet.
                </p>
                <Button className="mt-5" asChild>
                  <Link to="/blog">
                    <ArrowLeft className="h-4 w-4" />
                    Back to blog
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <article className="mt-3 overflow-hidden rounded-[2rem] border border-border/60 bg-card/90">
                <div className="bg-[radial-gradient(circle_at_top_left,rgba(231,179,24,0.16),transparent_26%),radial-gradient(circle_at_top_right,rgba(42,94,139,0.14),transparent_28%)] px-6 py-5 sm:px-8 sm:py-6">
                  <div className="max-w-4xl">
                    <Link to="/blog" className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to blog
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{post.category || "Blog Post"}</Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatPublishDate(post.published_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">{post.author_name || "Classic Visions"}</span>
                    </div>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                      {post.title}
                    </h1>
                    {post.excerpt ? (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {post.excerpt}
                      </p>
                    ) : null}
                    {(post.tags ?? []).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(post.tags ?? []).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>


                <div className="grid gap-8 px-6 py-10 sm:px-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="min-w-0">
                    <div className="mx-auto max-w-3xl">
                      <BlogPostRenderer
                        content={(post.body_json as BlogContentInput) || post.content}
                        className="text-base"
                        emptyMessage="This article has no content yet."
                      />
                    </div>
                  </div>

                  <aside className="space-y-5">
                    <Card className="border-border/60 bg-card/90">
                      <CardContent className="p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          Continue exploring
                        </p>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          Browse more blog stories or move into the Knowledge Base for product explainers and support content.
                        </p>
                        <div className="mt-4 space-y-2">
                          <Button className="w-full" asChild>
                            <Link to="/blog">Browse all blog posts</Link>
                          </Button>
                          <Button variant="outline" className="w-full" asChild>
                            <Link to="/knowledge">Open Knowledge Base</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {(post.tags ?? []).length > 0 ? (
                      <Card className="border-border/60 bg-card/90">
                        <CardContent className="p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            Tags
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(post.tags ?? []).map((tag) => (
                              <Badge key={tag} variant="secondary">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </aside>
                </div>
              </article>

              {relatedPosts.length > 0 ? (
                <section className="mt-8">
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      Related stories
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-foreground">More from the newsroom</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {relatedPosts.map((related) => (
                      <Link key={related.id} to={`/blog/${related.slug}`} className="group">
                        <Card className="h-full overflow-hidden border-border/60 bg-card/90 transition-colors group-hover:bg-muted/30">
                          {related.cover_image_url ? (
                            <div className="aspect-[16/10] overflow-hidden bg-muted">
                              <img
                                src={related.cover_image_url}
                                alt={related.cover_image_alt || related.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              />
                            </div>
                          ) : null}
                          <CardContent className="p-5">
                            <Badge variant="outline">{related.category || "Article"}</Badge>
                            <h3 className="mt-4 text-xl font-semibold text-foreground">{related.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{related.excerpt}</p>
                            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                              <span>Read article</span>
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPostPage;
