import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";
import { useAdminBodyClass } from "@/hooks/useAdminBodyClass";
import { useScrollingClass } from "@/hooks/useScrollingClass";
import AtlasWorkspace from "./AtlasWorkspace";
import { ATLAS_CONFIG, atlasPath } from "./config";
import { useAtlasCapabilities } from "./hooks/useAtlas";
import { getAtlasHost } from "./host";
import { useStandaloneDisplay } from "./hooks/useStandaloneDisplay";
import { getAtlasSpace, listAtlasSpaces } from "./spaces";

const MANIFEST_ID = "atlas-manifest";

/**
 * Atlas is installable: its manifest is linked only while an Atlas route is mounted, and a minimal
 * service worker (app shell only, scoped to /atlas/) is registered. Registration failures are
 * ignored: the app works the same without it.
 */
const useAtlasInstall = () => {
  useEffect(() => {
    let link: HTMLLinkElement | null = null;
    if (!document.getElementById(MANIFEST_ID)) {
      link = document.createElement("link");
      link.id = MANIFEST_ID;
      link.rel = "manifest";
      link.href = `${ATLAS_CONFIG.basePath}.webmanifest`;
      document.head.appendChild(link);
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${ATLAS_CONFIG.basePath}-sw.js`, { scope: `${ATLAS_CONFIG.basePath}/` }).catch(() => undefined);
    }
    return () => link?.remove();
  }, []);
};

const AtlasGate = () => {
  const { space: spaceParam, articleSlug } = useParams<{ space?: string; articleSlug?: string }>();
  const { bySpace, permissionsReady } = useAtlasCapabilities();
  const space = getAtlasSpace(spaceParam);

  if (!permissionsReady) return <p className="p-6 text-[14px] text-ws-ink-3">Loading…</p>;

  const readable = listAtlasSpaces().filter((candidate) => bySpace[candidate.id]?.view);
  if (readable.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm space-y-2 text-center">
          <h1 className="ws-h1">No access</h1>
          <p className="ws-body text-ws-ink-2">Your role does not include any {ATLAS_CONFIG.productName} spaces. Ask an administrator to grant access.</p>
        </div>
      </div>
    );
  }

  if (!space || !bySpace[space.id]?.view) {
    const fallback = readable.find((candidate) => candidate.id === ATLAS_CONFIG.defaultSpaceId) ?? readable[0];
    return <Navigate to={atlasPath(fallback.id)} replace />;
  }

  return <AtlasWorkspace key={space.id} space={space} articleSlug={articleSlug} />;
};

/** The standalone, full-screen Atlas app: no admin chrome, its own theme scope and permission context. */
const Passthrough = ({ children }: { children: ReactNode }) => <>{children}</>;

const AtlasApp = () => {
  useAdminBodyClass();
  useScrollingClass();
  useAtlasInstall();
  // In a browser tab the host's chrome (site header, launcher, search, profile, help) frames Atlas;
  // as an installed window Atlas is the whole window and the chrome is skipped.
  const standalone = useStandaloneDisplay();
  const Frame = standalone ? Passthrough : (getAtlasHost().Frame ?? Passthrough);
  return (
    <AdminRoleProvider>
      <div className="admin-tool flex h-screen w-full flex-col overflow-hidden rounded-none">
        <Frame>
          <main className="admin-content h-full min-h-0 w-full flex-1 overflow-hidden p-0">
            <AtlasGate />
          </main>
        </Frame>
      </div>
    </AdminRoleProvider>
  );
};

export default AtlasApp;
