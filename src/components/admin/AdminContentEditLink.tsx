import { Link } from "react-router";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";

type AdminContentEditLinkProps =
  | {
      mode: "blog";
      blogId: string;
      className?: string;
    }
  | {
      mode: "article";
      articleId: string;
      contentType?: "knowledge" | "faq" | "legal" | "wiki";
      className?: string;
    };

const AdminContentEditLink = (props: AdminContentEditLinkProps) => {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading || !isAdmin) return null;

  const search = new URLSearchParams();

  if (props.mode === "blog") {
    search.set("tab", "blog");
    search.set("blogId", props.blogId);
  } else {
    search.set("articleId", props.articleId);
    if (props.contentType) {
      search.set("tab", props.contentType);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className={props.className ?? "h-8 gap-1.5 rounded-full border-border/70 bg-background/90 text-xs"}
    >
      <Link to={`/admin/website/content?${search.toString()}`}>
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Link>
    </Button>
  );
};

export default AdminContentEditLink;
