export type CanvasObjectType =
  | "text"
  | "image"
  | "shape_rect"
  | "shape_circle"
  | "shape_line"
  | "pricing_block"
  | "article_block"
  | "table";

export interface CanvasObject {
  id: string;
  page_id: string;
  object_type: CanvasObjectType;
  x: number;
  y: number;
  width: number;
  height: number | null;
  rotation: number;
  z_index: number;
  content: Record<string, unknown>;
  style: Record<string, unknown>;
  is_locked: boolean;
  is_visible: boolean;
  label: string | null;
}

export interface CanvasPage {
  id: string;
  catalog_template_id: number;
  page_number: number;
  page_settings: Record<string, unknown>;
}

export type PropertyTab = "style" | "content" | "arrange";

export interface EditorState {
  selectedObjectId: string | null;
  zoom: number;
  activePageId: string | null;
  activeTab: PropertyTab;
  isDragging: boolean;
  isResizing: boolean;
}
