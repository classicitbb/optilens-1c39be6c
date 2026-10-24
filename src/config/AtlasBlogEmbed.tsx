import BlogPostsManager from "@/components/admin/BlogPostsManager";
import type { AtlasEmbedProps } from "@/features/atlas/host";

/** Interim seam: the blog editor renders inside the Website space until a blog adapter replaces it. */
const AtlasBlogEmbed = ({ canEdit, isAdmin }: AtlasEmbedProps) => <BlogPostsManager canEdit={canEdit} isAdmin={isAdmin} />;

export default AtlasBlogEmbed;
