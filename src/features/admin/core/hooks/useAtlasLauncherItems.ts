import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAtlasCapabilities, useAtlasSource } from "@/features/atlas/hooks/useAtlas";
import { atlasLauncherPageId, resolveAtlasLauncherPins } from "@/lib/atlasLauncherPins";

export function useAtlasLauncherItems(routes: string[]) {
  const { user } = useAuth();
  const source = useAtlasSource();
  const { bySpace, permissionsReady } = useAtlasCapabilities();
  const visible = Object.entries(bySpace).filter(([, caps]) => caps.view).map(([id]) => id).join(",");
  const pages = useQuery({
    queryKey: ["atlas", source.id, "launcher-pages", user?.id, visible],
    queryFn: () => source.listPages(),
    enabled: !!user && permissionsReady && !!visible && routes.some((route) => atlasLauncherPageId(route)),
  });
  return resolveAtlasLauncherPins(routes, user ? pages.data?.pages ?? [] : [], (id) => !!bySpace[id]?.view);
}
