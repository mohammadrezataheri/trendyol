import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enums
export enum ProductType {
  SIMPLE = 'simple', // کالای فیزیکی
  DIGITAL = 'digital', // فایل
  SERVICE = 'service', // خدمت
}

export enum AttributeType {
  DIFFERENTIATOR = 'differentiator', // برای متمایز کردن ورینتها
}

// Product DTO
export class ProductDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsEnum(ProductType)
  @IsNotEmpty()
  product_type: ProductType; // Also accepts type_product for backward compatibility

  @IsOptional()
  @IsNumber()
  form_id?: number;
}

// Attribute DTO
export class AttributeDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AttributeType)
  @IsNotEmpty()
  attribute_type: AttributeType;
}

// Description Attribute DTO (for description attribute which has different structure)
export class DescriptionAttributeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

// Variant Attribute DTO (for product variants)
export class VariantAttributeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

// Product Variant DTO
export class ProductVariantDto {
  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  order_max_has?: boolean;

  @IsOptional()
  @IsNumber()
  count_order_Min?: number;

  @IsOptional()
  @IsBoolean()
  managed_stock_is?: boolean;

  @IsOptional()
  @IsNumber()
  number_stock?: number;

  @IsOptional()
  @IsBoolean()
  relative?: boolean;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  attributes: VariantAttributeDto[];

  @IsOptional()
  @IsNumber()
  price_Raw?: number;

  @IsOptional()
  @IsNumber()
  index_sort?: number;

  // Alternative field names from the example
  @IsOptional()
  @IsNumber()
  min_order_count?: number;

  @IsOptional()
  @IsBoolean()
  is_stock_managed?: boolean;

  @IsOptional()
  @IsNumber()
  stock_number?: number;

  @IsOptional()
  @IsNumber()
  sort_index?: number;
}

// Product Variant Input Interface (for API request)
export interface ProductVariantInput {
  price?: number;
  sku?: string;
  enabled?: boolean;
  has_max_order?: boolean;
  min_order_count?: number;
  is_stock_managed?: boolean;
  stock_number?: number;
  relative?: boolean;
  weight?: number;
  attributes: Array<{
    name: string;
    value: string;
  }>;
  commercial_files?: any[];
  raw_price?: number | null;
  sort_index?: number;
  // Alternative field names
  index_sort?: number;
}

// Product Input Interface (for API request)
export interface ProductInput {
  enabled?: boolean;
  name: string;
  url?: string;
  product_type: ProductType;
  form_id?: number;
}

// Attribute Input Interface (can be differentiator or description)
export interface AttributeInput {
  type?: string;
  name: string;
  attribute_type?: AttributeType;
  value?: string; // For description attribute
}

// Image Order Interface
export interface ImageOrder {
  id: number;
  order: number;
}

// Create Product Input Interface (for API request)
export interface CreateProductInput {
  product: ProductInput;
  attributes: AttributeInput[];
  tags?: string[];
  product_variants: ProductVariantInput[];
  product_category_ids?: string | number | (string | number)[];
  image_ids?: number[];
  image_orders?: ImageOrder[];
}

// Create Product DTO (for validation)
export class CreateProductDto {
  @ValidateNested()
  @Type(() => ProductDto)
  product: ProductDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attributes: AttributeDto[];

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  product_variants: ProductVariantDto[];
}

// Update Variant by SKU DTO
export class UpdateVariantBySkuDto {
  @IsOptional()
  @IsBoolean()
  is_stock_managed?: boolean;

  @IsOptional()
  @IsNumber()
  stock_number?: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  has_raw_price?: boolean;

  @IsOptional()
  @IsNumber()
  raw_price?: number;
}

// Variant Price Update Item DTO
export class VariantPriceUpdateItemDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsNumber()
  @IsNotEmpty()
  price: number;
}

// Bulk Update Price DTO
export class BulkUpdatePriceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantPriceUpdateItemDto)
  variants: VariantPriceUpdateItemDto[];
}

// Query DTOs
export class SazitoQueryDto {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
