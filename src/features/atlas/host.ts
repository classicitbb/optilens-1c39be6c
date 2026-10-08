import type { ComponentType, LazyExoticComponent, ReactNode } from "react";
import type { AtlasPage } from "./source/types";
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

/** One piece of evidence handed to Iris: the open page, a selection, or a search hit. */
export interface IrisEvidence {
  id: string;
  title: string;
  /** Where the source opens (an Atlas path), used for citation chips. */
  path: string;
  text: string;
}

export interface IrisAskInput {
  question: string;
  evidence: IrisEvidence[];
  /** Earlier turns, oldest first. */
  conversation: { role: "user" | "assistant"; text: string }[];
  route: string;
  onDelta?: (partial: string) => void;
}

export interface IrisAnswer {
  text: string;
  citations: { id: string; title: string; path: string }[];
}

/** The host's assistant. Atlas never talks to a model itself: it asks this and shows a proposal. */
export interface AtlasIrisProvider {
  /** Resolves null when the assistant is unreachable or returns nothing. */
  ask(input: IrisAskInput): Promise<IrisAnswer | null>;
}

export interface AtlasHostConfig {
  LauncherFavorite?: ComponentType<{ page: AtlasPage }>;
  /**
   * Wraps Atlas in the host app's own chrome (site header, help panel). Rendered in a normal browser
   * tab and skipped when Atlas runs as an installed window, which brings its own frame.
   */
  Frame?: ComponentType<{ children: ReactNode }>;
  /** Links back into the rest of the host app, offered in the sidebar when the Frame is not shown. */
  appLinks?: { label: string; href: string }[];
  /** The assistant behind the Iris panel. Without one the panel says it is not connected. */
  iris?: AtlasIrisProvider;
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
