export type ProductType = "lens" | "supply" | "addon";

export type VariantMode = "none" | "lens_grid" | "standard_options" | "service_config" | "generic_matrix";

export interface ProductVariant {
  id: string;
  product_type: ProductType;
  product_id: string;
  variant_mode: VariantMode;
  variant_key: string;
  title: string;
  display_label: string | null;
  sku: string | null;
  opc_code: string | null;
  price: number;
  stock_qty: number | null;
  low_stock_threshold: number;
  allow_backorder: boolean;
  is_active: boolean;
  sort_order: number;
  attribute_values: Record<string, string | number | boolean | null>;
  metadata: Record<string, unknown>;
}

export interface ProductVariantConfig {
  product_type: ProductType;
  product_id: string;
  variant_mode: VariantMode;
  attributes: Array<{ name: string; values: string[] }>;
  settings: Record<string, unknown>;
  sku_template?: string | null;
  opc_template?: string | null;
}
