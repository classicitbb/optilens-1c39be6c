import { Navigate, useLocation, useParams } from "react-router";
import { atlasPath } from "./config";

/**
 * Old admin URLs redirect here, keeping the page slug and the query string (including the
 * `articleId` the site's "Edit" buttons send, which the workspace resolves to a slug).
 */
const AtlasLegacyRedirect = ({ spaceId }: { spaceId: string }) => {
  const { articleSlug } = useParams<{ articleSlug?: string }>();
  const { search } = useLocation();
  // The old Content Manager's removed wiki tab pointed at the wiki.
  const params = new URLSearchParams(search);
  const target = params.get("tab") === "wiki" ? "wiki" : spaceId;
  if (target !== spaceId) params.delete("tab");
  const query = params.toString();
  return <Navigate to={`${atlasPath(target, articleSlug)}${query ? `?${query}` : ""}`} replace />;
};

export default AtlasLegacyRedirect;
