// Response interfaces for Sazito API

export interface SazitoProductAttribute {
  attribute_type?: string;
  type?: string;
  name?: string;
  value?: string;
  [key: string]: any; // For dynamic keys like "سایز"
}

export interface SazitoProductVariant {
  id?: number;
  title?: string;
  enabled?: boolean;
  sku?: string;
  stock_number?: number;
  is_stock_managed?: boolean;
  dynamic_form_id?: number | null;
  price?: number;
  raw_price?: number | null;
  max_no_of_order?: number;
  has_max_order?: boolean;
  min_order_count?: number;
  weight?: number;
  sort_index?: number;
  product_attributes?: SazitoProductAttribute[];
  image_id?: number | null;
  commercial_files?: any;
  status?: string;
  created_at?: string;
  updated_at?: string;
  sold_count?: number;
  product?: any;
}

export interface SazitoProductThemeConfig {
  page?: {
    rows?: any;
  };
}

export interface SazitoProductSummary {
  sold_count?: number;
}

export interface SazitoProduct {
  id?: number;
  theme_config?: SazitoProductThemeConfig;
  enabled?: boolean;
  name?: string;
  product_type?: string;
  static_url?: boolean;
  url?: string;
  product_attributes?: SazitoProductAttribute[];
  summary?: SazitoProductSummary;
  product_variants?: SazitoProductVariant[];
  product_categories?: any[];
  tags?: string[];
  images?: any[];
  dynamic_form_id?: number | null;
  event_entity_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface SazitoCreateProductResponse {
  result?: {
    product?: SazitoProduct;
  };
  error?: string;
  error_code?: number;
  status?: number;
}

