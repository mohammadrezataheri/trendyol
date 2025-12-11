import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import FormData = require('form-data');
import { SazitoCreateProductResponse } from './dto/sazito-response.dto';
import { CreateProductInput } from './dto/sazito.dto';

@Injectable()
export class SazitoService {
  private readonly logger = new Logger(SazitoService.name);
  private readonly baseUrl: string;
  private readonly authorization: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    // Get base URL and authorization from environment variables or defaults
    this.baseUrl =
      this.configService.get<string>('SAZITO_BASE_URL') ||
      'https://briston.shop';
    this.authorization =
      this.configService.get<string>('SAZITO_AUTHORIZATION') ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImV4cGlyZXNfYXQiOiIyMDI1LTEyLTEzVDEyOjQ3OjUxLjE4MzA0ODc0NloiLCJzdWJkb21haW4iOiJicmlzdG9uNDEiLCJ1c2VyIjp7ImVtYWlsIjoiaGFkaS5jYXJib25AZ21haWwuY29tIiwiZmlyc3RfbmFtZSI6IiIsImlkIjoxLCJsYXN0X25hbWUiOiIiLCJyb2xlcyI6W3siaWQiOjEsIm5hbWUiOiJhZG1pbiIsImNvbG9yIjoiIiwidXNlcnMiOm51bGwsInJvbGVfY29uZmlnIjpbIkFMTCJdLCJjcmVhdGVkX2F0IjoiMjAyMy0xMC0wNlQyMTo1MDoxNC4yMzk3NDNaIiwidXBkYXRlZF9hdCI6IjIwMjUtMDktMjJUMTU6NTY6MDcuMjc2MTEyWiJ9XSwic2hpcHBpbmdfYWRkcmVzc2VzIjpudWxsLCJzb2xkIjpudWxsLCJzb2xkX2Ftb3VudCI6bnVsbH19fQ.oOP3nDwPIeQkvSMS4pvtcxSmZWC4ylXitUTJE8ec14E';
  }

  /**
   * Make HTTP request to Sazito API
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    isFormData: boolean = false
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const headers: any = {
        authorization: this.authorization,
        'Accept-Encoding': 'gzip, deflate', // Disable Brotli to avoid Z_BUF_ERROR
      };

      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      const config: any = {
        method,
        url,
        headers,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        ...(data && { data }),
      };

      // If FormData, let axios handle headers automatically
      if (isFormData && data) {
        config.headers = {
          ...config.headers,
          ...data.getHeaders(),
        };
        // Log FormData structure for debugging
        this.logger.debug(
          `FormData fields count: ${
            (data as any)._streams?.length || 'unknown'
          }`
        );
      }

      this.logger.log(`Making ${method} request to: ${url}`);
      const response = await firstValueFrom(this.httpService.request(config));

      // Log response for debugging
      if (isFormData) {
        this.logger.debug(
          `Upload response: ${JSON.stringify(response.data, null, 2)}`
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error making request to ${endpoint}: ${error.message}`,
        error.stack
      );
      if (error.response) {
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`
        );
        throw new Error(
          error.response.data?.message ||
            error.response.data?.error ||
            'Error making request to Sazito API'
        );
      }
      throw error;
    }
  }

  /**
   * Create a new product in Sazito
   * POST /api/v1/products
   */
  async createProduct(
    body: CreateProductInput
  ): Promise<SazitoCreateProductResponse> {
    // Normalize product data - ensure product_type is set correctly
    const product = {
      ...body.product,
      product_type: body.product.product_type,
      form_id: body.product.form_id !== undefined ? body.product.form_id : -1,
    };

    // Normalize variant data to match API format
    const normalizedData: any = {
      product,
      attributes: body.attributes || [],
      tags: body.tags || [],
      product_variants: body.product_variants.map((variant: any) => {
        // Map alternative field names to standard format
        return {
          price: variant.price || 0,
          sku: variant.sku,
          enabled: variant.enabled !== undefined ? variant.enabled : true,
          has_max_order:
            variant.has_max_order !== undefined ? variant.has_max_order : false,
          min_order_count:
            variant.min_order_count !== undefined ? variant.min_order_count : 1,
          is_stock_managed:
            variant.is_stock_managed !== undefined
              ? variant.is_stock_managed
              : false,
          stock_number:
            variant.stock_number !== undefined ? variant.stock_number : 0,
          relative: variant.relative !== undefined ? variant.relative : false,
          weight: variant.weight || 0,
          attributes: (variant.attributes || []).map((attr: any) => ({
            name: attr.name,
            value: attr.value,
          })),
          commercial_files: variant.commercial_files || [],
          raw_price: variant.raw_price !== undefined ? variant.raw_price : null,
          sort_index:
            variant.sort_index !== undefined
              ? variant.sort_index
              : variant.index_sort || variant.sort_index || 0,
        };
      }),
    };

    // Add product_category_ids if provided (can be string or array)
    if (body.product_category_ids !== undefined) {
      normalizedData.product_category_ids = body.product_category_ids;
    }

    // Add image_ids if provided
    if (body.image_ids && Array.isArray(body.image_ids)) {
      normalizedData.image_ids = body.image_ids;
    }

    // Add image_orders if provided
    if (body.image_orders && Array.isArray(body.image_orders)) {
      normalizedData.image_orders = body.image_orders;
    }

    return this.makeRequest(
      '/api/v1/products',
      'POST',
      normalizedData,
      false // isFormData
    ) as Promise<SazitoCreateProductResponse>;
  }

  /**
   * Upload a single image to Sazito
   * POST /api/v1/images
   */
  async uploadSingleImage(image: {
    file: any; // Express.Multer.File
    name?: string;
    alt?: string;
  }): Promise<any> {
    const formData = new FormData();
    const file = image.file;
    const fileName =
      image.name || file.originalname || file.filename || 'image';
    const alt = image.alt || '';

    // Get file buffer or create stream from path
    const fileContent = file.buffer || file.path;

    // Add file with proper options
    const options: any = {
      filename: fileName,
    };

    if (file.mimetype) {
      options.contentType = file.mimetype;
    }

    // Add all fields for this image
    formData.append('images[][file]', fileContent, options);
    formData.append('images[][name]', fileName);
    formData.append('images[][alt]', alt);

    return this.makeRequest(
      '/api/v1/images',
      'POST',
      formData,
      true // isFormData
    );
  }

  /**
   * Upload multiple images to Sazito (one by one)
   * POST /api/v1/images
   */
  async uploadImages(
    images: Array<{
      file: any; // Express.Multer.File
      name?: string;
      alt?: string;
    }>
  ): Promise<any> {
    this.logger.debug(`Uploading ${images.length} images one by one`);

    const results: any[] = [];
    const uploadedImages: any[] = [];

    // Upload each image separately
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        this.logger.debug(`Uploading image ${i + 1}/${images.length}`);
        const response = await this.uploadSingleImage(image);

        // Extract image data from response
        if (response?.result?.images && Array.isArray(response.result.images)) {
          uploadedImages.push(...response.result.images);
        } else if (response?.images && Array.isArray(response.images)) {
          uploadedImages.push(...response.images);
        } else if (response?.result && Array.isArray(response.result)) {
          uploadedImages.push(...response.result);
        }

        results.push({
          success: true,
          index: i,
          response,
        });
      } catch (error) {
        this.logger.error(
          `Failed to upload image ${i + 1}/${images.length}: ${error.message}`
        );
        results.push({
          success: false,
          index: i,
          error: error.message,
        });
      }
    }

    // Return combined response similar to single upload format
    return {
      result: {
        images: uploadedImages,
      },
      error: '',
      error_code: 0,
      status: 200,
      _uploadResults: results, // Include individual results for debugging
    };
  }

  /**
   * Update product variant by SKU
   * PUT /api/v1/products/update_variant/sku/{SKU}
   */
  async updateVariantBySku(
    sku: string,
    updateData: {
      is_stock_managed?: boolean;
      stock_number?: number;
      price?: number;
      has_raw_price?: boolean;
      raw_price?: number;
    }
  ): Promise<any> {
    return this.makeRequest(
      `/api/v1/products/update_variant/sku/${sku}`,
      'PUT',
      updateData,
      false // isFormData
    );
  }

  /**
   * Bulk update prices for multiple variants
   * PUT /api/v1/accounting/bulk-update-price
   */
  async bulkUpdatePrice(
    variants: Array<{
      id: number;
      price: number;
    }>
  ): Promise<any> {
    return this.makeRequest(
      '/api/v1/accounting/bulk-update-price',
      'PUT',
      { variants },
      false // isFormData
    );
  }
}
