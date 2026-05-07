import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeaturedBlogPosts } from "@/hooks/useBlogPosts";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { Link } from "react-router";

const BlogCarousel = () => {
  const { data: posts = [], isLoading, isError } = useFeaturedBlogPosts();

  if (!isLoading && !isError && posts.length === 0) return null;
  if (isError) return null;

  return (
    <section className="bg-muted/30 py-16 sm:py-24" aria-label="Latest blog posts">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mb-12 flex flex-col items-center justify-between gap-4 text-center sm:mb-16 md:flex-row md:text-left">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
              From Our Blog
            </h2>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Insights, guides, and news for optical professionals.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link to="/blog">
              View All Posts
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="relative px-10">
            <Carousel
              opts={{ align: "start", loop: false }}
              className="w-full"
            >
              <CarouselContent className="-ml-6">
                {posts.map((post) => (
                  <CarouselItem
                    key={post.id}
                    className="pl-6 sm:basis-1/2 lg:basis-1/3"
                  >
                    <Link
                      to={`/blog/${post.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-shadow hover:shadow-md"
                      aria-label={post.title}
                    >
                      <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt={post.cover_image_alt ?? post.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-3 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          {post.category && (
                            <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                              {post.category}
                            </span>
                          )}
                          {post.published_at && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(post.published_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>

                        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-accent">
                          {post.title}
                        </h3>

                        {post.excerpt && (
                          <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">
                            {post.excerpt}
                          </p>
                        )}

                        <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-accent">
                          Read more
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0" />
              <CarouselNext className="right-0" />
            </Carousel>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogCarousel;
