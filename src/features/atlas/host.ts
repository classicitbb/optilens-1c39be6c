import type { ComponentType, LazyExoticComponent } from "react";
import { ATLAS_CONFIG } from "./config";
import { registerAtlasSpace, type AtlasOption, type AtlasSpaceDef } from "./spaces";

/**
 * Everything business-specific that Atlas needs comes through here, registered once by the host
 * app (see `src/config/atlasHost.ts`). Atlas core never imports host vocabulary.
 */
export interface AtlasEmbedProps {
  canEdit: boolean;
  isAdmin: boolean;
}

export interface AtlasHostConfig {
  /** Hook returning the organisation display name for the sidebar header (null while loading). */
  useWorkspaceName?: () => string | null;
  /** Named option lists referenced by space properties (`optionsRef`). */
  optionSets?: Record<string, AtlasOption[]>;
  /** Contexts a page can be assigned to; `path` is where the context lives in the host app. */
  contextOptions?: { value: string; label: string; path?: string }[];
  /** Components a saved view can render in place of rows (`embed`). */
  embeds?: Record<string, LazyExoticComponent<ComponentType<AtlasEmbedProps>>>;
  /** Extra spaces (for example an imported one). */
  spaces?: AtlasSpaceDef[];
}

let host: AtlasHostConfig = {};

export const registerAtlasHost = (config: AtlasHostConfig) => {
  host = { ...host, ...config, optionSets: { ...host.optionSets, ...config.optionSets }, embeds: { ...host.embeds, ...config.embeds } };
  config.spaces?.forEach(registerAtlasSpace);
};

export const getAtlasHost = (): AtlasHostConfig => host;

export const useAtlasWorkspaceName = (): string => {
  const name = host.useWorkspaceName?.() ?? null;
  return name?.trim() || ATLAS_CONFIG.fallbackWorkspaceName;
};

export const optionSet = (ref: string): AtlasOption[] => host.optionSets?.[ref] ?? [];
