import { Star, StarOff } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useLauncherPins } from "@/features/admin/core/hooks/useLauncherPins";
import type { AtlasPage } from "@/features/atlas/source/types";
import { atlasLauncherRoute } from "@/lib/atlasLauncherPins";

export default function AtlasLauncherFavorite({ page }: { page: AtlasPage }) {
  const pins = useLauncherPins();
  const route = atlasLauncherRoute(page.id);
  const pinned = pins.isPinned(route);
  const Icon = pinned ? StarOff : Star;
  return <DropdownMenuItem disabled={!pins.isReady || pins.isPending} title={pins.error?.message} onSelect={() => pins.toggle(route)}>
    <Icon className="mr-2 h-3.5 w-3.5" />
    {pins.error ? "Launcher favorites unavailable" : pinned ? "Remove from launcher favorites" : "Add to launcher favorites"}
  </DropdownMenuItem>;
}
