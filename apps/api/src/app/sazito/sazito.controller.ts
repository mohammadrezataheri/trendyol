import {
  Body,
  Controller,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SazitoService } from './sazito.service';
import {
  CreateProductInput,
  UpdateVariantBySkuDto,
  BulkUpdatePriceDto,
} from './dto/sazito.dto';

@Controller('sazito')
@ApiTags('sazito')
export class SazitoController {
  constructor(private readonly sazitoService: SazitoService) {}

  /**
   * Create a new product in Sazito
   * POST /api/v1/products
   */
  @Post('products')
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'ایجاد یک محصول جدید در سیستم سازیتو. هر محصول می‌تواند شامل چندین ورینت باشد.',
  })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createProduct(@Body() body: CreateProductInput) {
    return this.sazitoService.createProduct(body);
  }

  /**
   * Upload images to Sazito
   * POST /api/v1/images
   */
  @Post('images')
  @UseInterceptors(FilesInterceptor('images'))
  @ApiOperation({
    summary: 'Upload images to Sazito',
    description: 'آپلود تصاویر به سیستم سازیتو',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Array of image files',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Images uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async uploadImages(
    @UploadedFiles() files: any[], // Express.Multer.File[]
    @Body() body: any
  ) {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    // Extract names and alts from body if provided
    // Body might contain arrays like: { 'images[][name]': [...], 'images[][alt]': [...] }
    const names = body['images[][name]'] || body.names || [];
    const alts = body['images[][alt]'] || body.alts || [];

    // Map files with their metadata
    const images = files.map((file, index) => ({
      file,
      name: Array.isArray(names) ? names[index] : names,
      alt: Array.isArray(alts) ? alts[index] : alts,
    }));

    return this.sazitoService.uploadImages(images);
  }

  /**
   * Update product variant by SKU
   * PUT /api/v1/products/update_variant/sku/{SKU}
   */
  @Put('products/update_variant/sku/:sku')
  @ApiOperation({
    summary: 'Update product variant by SKU',
    description:
      'آپدیت قیمت و موجودی محصول با استفاده از کد کالا (SKU). این متد برای به‌روزرسانی قیمت و موجودی ورینت‌های محصول استفاده می‌شود.',
  })
  @ApiResponse({ status: 200, description: 'Variant updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async updateVariantBySku(
    @Param('sku') sku: string,
    @Body() body: UpdateVariantBySkuDto
  ) {
    return this.sazitoService.updateVariantBySku(sku, body);
  }

  /**
   * Bulk update prices for multiple variants
   * PUT /api/v1/accounting/bulk-update-price
   */
  @Put('accounting/bulk-update-price')
  @ApiOperation({
    summary: 'Bulk update prices',
    description:
      'آپدیت گروهی قیمت برای چندین ورینت. این متد برای به‌روزرسانی قیمت چندین ورینت به صورت همزمان استفاده می‌شود.',
  })
  @ApiResponse({ status: 200, description: 'Prices updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async bulkUpdatePrice(@Body() body: BulkUpdatePriceDto) {
    return this.sazitoService.bulkUpdatePrice(body.variants);
  }
}
