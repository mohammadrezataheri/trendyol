import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import TrendyolProduct from './entity/trendyol-product.entity';
import * as cheerio from 'cheerio';
import {
  ScrapeProductsDto,
  CreateScrapeConfigDto,
} from './dto/scrape-products.dto';
import { firstValueFrom } from 'rxjs';
import CurrencyPrices from './entity/currency.entity';
import ScrapeConfig from './entity/scrape-config.entity';
import { ScrapeConfigStatusEnum } from '../../shared/enums/scrape-config-status.enum';
import { SazitoService } from '../sazito/sazito.service';
import {
  CreateProductDto,
  CreateProductInput,
  ProductType,
  AttributeType,
} from '../sazito/dto/sazito.dto';
import { AiService } from '../ai/ai.service';
@Injectable()
export class TrendyolService {
  private readonly logger = new Logger(TrendyolService.name);

  // Flag to enable/disable translation (can be controlled via environment variable)
  private readonly enableTranslation: boolean;

  constructor(
    @InjectRepository(TrendyolProduct)
    private trendyolProductRepository: Repository<TrendyolProduct>,
    private httpService: HttpService,
    private configService: ConfigService,
    @InjectRepository(CurrencyPrices)
    private CurrencyPricesRepo: Repository<CurrencyPrices>,
    @InjectRepository(ScrapeConfig)
    private scrapeConfigRepository: Repository<ScrapeConfig>,
    private sazitoService: SazitoService,
    private aiService: AiService
  ) {
    // Enable translation by default, can be disabled via ENABLE_TRANSLATION=false
    this.enableTranslation = true;
    this.logger.log(
      `Translation is ${this.enableTranslation ? 'ENABLED' : 'DISABLED'}`
    );
  }

  async scrapeProducts(dto: ScrapeProductsDto): Promise<{
    success: boolean;
    message: string;
    productsScraped: number;
    products: TrendyolProduct[];
  }> {
    const { url, maxPages = 1, delay = 2000 } = dto;
    let productsScraped = 0;
    const scrapedProducts: TrendyolProduct[] = [];

    try {
      this.logger.log(`Starting to scrape products from: ${url}`);

      for (let page = 1; page <= maxPages; page++) {
        const pageUrl = this.buildPageUrl(url, page);
        this.logger.log(`Scraping page ${page}: ${pageUrl}`);

        try {
          // Try to extract API endpoint from URL or use default pattern
          const apiUrl = this.buildApiUrl(pageUrl, page);
          let productsFromAPI: Partial<TrendyolProduct>[] = [];

          // Try API first (if available)
          try {
            const apiResponse = await firstValueFrom(
              this.httpService.get(apiUrl, {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                  Accept: 'application/json',
                  'Accept-Language': 'en-US,en;q=0.5',
                },
              })
            );

            if (
              apiResponse.data &&
              (apiResponse.data.result ||
                apiResponse.data.products ||
                Array.isArray(apiResponse.data))
            ) {
              productsFromAPI = this.parseApiResponse(
                apiResponse.data,
                pageUrl
              );
              this.logger.log(
                `Found ${productsFromAPI.length} products from API`
              );
            }
          } catch (apiError) {
            this.logger.debug(
              `API request failed, falling back to HTML scraping: ${apiError.message}`
            );
          }

          const response = await firstValueFrom(
            this.httpService.get(pageUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                Accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
              },
            })
          );

          const $ = cheerio.load(response.data);

          // Log HTML structure for debugging
          this.logger.debug(`HTML length: ${response.data.length}`);
          this.logger.debug(
            `Body content length: ${$('body').html()?.length || 0}`
          );

          // Try to extract products from JSON in script tags first
          const productsFromScript = this.extractProductsFromScript($, pageUrl);
          if (productsFromScript.length > 0) {
            this.logger.log(
              `Found ${productsFromScript.length} products from script tags`
            );
          }

          // Extract products from HTML
          const productsFromHTML = this.extractProducts($, pageUrl);
          this.logger.log(
            `Found ${productsFromHTML.length} products from HTML`
          );

          // Combine all sources, prioritizing API > script > HTML
          let products: Partial<TrendyolProduct>[] = [];
          if (productsFromAPI.length > 0) {
            products = productsFromAPI;
            this.logger.log('Using products from API');
          } else if (productsFromScript.length > 0) {
            products = productsFromScript;
            this.logger.log('Using products from script tags');
          } else {
            products = productsFromHTML;
            this.logger.log('Using products from HTML');
          }

          if (products.length === 0) {
            this.logger.warn(`No products found on page ${page}`);
            // Log some debug info
            this.logDebugInfo($);
            break;
          }

          this.logger.log(`Processing ${products.length} products for saving`);

          for (let i = 0; i < products.length; i++) {
            const productData = products[i];
            try {
              this.logger.debug(
                `Processing product ${i + 1}/${
                  products.length
                }: ${productData.title?.substring(0, 50)}...`
              );

              // Log productId and URL for debugging
              this.logger.debug(
                `Product ${i + 1} - productId: ${productData.productId}, url: ${
                  productData.url
                }`
              );

              if (!productData.productId || !productData.url) {
                this.logger.warn(
                  `Skipping product ${i + 1}: missing productId or url`
                );
                continue;
              }

              // Extract SKU from URL (pattern: -p-{sku})
              // SKU acts like productId - if it exists in any product's variants (JSONB), skip the entire product
              const skuMatch = productData.url.match(/-p-(\d+)(?:\?|$|#)/);
              if (skuMatch && skuMatch[1]) {
                const sku = skuMatch[1];

                // Check if this SKU exists in any product's variants (JSONB search)
                const productWithSku = await this.trendyolProductRepository
                  .createQueryBuilder('product')
                  .where('product.variants::text LIKE :sku', {
                    sku: `%"sku":"${sku}"%`,
                  })
                  .orWhere('product.variants::text LIKE :sku2', {
                    sku2: `%"sku": "${sku}"%`,
                  })
                  .getOne();

                if (productWithSku) {
                  this.logger.debug(
                    `Skipping product: SKU ${sku} already exists as variant in product ${productWithSku.id} (productId: ${productWithSku.productId})`
                  );
                  continue; // Skip this product completely - don't scrape it
                }
              }

              // Check for existing product by productId first, then by URL
              let existingProduct =
                await this.trendyolProductRepository.findOne({
                  where: { productId: productData.productId },
                });

              if (!existingProduct) {
                existingProduct = await this.trendyolProductRepository.findOne({
                  where: { url: productData.url },
                });
              }

              if (existingProduct) {
                this.logger.debug(
                  `Found existing product with ID: ${existingProduct.id}, productId: ${existingProduct.productId}, url: ${existingProduct.url}`
                );
              }

              let savedProduct: TrendyolProduct;

              // Translate title before saving
              const translatedProductData: Partial<TrendyolProduct> = {
                ...productData,
                lastScrapedAt: new Date(),
                isScraped: true,
                tokensUsed: 0, // Initialize token counter
              };

              // Convert price to Toman
              if (productData.price) {
                try {
                  let priceInToman = await this.convertPriceToToman(
                    productData.price
                  );

                  // Apply markup percentage if provided
                  if (dto.markupPercentage && priceInToman) {
                    const originalPrice = priceInToman;
                    priceInToman =
                      priceInToman * (1 + dto.markupPercentage / 100);
                    priceInToman = Math.round(priceInToman * 100) / 100;
                    this.logger.debug(
                      `Applied ${dto.markupPercentage}% markup: ${originalPrice} -> ${priceInToman}`
                    );
                  }

                  // Round to nearest thousand (round up)
                  if (priceInToman) {
                    const roundedPrice =
                      this.roundToNearestThousand(priceInToman);
                    this.logger.debug(
                      `Rounded price to nearest thousand: ${priceInToman} -> ${roundedPrice}`
                    );
                    priceInToman = roundedPrice;
                  }

                  translatedProductData.priceInToman = priceInToman;
                  this.logger.debug(
                    `Converted price ${productData.price} TRY to ${priceInToman} Toman`
                  );
                } catch (error) {
                  this.logger.error(
                    `Error converting price to Toman: ${error.message}`
                  );
                }
              }

              // Set category if provided
              if (dto.category) {
                translatedProductData.category = dto.category;
              }

              // Generate slug from URL (with translation)
              if (productData.url && this.enableTranslation) {
                try {
                  const slugResult = await this.generateSlugFromUrl(
                    productData.url
                  );
                  translatedProductData.slug = slugResult.slug;
                  translatedProductData.tokensUsed =
                    (translatedProductData.tokensUsed || 0) +
                    slugResult.tokensUsed;
                  this.logger.debug(
                    `Generated slug: ${translatedProductData.slug}`
                  );
                } catch (error) {
                  this.logger.error(`Error generating slug: ${error.message}`);
                }
              }

              if (productData.title && this.enableTranslation) {
                try {
                  const translationResult = await this.translateWithOpenAI(
                    productData.title
                  );
                  translatedProductData.title =
                    translationResult.translatedText;
                  translatedProductData.tokensUsed =
                    (translatedProductData.tokensUsed || 0) +
                    translationResult.tokensUsed;
                  this.logger.debug('Title translated successfully');
                } catch (error) {
                  this.logger.error(
                    `Error translating title: ${error.message}`
                  );
                }
              }

              if (existingProduct) {
                // Update existing product
                this.logger.debug(
                  `Updating existing product: ${existingProduct.id}`
                );
                await this.trendyolProductRepository.update(
                  { id: existingProduct.id },
                  translatedProductData
                );
                savedProduct = await this.trendyolProductRepository.findOne({
                  where: { id: existingProduct.id },
                });
              } else {
                // Create new product
                this.logger.debug(
                  `Creating new product: ${productData.productId}`
                );
                const newProduct = this.trendyolProductRepository.create(
                  translatedProductData
                );
                savedProduct = await this.trendyolProductRepository.save(
                  newProduct
                );
                this.logger.debug(
                  `Saved new product with ID: ${savedProduct.id}`
                );
              }

              // Scrape detailed product information from product page
              if (savedProduct && savedProduct.url) {
                try {
                  this.logger.debug(
                    `Fetching detailed info for product: ${savedProduct.url}`
                  );
                  const detailedInfo = await this.scrapeProductDetails(
                    savedProduct.url,
                    {
                      markupPercentage: dto.markupPercentage,
                      category: dto.category,
                    }
                  );

                  if (detailedInfo) {
                    // Translate title and description before saving
                    const translatedData: Partial<TrendyolProduct> = {
                      ...detailedInfo,
                      lastScrapedAt: new Date(),
                    };

                    this.logger.debug(
                      `translatedData before update: priceInToman=${
                        translatedData.priceInToman
                      }, category=${translatedData.category}, variants=${
                        translatedData.variants?.length || 0
                      }`
                    );

                    // Log variants if they exist
                    if (
                      translatedData.variants &&
                      translatedData.variants.length > 0
                    ) {
                      this.logger.log(
                        `Preparing to save ${translatedData.variants.length} variants to database`
                      );
                      this.logger.debug(
                        `Variants data: ${JSON.stringify(
                          translatedData.variants.slice(0, 2)
                        )}`
                      );
                    } else {
                      this.logger.warn(
                        'No variants found in translatedData before saving'
                      );
                    }

                    // Initialize tokensUsed if not set
                    if (!translatedData.tokensUsed) {
                      translatedData.tokensUsed = 0;
                    }

                    // Batch translate all content in one request
                    if (this.enableTranslation) {
                      try {
                        this.logger.log(
                          'Starting batch translation of all content'
                        );

                        // Collect all texts to translate
                        const textsToTranslate: {
                          title?: string;
                          description?: string;
                          slug?: string;
                          colors?: string[];
                          sizes?: string[];
                        } = {};

                        // Add title
                        if (detailedInfo.title) {
                          textsToTranslate.title = detailedInfo.title;
                        }

                        // Add description
                        if (detailedInfo.description) {
                          textsToTranslate.description =
                            detailedInfo.description;
                        }

                        // Generate slug from URL if not already set
                        if (savedProduct.url && !translatedData.slug) {
                          // Extract slug from URL for translation
                          const urlParts = savedProduct.url.split('/');
                          let urlSlug = urlParts[urlParts.length - 1];
                          // Remove product ID pattern (-p-123456789)
                          urlSlug = urlSlug.replace(/-p-\d+$/, '');
                          if (urlSlug && urlSlug.length > 3) {
                            textsToTranslate.slug = urlSlug.replace(/-/g, ' ');
                          }
                        }

                        // Collect unique colors and sizes from variants
                        if (
                          translatedData.variants &&
                          translatedData.variants.length > 0
                        ) {
                          const colorsSet = new Set<string>();
                          const sizesSet = new Set<string>();

                          translatedData.variants.forEach((variant: any) => {
                            if (
                              variant.color &&
                              variant.color.trim().length > 0
                            ) {
                              colorsSet.add(variant.color.trim());
                            }
                            if (
                              variant.sizeValue &&
                              variant.sizeValue.trim().length > 0 &&
                              !/^(XS|S|M|L|XL|XXL|2XL|3XL|\d+)$/i.test(
                                variant.sizeValue.trim()
                              )
                            ) {
                              sizesSet.add(variant.sizeValue.trim());
                            }
                            if (variant.size && Array.isArray(variant.size)) {
                              variant.size.forEach((sizeItem: string) => {
                                if (
                                  sizeItem &&
                                  sizeItem.trim().length > 0 &&
                                  !/^(XS|S|M|L|XL|XXL|2XL|3XL|\d+)$/i.test(
                                    sizeItem.trim()
                                  )
                                ) {
                                  sizesSet.add(sizeItem.trim());
                                }
                              });
                            }
                          });

                          if (colorsSet.size > 0) {
                            textsToTranslate.colors = Array.from(colorsSet);
                          }
                          if (sizesSet.size > 0) {
                            textsToTranslate.sizes = Array.from(sizesSet);
                          }
                        }

                        // Perform batch translation
                        const batchResult = await this.translateBatchWithOpenAI(
                          textsToTranslate
                        );

                        // Apply translations
                        if (batchResult.title) {
                          translatedData.title = batchResult.title;
                        }
                        if (batchResult.description) {
                          translatedData.description = batchResult.description;
                        }
                        if (batchResult.slug) {
                          // Process slug: remove HTML tags, clean, and slugify
                          let cleanSlug = batchResult.slug.replace(
                            /<[^>]*>/g,
                            ''
                          );
                          cleanSlug = cleanSlug
                            .replace(
                              /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s-]/g,
                              ''
                            )
                            .trim();
                          cleanSlug = cleanSlug
                            .replace(/\s+/g, '-')
                            .replace(/-+/g, '-')
                            .replace(/^-|-$/g, '');
                          cleanSlug = cleanSlug.replace(/[A-Z]/g, (char) =>
                            char.toLowerCase()
                          );
                          translatedData.slug = cleanSlug;
                        }

                        // Apply variant translations
                        if (
                          batchResult.colors &&
                          translatedData.variants &&
                          translatedData.variants.length > 0
                        ) {
                          const colorMap = new Map<string, string>();
                          if (textsToTranslate.colors) {
                            textsToTranslate.colors.forEach(
                              (original, index) => {
                                if (
                                  batchResult.colors &&
                                  batchResult.colors[index]
                                ) {
                                  colorMap.set(
                                    original,
                                    batchResult.colors[index]
                                  );
                                }
                              }
                            );
                          }

                          translatedData.variants.forEach((variant: any) => {
                            if (
                              variant.color &&
                              colorMap.has(variant.color.trim())
                            ) {
                              variant.color = colorMap.get(
                                variant.color.trim()
                              )!;
                            }
                          });
                        }

                        if (
                          batchResult.sizes &&
                          translatedData.variants &&
                          translatedData.variants.length > 0
                        ) {
                          const sizeMap = new Map<string, string>();
                          if (textsToTranslate.sizes) {
                            textsToTranslate.sizes.forEach(
                              (original, index) => {
                                if (
                                  batchResult.sizes &&
                                  batchResult.sizes[index]
                                ) {
                                  sizeMap.set(
                                    original,
                                    batchResult.sizes[index]
                                  );
                                }
                              }
                            );
                          }

                          translatedData.variants.forEach((variant: any) => {
                            if (
                              variant.sizeValue &&
                              sizeMap.has(variant.sizeValue.trim())
                            ) {
                              variant.sizeValue = sizeMap.get(
                                variant.sizeValue.trim()
                              )!;
                            }
                            if (variant.size && Array.isArray(variant.size)) {
                              variant.size = variant.size.map(
                                (sizeItem: string) => {
                                  if (
                                    sizeItem &&
                                    sizeMap.has(sizeItem.trim())
                                  ) {
                                    return sizeMap.get(sizeItem.trim())!;
                                  }
                                  return sizeItem;
                                }
                              );
                            }
                          });
                        }

                        translatedData.tokensUsed =
                          (translatedData.tokensUsed || 0) +
                          batchResult.tokensUsed;

                        this.logger.log(
                          `Batch translation completed, tokens used: ${batchResult.tokensUsed}`
                        );
                      } catch (error) {
                        this.logger.error(
                          `Error in batch translation: ${error.message}`,
                          error.stack
                        );
                      }
                    }

                    // Update product with detailed information (including translations)
                    this.logger.debug(
                      `Updating product ${savedProduct.id} with: priceInToman=${
                        translatedData.priceInToman
                      }, category=${translatedData.category}, variants=${
                        translatedData.variants?.length || 0
                      }`
                    );

                    // Variants are saved in JSONB field alongside product
                    if (
                      translatedData.variants &&
                      translatedData.variants.length > 0
                    ) {
                      this.logger.log(
                        `Saving ${translatedData.variants.length} variants to product ${savedProduct.id}`
                      );
                    }

                    await this.trendyolProductRepository.update(
                      { id: savedProduct.id },
                      translatedData
                    );

                    // Reload updated product
                    savedProduct = await this.trendyolProductRepository.findOne(
                      {
                        where: { id: savedProduct.id },
                      }
                    );
                    this.logger.debug(
                      `Updated product ${savedProduct.id} with detailed info`
                    );
                  }

                  // Add delay between product detail requests to avoid rate limiting
                  await this.delay(1000);
                } catch (error) {
                  this.logger.warn(
                    `Failed to fetch detailed info for product ${savedProduct.id}: ${error.message}`
                  );
                }
              }

              if (savedProduct) {
                scrapedProducts.push(savedProduct);
              }
              productsScraped++;

              // If limit is set and we've reached it, stop processing
              if (dto.limit && productsScraped >= dto.limit) {
                this.logger.log(
                  `Reached limit of ${dto.limit} products. Stopping...`
                );
                break;
              }
            } catch (error) {
              this.logger.error(
                `Error saving product ${i + 1} (${productData.title?.substring(
                  0,
                  50
                )}):`,
                error.message || error
              );
              this.logger.error(
                'Product data:',
                JSON.stringify(productData, null, 2)
              );
            }
          }

          this.logger.log(
            `Successfully processed ${productsScraped} products from page ${page}`
          );

          this.logger.log(
            `Page ${page} completed. Products scraped: ${products.length}`
          );

          // If limit is reached, stop processing pages
          if (dto.limit && productsScraped >= dto.limit) {
            this.logger.log(
              `Reached limit of ${dto.limit} products. Stopping page processing...`
            );
            break;
          }

          // Delay between pages to avoid rate limiting
          if (page < maxPages) {
            await this.delay(delay);
          }
        } catch (error) {
          this.logger.error(`Error scraping page ${page}:`, error);
          continue;
        }
      }

      return {
        success: true,
        message: `Successfully scraped ${productsScraped} products`,
        productsScraped,
        products: scrapedProducts,
      };
    } catch (error) {
      this.logger.error('Error in scrapeProducts:', error);
      return {
        success: false,
        message: `Error scraping products: ${error.message}`,
        productsScraped,
        products: scrapedProducts,
      };
    }
  }

  private extractProducts(
    $: cheerio.CheerioAPI,
    baseUrl: string
  ): Partial<TrendyolProduct>[] {
    const products: Partial<TrendyolProduct>[] = [];

    // Use actual selector from HTML sample
    const productElements = $('[data-testid="product-card"]');

    if (productElements.length === 0) {
      this.logger.warn('No product cards found');
      return products;
    }

    this.logger.log(`Found ${productElements.length} product cards`);

    productElements.each((index, element) => {
      try {
        const product = this.parseProductElement($(element), $, baseUrl);
        if (product && product.title) {
          products.push(product);
        }
      } catch (error) {
        this.logger.warn(`Error parsing product ${index}:`, error);
      }
    });
    return products;
  }

  private extractProductsFromScript(
    $: cheerio.CheerioAPI,
    baseUrl: string
  ): Partial<TrendyolProduct>[] {
    const products: Partial<TrendyolProduct>[] = [];

    try {
      // Look for JSON data in script tags
      const scripts = $(
        'script[type="application/json"], script[type="application/ld+json"]'
      );

      scripts.each((index, script) => {
        try {
          const scriptContent = $(script).html();
          if (!scriptContent) return;

          const data = JSON.parse(scriptContent);

          // Try to find product data in various structures
          if (data['@graph']) {
            // Schema.org structured data
            const items = data['@graph'].filter(
              (item: any) =>
                item['@type'] === 'Product' || item['@type'] === 'ListItem'
            );

            items.forEach((item: any) => {
              if (item.name || item.headline) {
                products.push({
                  productId:
                    item.sku ||
                    item.identifier ||
                    this.generateProductId(item.url || ''),
                  title: item.name || item.headline,
                  description: item.description,
                  price: item.offers?.price || item.price,
                  imageUrl: item.image?.[0] || item.image,
                  url: item.url || item['@id'],
                  brand: item.brand?.name || item.brand,
                  additionalData: {
                    scrapedAt: new Date().toISOString(),
                    sourceUrl: baseUrl,
                    source: 'script-json',
                  },
                });
              }
            });
          } else if (Array.isArray(data)) {
            // Array of products
            data.forEach((item: any) => {
              if (item.name || item.title) {
                products.push({
                  productId:
                    item.id ||
                    item.productId ||
                    this.generateProductId(item.url || ''),
                  title: item.name || item.title,
                  description: item.description,
                  price: item.price || item.salePrice,
                  originalPrice: item.originalPrice || item.listPrice,
                  imageUrl: item.image || item.imageUrl,
                  url: item.url || item.link,
                  brand: item.brand,
                  additionalData: {
                    scrapedAt: new Date().toISOString(),
                    sourceUrl: baseUrl,
                    source: 'script-json-array',
                  },
                });
              }
            });
          } else if (data.products || data.items) {
            // Nested product structure
            const items = data.products || data.items || [];
            items.forEach((item: any) => {
              if (item.name || item.title) {
                products.push({
                  productId:
                    item.id ||
                    item.productId ||
                    this.generateProductId(item.url || ''),
                  title: item.name || item.title,
                  description: item.description,
                  price: item.price || item.salePrice,
                  originalPrice: item.originalPrice || item.listPrice,
                  imageUrl: item.image || item.imageUrl,
                  url: item.url || item.link,
                  brand: item.brand,
                  additionalData: {
                    scrapedAt: new Date().toISOString(),
                    sourceUrl: baseUrl,
                    source: 'script-json-nested',
                  },
                });
              }
            });
          }
        } catch (error) {
          // Not valid JSON or not product data, skip
        }
      });

      // Also check for window.__INITIAL_STATE__ or similar patterns in inline scripts
      const inlineScripts = $('script:not([src])');
      inlineScripts.each((index, script) => {
        try {
          const scriptText = $(script).html() || '';

          // Look for common patterns like window.__INITIAL_STATE__, window.__PRELOADED_STATE__, etc.
          const stateMatches = scriptText.match(
            /window\.__[A-Z_]+__\s*=\s*({.+?});/s
          );
          if (stateMatches) {
            const stateData = JSON.parse(stateMatches[1]);
            // Try to extract products from state
            // This is site-specific and may need adjustment
          }
        } catch (error) {
          // Skip invalid scripts
        }
      });
    } catch (error) {
      this.logger.warn('Error extracting products from script tags:', error);
    }

    return products;
  }

  private logDebugInfo($: cheerio.CheerioAPI): void {
    this.logger.debug('=== Debug Info ===');
    this.logger.debug(`Total links: ${$('a').length}`);
    this.logger.debug(`Links with /p/: ${$('a[href*="/p/"]').length}`);
    this.logger.debug(`Links with /brand/: ${$('a[href*="/brand/"]').length}`);
    this.logger.debug(
      `Divs with "card" in class: ${$('div[class*="card"]').length}`
    );
    this.logger.debug(
      `Divs with "product" in class: ${$('div[class*="product"]').length}`
    );
    this.logger.debug(`Script tags: ${$('script').length}`);
    this.logger.debug(
      `JSON script tags: ${$('script[type="application/json"]').length}`
    );

    // Sample some links
    const sampleLinks = $('a[href*="/p/"]').slice(0, 3);
    sampleLinks.each((i, el) => {
      this.logger.debug(`Sample link ${i}: ${$(el).attr('href')}`);
    });
  }

  private parseProductElement(
    $element: cheerio.Cheerio<any>,
    $: cheerio.CheerioAPI,
    baseUrl: string
  ): Partial<TrendyolProduct> | null {
    try {
      // Extract title from actual structure: .product-brand + .product-name
      const brandName = $element.find('.product-brand').first().text().trim();
      const productName = $element.find('.product-name').first().text().trim();
      const title =
        brandName && productName
          ? `${brandName} ${productName}`.trim()
          : $element
              .find('.product-name, .product-brand')
              .first()
              .text()
              .trim();

      // Extract price from actual structure: .sale-price with .integer-part and .decimal-part
      const integerPart = $element
        .find('.sale-price .integer-part')
        .first()
        .text()
        .trim()
        .replace(',', '');
      const decimalPart = $element
        .find('.sale-price .decimal-part')
        .first()
        .text()
        .trim();
      const price =
        integerPart && decimalPart
          ? parseFloat(`${integerPart}.${decimalPart}`)
          : null;

      // Extract original price - try multiple selectors and locations
      let originalPrice: number | null = null;

      // First, try data attributes
      const originalPriceDataAttr =
        $element.attr('data-original-price') ||
        $element.attr('data-list-price') ||
        $element
          .find('[data-original-price]')
          .first()
          .attr('data-original-price') ||
        $element.find('[data-list-price]').first().attr('data-list-price') ||
        null;
      if (originalPriceDataAttr) {
        originalPrice = this.parsePrice(originalPriceDataAttr);
        if (originalPrice) {
          this.logger.debug(
            `Extracted original price from data attribute: ${originalPrice}`
          );
        }
      }

      // If not found in data attributes, try text selectors
      if (!originalPrice) {
        const originalPriceSelectors = [
          '.prc-box-orgnl',
          '.prc-box-orgnl span',
          '.original-price',
          '.price-original',
          '.prc-box-sllng',
          '[data-testid="price-original"]',
          '[class*="price-original"]',
          '[class*="prc-orgnl"]',
          '[class*="prc-sllng"]',
          'span[class*="orgnl"]',
        ];
        let originalPriceText = '';

        // First try within element
        for (const selector of originalPriceSelectors) {
          originalPriceText = $element.find(selector).first().text().trim();
          if (originalPriceText) {
            originalPrice = this.parsePrice(originalPriceText);
            if (originalPrice) break;
          }
        }

        // If not found, try parent
        if (!originalPrice) {
          for (const selector of originalPriceSelectors) {
            originalPriceText = $element
              .parent()
              .find(selector)
              .first()
              .text()
              .trim();
            if (originalPriceText) {
              originalPrice = this.parsePrice(originalPriceText);
              if (originalPrice) break;
            }
          }
        }

        // If still not found, try closest parent with price class
        if (!originalPrice) {
          const closestPrice = $element.closest(
            '[class*="price"], [class*="prc"]'
          );
          if (closestPrice.length > 0) {
            for (const selector of originalPriceSelectors) {
              originalPriceText = closestPrice
                .find(selector)
                .first()
                .text()
                .trim();
              if (originalPriceText) {
                originalPrice = this.parsePrice(originalPriceText);
                if (originalPrice) break;
              }
            }
          }
        }

        // Try siblings as last resort
        if (!originalPrice) {
          for (const selector of originalPriceSelectors) {
            originalPriceText = $element
              .siblings()
              .find(selector)
              .first()
              .text()
              .trim();
            if (originalPriceText) {
              originalPrice = this.parsePrice(originalPriceText);
              if (originalPrice) break;
            }
          }
        }
      }

      // Debug log for price extraction
      if (!price && !originalPrice) {
        this.logger.debug(
          `No price found for product: ${title.substring(0, 50)}`
        );
      } else {
        this.logger.debug(
          `Price extracted: ${price}, Original: ${originalPrice}`
        );
      }

      // Calculate discount
      let discountPercentage: number | null = null;
      if (price && originalPrice && originalPrice > price) {
        discountPercentage = ((originalPrice - price) / originalPrice) * 100;
      }

      // Extract image from actual structure: .image in .swiper-slide
      const imageUrl =
        $element.find('.swiper-slide .image').first().attr('src') ||
        $element.find('.image').first().attr('src') ||
        '';

      // Extract URL from actual structure: href in <a class="product-card">
      let url = $element.attr('href') || '';
      if (url && !url.startsWith('http')) {
        url = url.startsWith('/')
          ? `https://www.trendyol.com${url}`
          : `https://www.trendyol.com/${url}`;
      }

      // Extract product ID from URL or data attributes
      let productId: string | null = null;

      // Try data attributes first - check element and children
      productId =
        $element.attr('data-product-id') ||
        $element.attr('data-productid') ||
        $element.attr('data-content-id') ||
        $element.attr('data-id') ||
        $element.find('[data-product-id]').first().attr('data-product-id') ||
        $element.find('[data-content-id]').first().attr('data-content-id') ||
        null;

      // If not found, extract from URL - Trendyol uses multiple patterns:
      // 1. -p-{id} at the end (most common): ...product-name-p-195500569
      // 2. /p/{id} in path: .../p/195500569
      // 3. /brand/{name}/p/{id}: .../brand/name/p/195500569
      if (!productId && url) {
        // Pattern 1: -p-{id} at the end (MOST COMMON in Trendyol category pages)
        let productIdMatch = url.match(/-p-(\d+)(?:\?|$|#)/);
        if (productIdMatch) {
          productId = productIdMatch[1];
          this.logger.debug(
            `Extracted productId from URL pattern -p-: ${productId}`
          );
        } else {
          // Pattern 2: /p/{id} in path
          productIdMatch = url.match(/\/p\/(\d+)/);
          if (productIdMatch) {
            productId = productIdMatch[1];
            this.logger.debug(
              `Extracted productId from URL pattern /p/: ${productId}`
            );
          } else {
            // Pattern 3: /brand/{name}/p/{id}
            productIdMatch = url.match(/\/brand\/[^\/]+\/p\/(\d+)/);
            if (productIdMatch) {
              productId = productIdMatch[1];
              this.logger.debug(
                `Extracted productId from URL pattern /brand/.../p/: ${productId}`
              );
            } else {
              // Pattern 4: Any 6+ digit number in URL (fallback, less reliable)
              productIdMatch = url.match(/(\d{6,})/);
              if (productIdMatch) {
                productId = productIdMatch[1];
                this.logger.debug(
                  `Extracted productId from URL digits: ${productId}`
                );
              }
            }
          }
        }
      }

      // Generate unique ID if still not found - but ONLY if we have complete URL
      // Never generate from partial/incomplete data to avoid duplicate IDs
      if (!productId) {
        if (url && url.length > 30 && url.includes('trendyol.com')) {
          // Use full URL to generate unique hash (only if URL is complete)
          productId = this.generateProductId(url);
          this.logger.debug(
            `Generated productId from complete URL: ${productId.substring(
              0,
              20
            )}...`
          );
        } else if (title && title.length > 10) {
          // Use title as fallback (less reliable but better than nothing)
          productId = this.generateProductId(title);
          this.logger.debug(
            `Generated productId from title: ${productId.substring(0, 20)}...`
          );
        } else {
          // Last resort: unique ID based on timestamp and random
          productId = `temp_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          this.logger.warn(
            `Generated temporary productId: ${productId} - URL or title missing/incomplete`
          );
        }
      }

      // Extract brand from actual structure: .product-brand
      const brand = $element.find('.product-brand').first().text().trim();

      if (!title) {
        this.logger.debug('Product element has no title, skipping');
        return null;
      }

      // Final validation - ensure we have at least productId and url
      if (!productId) {
        this.logger.warn(
          `No productId found for product: ${title.substring(0, 50)}`
        );
        productId = this.generateProductId(url || title);
      }

      if (!url) {
        this.logger.warn(`No URL found for product: ${title.substring(0, 50)}`);
        // Generate a unique URL based on title and productId
        url = `https://www.trendyol.com/p/${productId}`;
      }

      const product = {
        productId,
        title,
        price,
        originalPrice,
        discountPercentage,
        imageUrl,
        url,
        brand,
        additionalData: {
          scrapedAt: new Date().toISOString(),
          sourceUrl: baseUrl,
        },
      };

      // Log final product data for debugging
      this.logger.debug(
        `Final product data: productId="${productId}", url="${url}", title="${title.substring(
          0,
          40
        )}"`
      );

      return product;
    } catch (error) {
      this.logger.warn('Error parsing product element:', error);
      return null;
    }
  }

  private parsePrice(priceText: string): number | null {
    if (!priceText) return null;

    // Remove common currency symbols, spaces, and text
    let cleaned = priceText
      .replace(/[€$£¥₹]/g, '') // Remove currency symbols
      .replace(/[^\d.,\-]/g, '') // Keep only digits, dots, commas, and minus
      .replace(/,/g, '') // Remove commas (thousand separators)
      .trim();

    // Handle negative prices
    const isNegative = cleaned.startsWith('-');
    if (isNegative) {
      cleaned = cleaned.substring(1);
    }

    // Try to parse
    const price = parseFloat(cleaned);

    if (isNaN(price) || price <= 0) {
      return null;
    }

    // Return negative if needed
    return isNegative ? -price : price;
  }

  private generateProductId(url: string): string {
    // Generate a hash-like ID from URL
    return Buffer.from(url).toString('base64').substring(0, 20);
  }

  /**
   * Normalize image URL to get full absolute URL
   */
  /**
   * Add base styles to HTML elements for clean presentation
   */
  private addBaseStylesToHTML(html: string): string {
    if (!html) return '';

    // Parse HTML and add base styles to common elements
    const $ = cheerio.load(html, null, false);

    // Style headings
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      const $el = $(el);
      const tag = $el.prop('tagName')?.toLowerCase();
      const fontSize =
        tag === 'h1'
          ? '24px'
          : tag === 'h2'
          ? '20px'
          : tag === 'h3'
          ? '18px'
          : '16px';
      $el.attr(
        'style',
        `font-size: ${fontSize}; font-weight: bold; margin: 16px 0 8px 0; color: #333;`
      );
    });

    // Style paragraphs
    $('p').each((i, el) => {
      $(el).attr('style', 'margin: 12px 0; line-height: 1.6; color: #333;');
    });

    // Style lists
    $('ul, ol').each((i, el) => {
      $(el).attr(
        'style',
        'margin: 12px 0; padding-left: 24px; line-height: 1.6;'
      );
    });

    $('li').each((i, el) => {
      $(el).attr('style', 'margin: 6px 0; color: #333;');
    });

    // Convert remaining divs with only text to paragraphs for better structure
    $('div').each((i, el) => {
      const $el = $(el);
      const children = $el.children();
      const text = $el.text().trim();
      const hasBlockChildren =
        $el.children('h1, h2, h3, h4, h5, h6, p, ul, ol, table').length > 0;

      // If div has only text content (no block children, no child elements), convert to paragraph
      if (text.length > 0 && children.length === 0 && !hasBlockChildren) {
        const $p = $('<p></p>');
        $p.attr('style', 'margin: 8px 0; line-height: 1.6; color: #333;');
        $p.text(text);
        $el.replaceWith($p);
      } else if (!$el.attr('style')) {
        // Style remaining divs that are containers
        const allChildrenAreDivs =
          children.length > 0 &&
          children.toArray().every((child) => child.tagName === 'div');

        // If all children are divs, this is likely a wrapper - no margin
        if (allChildrenAreDivs && !hasBlockChildren) {
          $el.attr('style', 'margin: 0; padding: 0; display: block;');
        } else if (hasBlockChildren) {
          // Container with block elements - minimal margin
          $el.attr('style', 'margin: 12px 0; padding: 0; display: block;');
        } else if (text.length > 0 && children.length === 0) {
          // Div with only text - convert to paragraph
          const $p = $('<p></p>');
          $p.attr('style', 'margin: 8px 0; line-height: 1.6; color: #333;');
          $p.text(text);
          $el.replaceWith($p);
        } else {
          // Empty or wrapper div
          $el.attr('style', 'margin: 0; padding: 0; display: block;');
        }
      }
    });

    // Style strong/bold
    $('strong, b').each((i, el) => {
      $(el).attr('style', 'font-weight: bold; color: #222;');
    });

    // Style emphasis
    $('em, i').each((i, el) => {
      $(el).attr('style', 'font-style: italic;');
    });

    return $.html();
  }

  private normalizeImageUrl(imgSrc: string): string | null {
    if (!imgSrc || imgSrc.trim().length === 0) {
      return null;
    }

    let fullUrl = imgSrc.trim();

    // Remove query parameters that might contain size info
    fullUrl = fullUrl.split('?')[0];

    // Handle relative URLs
    if (!fullUrl.startsWith('http')) {
      if (fullUrl.startsWith('//')) {
        fullUrl = `https:${fullUrl}`;
      } else if (fullUrl.startsWith('/')) {
        fullUrl = `https://cdn.dsmcdn.com${fullUrl}`;
      } else {
        fullUrl = `https://cdn.dsmcdn.com/${fullUrl}`;
      }
    }

    // Remove size parameters to get original/high quality image
    fullUrl = fullUrl
      .replace(/\/mnresize\/\d+\/-\//, '/')
      .replace(/\/w\/\d+\/h\/\d+\//, '/')
      .replace(/\/\d+x\d+\//, '/')
      .replace(/\/thumb\//, '/')
      .replace(/\/thumbnail\//, '/');

    // Ensure it's a valid image URL
    if (fullUrl.includes('dsmcdn.com') || fullUrl.includes('trendyol.com')) {
      return fullUrl;
    }

    return null;
  }

  private buildPageUrl(baseUrl: string, page: number): string {
    // Handle pagination
    if (page === 1) return baseUrl;

    const url = new URL(baseUrl);
    url.searchParams.set('pi', page.toString());
    return url.toString();
  }

  private buildApiUrl(baseUrl: string, page: number): string {
    try {
      const url = new URL(baseUrl);
      // Try common Trendyol API patterns
      // This is a guess - actual API endpoint may differ
      const pathParts = url.pathname.split('/').filter((p) => p);

      // Common pattern: /api/products or similar
      // Since we don't know the exact API, return a modified URL
      url.pathname = '/sr';
      url.searchParams.set('pi', page.toString());
      return url.toString();
    } catch {
      return baseUrl;
    }
  }

  private parseApiResponse(
    apiData: any,
    baseUrl: string
  ): Partial<TrendyolProduct>[] {
    const products: Partial<TrendyolProduct>[] = [];

    try {
      let items: any[] = [];

      // Handle different API response structures
      if (apiData.result?.products) {
        items = apiData.result.products;
      } else if (apiData.products) {
        items = apiData.products;
      } else if (apiData.result && Array.isArray(apiData.result)) {
        items = apiData.result;
      } else if (Array.isArray(apiData)) {
        items = apiData;
      } else if (apiData.content?.products) {
        items = apiData.content.products;
      }

      items.forEach((item: any) => {
        try {
          const product: Partial<TrendyolProduct> = {
            productId:
              item.id?.toString() ||
              item.productId?.toString() ||
              item.contentId?.toString() ||
              this.generateProductId(item.url || item.link || ''),
            title: item.name || item.title || item.productName || '',
            description: item.description || item.shortDescription,
            price:
              typeof (item.price || item.salePrice || item.discountedPrice) ===
              'string'
                ? parseFloat(
                    (
                      item.price ||
                      item.salePrice ||
                      item.discountedPrice ||
                      '0'
                    ).replace(/,/g, '')
                  ) || null
                : item.price || item.salePrice || item.discountedPrice || null,
            originalPrice:
              typeof (
                item.originalPrice ||
                item.listPrice ||
                item.marketPrice
              ) === 'string'
                ? parseFloat(
                    (
                      item.originalPrice ||
                      item.listPrice ||
                      item.marketPrice ||
                      '0'
                    ).replace(/,/g, '')
                  ) || null
                : item.originalPrice ||
                  item.listPrice ||
                  item.marketPrice ||
                  null,
            imageUrl: item.imageUrl || item.image || item.images?.[0],
            imageUrls: item.images || (item.imageUrl ? [item.imageUrl] : []),
            url: item.url || item.link || item.productUrl || '',
            brand: item.brand?.name || item.brand || item.brandName,
            category: item.category?.name || item.category || item.categoryName,
            additionalData: {
              scrapedAt: new Date().toISOString(),
              sourceUrl: baseUrl,
              source: 'api',
              rawData: item,
            },
          };

          // Calculate discount if needed
          if (
            product.price &&
            product.originalPrice &&
            product.originalPrice > product.price
          ) {
            product.discountPercentage =
              ((product.originalPrice - product.price) /
                product.originalPrice) *
              100;
          }

          // Fix URL if relative
          if (product.url && !product.url.startsWith('http')) {
            product.url = `https://www.trendyol.com${product.url}`;
          }

          if (product.title) {
            products.push(product);
          }
        } catch (error) {
          this.logger.warn('Error parsing API product item:', error);
        }
      });
    } catch (error) {
      this.logger.error('Error parsing API response:', error);
    }

    return products;
  }

  /**
   * Generate slug from URL, translate it, and Persianize it
   */
  private async generateSlugFromUrl(
    url: string
  ): Promise<{ slug: string; tokensUsed: number }> {
    if (!url) return { slug: '', tokensUsed: 0 };

    try {
      // Extract the last part of URL (after last /)
      const urlParts = url.split('/');
      let urlSlug = urlParts[urlParts.length - 1] || '';

      // Remove query parameters if any
      urlSlug = urlSlug.split('?')[0];

      // Remove -p-{id} pattern if exists
      urlSlug = urlSlug.replace(/-p-\d+$/, '');

      // If slug is empty or too short, use the full URL path
      if (!urlSlug || urlSlug.length < 3) {
        urlSlug = urlParts.slice(-2).join('-');
      }

      // Replace hyphens with spaces for translation
      const slugForTranslation = urlSlug.replace(/-/g, ' ');

      // Translate the slug using OpenAI
      let translatedSlug = slugForTranslation;
      let tokensUsed = 0;
      if (this.enableTranslation && slugForTranslation.trim().length > 0) {
        try {
          this.logger.debug(`Translating slug: ${slugForTranslation}`);
          const translationResult = await this.translateWithOpenAI(
            slugForTranslation
          );
          translatedSlug = translationResult.translatedText;
          tokensUsed = translationResult.tokensUsed;
          this.logger.debug(
            `Translated slug: ${translatedSlug}, tokens: ${tokensUsed}`
          );
        } catch (error) {
          this.logger.error(`Error translating slug: ${error.message}`);
          // Use original if translation fails
          translatedSlug = slugForTranslation;
        }
      } else if (!this.enableTranslation) {
        this.logger.debug('Translation disabled, using original slug');
      }

      // Create Persian slug (preserve Persian characters, don't transliterate)
      // Remove HTML tags if any
      let cleanSlug = translatedSlug.replace(/<[^>]*>/g, '');

      // Remove special characters but keep Persian/Arabic characters and numbers
      // Unicode ranges: Persian/Arabic (\u0600-\u06FF), Extended Arabic (\u0750-\u077F),
      // Arabic Supplement (\u08A0-\u08FF), Arabic Presentation Forms (\uFB50-\uFDFF, \uFE70-\uFEFF)
      cleanSlug = cleanSlug
        .replace(
          /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s-]/g,
          ''
        ) // Keep Persian/Arabic and alphanumeric
        .trim();

      // Replace spaces and multiple hyphens with single hyphen
      let persianSlug = cleanSlug
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

      // Don't convert to lowercase - keep Persian characters as they are
      // Only lowercase English letters if needed
      persianSlug = persianSlug.replace(/[A-Z]/g, (char) => char.toLowerCase());

      return { slug: persianSlug, tokensUsed };
    } catch (error) {
      this.logger.error(`Error generating slug from URL: ${error.message}`);
      return { slug: '', tokensUsed: 0 };
    }
  }

  /**
   * Round number to nearest thousand (round up)
   * Example: 6318645 -> 6319000
   */
  private roundToNearestThousand(price: number): number {
    return Math.ceil(price / 1000) * 1000;
  }

  /**
   * Translate multiple texts in batch using OpenAI with structured format
   * Returns translated texts with same structure and token count
   */
  private async translateBatchWithOpenAI(
    texts: {
      title?: string;
      description?: string;
      slug?: string;
      colors?: string[];
      sizes?: string[];
    },
    targetLanguage: string = 'fa'
  ): Promise<{
    title?: string;
    description?: string;
    slug?: string;
    colors?: string[];
    sizes?: string[];
    tokensUsed: number;
  }> {
    return this.aiService.translateBatch(texts, targetLanguage);
  }

  /**
   * Translate text using OpenAI and return translated text with token count
   */
  private async translateWithOpenAI(
    text: string,
    targetLanguage: string = 'fa'
  ): Promise<{ translatedText: string; tokensUsed: number }> {
    return this.aiService.translateText(text, targetLanguage);
  }

  /**
   * Convert TRY price to Toman using CurrencyPrices
   */
  private async convertPriceToToman(
    priceInTry: number | string | null
  ): Promise<number | null> {
    // Convert string to number if needed
    let price: number | null = null;
    if (typeof priceInTry === 'string') {
      price = parseFloat(priceInTry.replace(/,/g, ''));
    } else if (typeof priceInTry === 'number') {
      price = priceInTry;
    }

    if (!price || price <= 0 || isNaN(price)) {
      return null;
    }

    try {
      const currency = await this.CurrencyPricesRepo.findOne({
        where: { slug: 'TRY' },
      });

      if (!currency || !currency.price) {
        this.logger.warn(
          'TRY currency not found or price is null, skipping conversion'
        );
        return null;
      }

      // Convert TRY to Toman
      // currency.price is the price of 1 TRY in Toman
      const priceInToman = price * Number(currency.price / 10);

      this.logger.debug(
        `Converted ${price} TRY to ${priceInToman.toFixed(2)} Toman (rate: ${
          currency.price
        })`
      );

      return Math.round(priceInToman * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      this.logger.error(`Error converting price to Toman: ${error.message}`);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Scrape detailed product information from product detail page
   */
  async scrapeProductDetails(
    productUrl: string,
    options?: {
      markupPercentage?: number;
      category?: string;
    }
  ): Promise<Partial<TrendyolProduct> | null> {
    try {
      this.logger.debug(`Scraping product details from: ${productUrl}`);

      // Extract SKU from URL and check if it exists in variants (JSONB)
      // If SKU exists, this product is already scraped as a variant of another product
      const skuMatch = productUrl.match(/-p-(\d+)(?:\?|$|#)/);
      if (skuMatch && skuMatch[1]) {
        const sku = skuMatch[1];

        // Check if this SKU exists in any product's variants (JSONB search)
        const productWithSku = await this.trendyolProductRepository
          .createQueryBuilder('product')
          .where('product.variants::text LIKE :sku', {
            sku: `%"sku":"${sku}"%`,
          })
          .orWhere('product.variants::text LIKE :sku2', {
            sku2: `%"sku": "${sku}"%`,
          })
          .getOne();

        if (productWithSku) {
          this.logger.debug(
            `Skipping product details scrape: SKU ${sku} already exists as variant in product ${productWithSku.id} (productId: ${productWithSku.productId}). This product is already scraped.`
          );
          return null; // Return null to skip scraping - product already exists as variant
        }
      }

      const response = await firstValueFrom(
        this.httpService.get(productUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        })
      );

      const $ = cheerio.load(response.data);
      const details: Partial<TrendyolProduct> = {
        tokensUsed: 0, // Initialize token counter
        variants: [], // Initialize variants array
      };

      // Initialize variables that might be used in JSON-LD parsing
      let rating: number | null = null;
      let reviewCount: number | null = null;

      // Extract price from actual structure: data-testid="sale-price"
      const integerPart = $('[data-testid="sale-price"] .integer-part')
        .first()
        .text()
        .trim()
        .replace(',', '');
      const decimalPart = $('[data-testid="sale-price"] .decimal-part')
        .first()
        .text()
        .trim();
      if (integerPart && decimalPart) {
        const htmlPrice = parseFloat(`${integerPart}.${decimalPart}`);
        if (!isNaN(htmlPrice)) {
          details.price = htmlPrice;
        }
      }

      // Extract original price
      const originalPriceSelectors = [
        '.prc-box-orgnl',
        '.prc-box-orgnl span',
        '.original-price',
        '.prc-box-sllng',
        'span[class*="orgnl"]',
        '.prc-orgnl',
      ];

      let originalPriceText = '';
      for (const selector of originalPriceSelectors) {
        originalPriceText = $(selector).first().text().trim();
        if (originalPriceText) {
          const originalPrice = this.parsePrice(originalPriceText);
          if (originalPrice) {
            details.originalPrice = originalPrice;
            this.logger.debug(
              `Extracted original price from detail page: ${originalPrice}`
            );
            break;
          }
        }
      }

      // Calculate discount percentage
      if (
        details.price &&
        details.originalPrice &&
        details.originalPrice > details.price
      ) {
        details.discountPercentage =
          ((details.originalPrice - details.price) / details.originalPrice) *
          100;
      }

      // Price conversion to Toman will be done after JSON-LD extraction
      // to ensure we have the price from all possible sources

      // Extract description HTML from product-info-main-container (without CSS)
      let description = '';
      const productInfoContainer = $('.product-info-main-container').first();

      if (productInfoContainer.length > 0) {
        // Get product-info-content first (before removing classes)
        const productInfoContent = productInfoContainer
          .find('.product-info-content')
          .first();

        if (productInfoContent.length > 0) {
          // Clone to avoid modifying original
          const cloned = productInfoContent.clone();

          // Remove script tags
          cloned.find('script').remove();

          // Remove all images (product images should not be in description)
          cloned.find('img').remove();
          cloned
            .find(
              '.product-image, .content-description-wrapper, .content-description-main-container, .product-description-section'
            )
            .remove();

          // Remove all buttons
          cloned.find('button').remove();

          // Remove all links but keep their text content
          cloned.find('a').each((i, el) => {
            const $link = $(el);
            const text = $link.text().trim();
            $link.replaceWith(text || '');
          });

          // Remove all style attributes (we'll add our own base styles)
          cloned.find('*').removeAttr('style');
          cloned.removeAttr('style');

          // Remove all class attributes
          cloned.find('*').removeAttr('class');
          cloned.removeAttr('class');

          // Remove all id attributes
          cloned.find('*').removeAttr('id');
          cloned.removeAttr('id');

          // Remove all data attributes
          cloned.find('*').each((i, el) => {
            const $el = $(el);
            const attrs = $el[0]?.attribs || {};
            Object.keys(attrs).forEach((attr) => {
              if (attr.startsWith('data-')) {
                $el.removeAttr(attr);
              }
            });
          });

          // Remove data attributes from cloned element itself
          const clonedEl = cloned[0];
          if (clonedEl?.attribs) {
            Object.keys(clonedEl.attribs).forEach((attr) => {
              if (attr.startsWith('data-')) {
                cloned.removeAttr(attr);
              }
            });
          }

          // Get HTML content and clean up structure
          let htmlContent = cloned.html() || '';

          if (htmlContent) {
            // Parse with cheerio to better clean up structure
            const $clean = cheerio.load(htmlContent, null, false);

            // Remove empty divs, spans, etc.
            $clean('div:empty, span:empty, p:empty, button:empty').remove();
            $clean('button').remove(); // Remove all buttons

            // FIRST: Convert attribute-item structure (Trendyol's standard structure)
            // Look for divs with class "name" and "value" children
            $clean('[class*="attribute-item"], [class*="attribute"]').each(
              (i, el) => {
                const $el = $clean(el);
                const nameEl = $el.find('[class*="name"], .name').first();
                const valueEl = $el.find('[class*="value"], .value').first();

                if (nameEl.length > 0 && valueEl.length > 0) {
                  const labelText = nameEl.text().trim();
                  const valueText = valueEl.text().trim();

                  if (labelText && valueText) {
                    const $p = $clean('<p></p>');
                    $p.attr(
                      'style',
                      'margin: 8px 0; line-height: 1.6; color: #333;'
                    );
                    $p.html(
                      `<strong style="font-weight: bold; color: #222;">${labelText}:</strong> ${valueText}`
                    );
                    $el.replaceWith($p);
                  }
                }
              }
            );

            // SECOND: Convert generic label-value pairs (divs that contain exactly two divs with text only)
            // This should run after attribute-item conversion
            $clean('div').each((i, el) => {
              const $el = $clean(el);

              // Skip if already processed or has specific classes
              const className = $el.attr('class') || '';
              if (
                className.includes('attribute') ||
                className.includes('name') ||
                className.includes('value')
              ) {
                return;
              }

              const children = $el.children('div');
              if (children.length === 2) {
                const firstDiv = children.first();
                const secondDiv = children.eq(1);
                const firstText = firstDiv.text().trim();
                const secondText = secondDiv.text().trim();

                // Check if both divs have only text (no nested divs or complex structure)
                const firstHasOnlyText =
                  firstDiv.children().length === 0 && firstText.length > 0;
                const secondHasOnlyText =
                  secondDiv.children().length === 0 && secondText.length > 0;

                // If both have only text and no other children, convert to a paragraph
                if (
                  firstHasOnlyText &&
                  secondHasOnlyText &&
                  $el.children().length === 2
                ) {
                  const $p = $clean('<p></p>');
                  $p.attr(
                    'style',
                    'margin: 8px 0; line-height: 1.6; color: #333;'
                  );
                  $p.html(
                    `<strong style="font-weight: bold; color: #222;">${firstText}:</strong> ${secondText}`
                  );
                  $el.replaceWith($p);
                }
              }
            });

            // THIRD: Carefully unwrap only wrapper divs (not content divs)
            // Be very selective - only unwrap if it's clearly a wrapper
            for (let iteration = 0; iteration < 10; iteration++) {
              let changed = false;
              $clean('div').each((i, el) => {
                const $el = $clean(el);
                const children = $el.children();
                const directText = $el
                  .contents()
                  .filter(
                    (idx, node) =>
                      node.type === 'text' && node.data.trim().length > 0
                  ).length;

                // Only unwrap if:
                // 1. Has exactly one child
                // 2. No direct text
                // 3. Child is a div
                // 4. Parent has no style attribute (wrapper)
                // 5. Child doesn't have block elements (h1-h6, p, ul, ol, table)
                if (
                  children.length === 1 &&
                  directText === 0 &&
                  !$el.attr('style')
                ) {
                  const child = children.first();
                  const childElement = child[0];
                  const childTag = childElement?.tagName?.toLowerCase();

                  if (childTag === 'div') {
                    const childStyle = child.attr('style') || '';
                    const hasBlockChildren =
                      child.children('h1, h2, h3, h4, h5, h6, p, ul, ol, table')
                        .length > 0;
                    const childText = child.text().trim();
                    const childHasOnlyDivs =
                      child.children().length > 0 &&
                      child
                        .children()
                        .toArray()
                        .every((c: any) => c.tagName === 'div');

                    // Only unwrap if:
                    // - Child has no block elements
                    // - Child has no text OR child has only nested divs (wrapper)
                    if (
                      !hasBlockChildren &&
                      (childText.length === 0 || childHasOnlyDivs)
                    ) {
                      $el.replaceWith(child);
                      if (childStyle) {
                        $clean(child).attr('style', childStyle);
                      }
                      changed = true;
                    }
                  }
                }
              });
              if (!changed) break;
            }

            // Get cleaned HTML
            htmlContent = $clean('body').html() || $clean.html();

            // Remove empty tags with regex (final cleanup)
            htmlContent = htmlContent
              .replace(/<div[^>]*>\s*<\/div>/gi, '')
              .replace(/<span[^>]*>\s*<\/span>/gi, '')
              .replace(/<p[^>]*>\s*<\/p>/gi, '')
              .replace(/<button[^>]*>.*?<\/button>/gi, '') // Remove any remaining buttons
              .replace(/\n\s*\n/g, '') // Remove multiple newlines
              .replace(/>\s+</g, '><') // Remove whitespace between tags
              .replace(/\n/g, '') // Remove all newlines
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();

            // Add base styles to HTML
            htmlContent = this.addBaseStylesToHTML(htmlContent);

            // Wrap in a div with base container styles (only if we have content)
            if (htmlContent && htmlContent.length > 10) {
              description = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 100%;">${htmlContent}</div>`;
            } else {
              description = htmlContent;
            }

            description = description.trim();
            this.logger.debug(
              `Extracted description HTML from product-info-content (${description.length} chars)`
            );
          }
        } else {
          this.logger.warn(
            'product-info-content not found inside product-info-main-container'
          );
        }
      } else {
        this.logger.warn('product-info-main-container not found');
      }

      // Fallback: Try JSON-LD description if HTML not found
      if (!description || description.length < 50) {
        const metaDesc = $('meta[name="description"]').attr('content');
        if (metaDesc && metaDesc.length > 50) {
          description = `<p>${metaDesc}</p>`;
          this.logger.debug(`Using meta description as fallback`);
        }
      }

      if (description && description.length > 20) {
        details.description = description;
        this.logger.debug(
          `Final description length: ${description.length} characters`
        );
      } else {
        this.logger.warn('No description found for product');
      }

      // Extract brand from h1 or brand section
      const brandSelectors = [
        'h1 span',
        'h1 a',
        '.product-brand-name',
        '.brand-name',
        '[data-testid="brand"]',
        '.pr-new-br',
      ];

      for (const selector of brandSelectors) {
        const brand = $(selector).first().text().trim();
        if (brand && brand.length > 0 && brand.length < 100) {
          details.brand = brand;
          break;
        }
      }

      // Extract category from breadcrumb
      const categorySelectors = [
        '.breadcrumb a',
        '.category-path a',
        '[data-testid="category"]',
        '.breadcrumb-item a',
      ];

      const categories: string[] = [];
      $(categorySelectors[0]).each((i, el) => {
        const cat = $(el).text().trim();
        if (
          cat &&
          !cat.includes('Anasayfa') &&
          !cat.includes('Home') &&
          cat.length > 1
        ) {
          categories.push(cat);
        }
      });
      if (categories.length > 0) {
        details.category = categories.join(' > ');
      }

      // Extract images from actual structure: data-testid="image" in product-image-gallery-container
      const imageUrls: string[] = [];
      $(
        '[data-testid="product-image-gallery-container"] [data-testid="image"]'
      ).each((i, el) => {
        const src = $(el).attr('src');
        if (src) {
          const fullUrl = this.normalizeImageUrl(src);
          if (fullUrl && !imageUrls.includes(fullUrl)) {
            imageUrls.push(fullUrl);
          }
        }
      });

      // Also try JSON-LD for images
      $('script[type="application/ld+json"]').each((i, script) => {
        try {
          const data = JSON.parse($(script).html() || '{}');
          if (data['@type'] === 'ProductGroup' && data.image?.contentUrl) {
            const images = Array.isArray(data.image.contentUrl)
              ? data.image.contentUrl
              : [data.image.contentUrl];
            images.forEach((img: string) => {
              const fullUrl = this.normalizeImageUrl(img);
              if (fullUrl && !imageUrls.includes(fullUrl)) {
                imageUrls.push(fullUrl);
              }
            });
          }
        } catch (error) {
          // Skip invalid JSON
        }
      });

      // Filter out non-product images (sticker-stamp, icons, etc.)
      const finalImages = [
        ...new Set(
          imageUrls
            .map((url) =>
              url.replace(/\/mnresize\/\d+\/-\//, '/').replace(/\?.*$/, '')
            )
            .filter((url) => {
              const lowerUrl = url.toLowerCase();
              // Filter out sticker-stamp, icons, logos, etc.
              return (
                !lowerUrl.includes('sticker-stamp') &&
                !lowerUrl.includes('indexing-sticker') &&
                !lowerUrl.includes('/icon') &&
                !lowerUrl.includes('/logo') &&
                !lowerUrl.includes('/banner') &&
                lowerUrl.includes('/product/')
              );
            })
        ),
      ];

      if (finalImages.length > 0) {
        details.imageUrl = finalImages[0];
        details.imageUrls = finalImages;
        this.logger.debug(
          `Extracted ${finalImages.length} images from detail page`
        );
      } else {
        this.logger.warn('No product images found on detail page');
      }

      // Extract product specifications/attributes from JSON-LD or script tags
      const scripts = $('script[type="application/ld+json"]');
      this.logger.debug(`Found ${scripts.length} JSON-LD script tags`);
      let jsonLdProcessed = 0;
      scripts.each((i, script) => {
        try {
          const scriptContent = $(script).html();
          if (scriptContent) {
            const data = JSON.parse(scriptContent);
            jsonLdProcessed++;
            this.logger.debug(
              `JSON-LD script ${jsonLdProcessed}: @type=${
                data['@type']
              }, hasVariant=${!!data.hasVariant}, hasVariantLength=${
                data.hasVariant?.length || 0
              }`
            );
            // Support both Product and ProductGroup types
            if (
              data['@type'] === 'Product' ||
              data['@type'] === 'ProductGroup'
            ) {
              // Extract price from offers
              if (data.offers?.price && !details.price) {
                const priceValue =
                  typeof data.offers.price === 'string'
                    ? parseFloat(data.offers.price.replace(',', '.'))
                    : parseFloat(data.offers.price);
                if (!isNaN(priceValue)) {
                  details.price = priceValue;
                }
              }
              if (
                data.offers?.priceSpecification?.value &&
                !details.originalPrice
              ) {
                const origPrice =
                  typeof data.offers.priceSpecification.value === 'string'
                    ? parseFloat(
                        data.offers.priceSpecification.value.replace(',', '.')
                      )
                    : parseFloat(data.offers.priceSpecification.value);
                if (!isNaN(origPrice)) {
                  details.originalPrice = origPrice;
                }
              }
              // Extract description (prioritize JSON-LD over meta tag)
              if (
                data.description &&
                (!details.description || details.description.length < 100)
              ) {
                details.description = data.description;
              }
              if (data.brand?.name && !details.brand) {
                details.brand = data.brand.name;
              }
              // Extract category from breadcrumb in JSON-LD
              if (data.breadcrumb?.itemListElement && !details.category) {
                const categories = data.breadcrumb.itemListElement
                  .map((item: any) => item.item?.name)
                  .filter(
                    (name: string) =>
                      name &&
                      !name.includes('Anasayfa') &&
                      !name.includes('Home')
                  );
                if (categories.length > 0) {
                  details.category = categories.join(' > ');
                }
              }

              // Extract additional properties
              if (
                data.additionalProperty &&
                Array.isArray(data.additionalProperty)
              ) {
                data.additionalProperty.forEach((prop: any) => {
                  if (prop.name && prop.value) {
                    specifications[prop.name] = prop.value;
                  }
                });
              }

              // Extract aggregateRating if available
              if (data.aggregateRating) {
                if (data.aggregateRating.ratingValue) {
                  rating = parseFloat(data.aggregateRating.ratingValue);
                }
                if (data.aggregateRating.reviewCount) {
                  reviewCount = parseInt(data.aggregateRating.reviewCount);
                }
              }

              // Extract variants from hasVariant (can be in ProductGroup)
              // Each variant in hasVariant is a color variant with multiple sizes
              this.logger.debug(
                `Checking for variants: data.hasVariant exists=${!!data.hasVariant}, isArray=${Array.isArray(
                  data.hasVariant
                )}, length=${data.hasVariant?.length || 0}`
              );
              if (data.hasVariant && Array.isArray(data.hasVariant)) {
                this.logger.log(
                  `Found ${data.hasVariant.length} color variants in JSON-LD hasVariant`
                );
                const extractedVariants: any[] = [];
                data.hasVariant.forEach((variant: any, index: number) => {
                  this.logger.debug(
                    `Processing variant ${index + 1}/${
                      data.hasVariant.length
                    }: @type=${variant['@type']}, color=${
                      variant.color
                    }, sizes=${JSON.stringify(variant.size)}`
                  );
                  if (variant['@type'] === 'Product') {
                    const color = variant.color;
                    const sizes =
                      variant.size && Array.isArray(variant.size)
                        ? variant.size
                        : [];
                    const basePrice = variant.offers?.price
                      ? typeof variant.offers.price === 'string'
                        ? parseFloat(variant.offers.price.replace(',', '.'))
                        : parseFloat(variant.offers.price)
                      : null;

                    // Extract stock availability from offers.availability
                    const availability = variant.offers?.availability;
                    const inStock =
                      availability === 'https://schema.org/InStock' ||
                      availability === 'InStock' ||
                      availability === 'https://schema.org/InStoreOnly' ||
                      availability === 'InStoreOnly';

                    // Create a variant for each size
                    if (sizes.length > 0) {
                      sizes.forEach((size: string) => {
                        const variantData: any = {
                          color: color,
                          sizeValue: size,
                        };
                        if (variant.sku) variantData.sku = variant.sku;
                        if (variant.image) variantData.image = variant.image;
                        if (basePrice && !isNaN(basePrice)) {
                          variantData.price = basePrice;
                        }
                        if (variant.offers?.priceSpecification?.value) {
                          const origPrice =
                            typeof variant.offers.priceSpecification.value ===
                            'string'
                              ? parseFloat(
                                  variant.offers.priceSpecification.value.replace(
                                    ',',
                                    '.'
                                  )
                                )
                              : parseFloat(
                                  variant.offers.priceSpecification.value
                                );
                          if (!isNaN(origPrice)) {
                            variantData.originalPrice = origPrice;
                          }
                        }
                        // Set stock availability
                        variantData.inStock = inStock;
                        extractedVariants.push(variantData);
                      });
                    } else {
                      // If no sizes, create a single variant with just color
                      const variantData: any = {};
                      if (variant.sku) variantData.sku = variant.sku;
                      if (color) variantData.color = color;
                      if (variant.image) variantData.image = variant.image;
                      if (basePrice && !isNaN(basePrice)) {
                        variantData.price = basePrice;
                      }
                      if (variant.offers?.priceSpecification?.value) {
                        const origPrice =
                          typeof variant.offers.priceSpecification.value ===
                          'string'
                            ? parseFloat(
                                variant.offers.priceSpecification.value.replace(
                                  ',',
                                  '.'
                                )
                              )
                            : parseFloat(
                                variant.offers.priceSpecification.value
                              );
                        if (!isNaN(origPrice)) {
                          variantData.originalPrice = origPrice;
                        }
                      }
                      // Set stock availability
                      variantData.inStock = inStock;
                      if (Object.keys(variantData).length > 0) {
                        extractedVariants.push(variantData);
                      }
                    }
                  }
                });
                if (extractedVariants.length > 0) {
                  details.variants = extractedVariants;
                  this.logger.log(
                    `Extracted ${extractedVariants.length} variants from JSON-LD hasVariant (expanded from ${data.hasVariant.length} color variants)`
                  );
                  this.logger.debug(
                    `Sample variant: ${JSON.stringify(extractedVariants[0])}`
                  );
                }
              }

              // Also check for variants in any nested structure
              if (
                (!details.variants || details.variants.length === 0) &&
                data.variants
              ) {
                if (Array.isArray(data.variants)) {
                  const extractedVariants: any[] = [];
                  data.variants.forEach((variant: any) => {
                    const variantData: any = {};
                    if (variant.itemNumber)
                      variantData.itemNumber = variant.itemNumber;
                    if (variant.value) variantData.sizeValue = variant.value;
                    if (variant.barcode) variantData.barcode = variant.barcode;
                    if (variant.inStock !== undefined)
                      variantData.inStock = variant.inStock;
                    if (variant.price?.value) {
                      variantData.price =
                        typeof variant.price.value === 'string'
                          ? parseFloat(variant.price.value.replace(',', '.'))
                          : parseFloat(variant.price.value);
                    }
                    if (variant.beautifiedValue)
                      variantData.beautifiedValue = variant.beautifiedValue;
                    if (Object.keys(variantData).length > 0) {
                      extractedVariants.push(variantData);
                    }
                  });
                  if (extractedVariants.length > 0) {
                    details.variants = extractedVariants;
                    this.logger.debug(
                      `Extracted ${extractedVariants.length} variants from JSON-LD variants array`
                    );
                  }
                }
              }
            }
          }
        } catch (error) {
          // Skip invalid JSON
          this.logger.debug(
            `Error parsing JSON-LD script ${i + 1}: ${error.message}`
          );
        }
      });

      this.logger.debug(
        `Processed ${jsonLdProcessed} JSON-LD scripts, current variants count: ${
          details.variants?.length || 0
        }`
      );

      // Also try to extract from window.__INITIAL_STATE__ or similar
      const inlineScripts = $('script:not([src])');
      inlineScripts.each((i, script) => {
        try {
          const scriptText = $(script).html() || '';

          // Look for product data in window variables
          const productDataMatches = scriptText.match(
            /window\.__[A-Z_]+__\s*=\s*({.+?});/s
          );
          if (productDataMatches) {
            try {
              const productData = JSON.parse(productDataMatches[1]);
              // Try to find product info in nested structure
              if (productData.product || productData.productDetail) {
                const product =
                  productData.product || productData.productDetail;
                if (
                  product.specifications &&
                  !Object.keys(specifications).length
                ) {
                  Object.assign(specifications, product.specifications);
                }

                // Extract variants from window object or update stock info
                if (product.variants && Array.isArray(product.variants)) {
                  if (!details.variants || details.variants.length === 0) {
                    // Extract variants if not already extracted
                    const extractedVariants: any[] = [];
                    product.variants.forEach((variant: any) => {
                      const variantData: any = {};
                      if (variant.itemNumber)
                        variantData.itemNumber = variant.itemNumber;
                      if (variant.value) variantData.sizeValue = variant.value;
                      if (variant.barcode)
                        variantData.barcode = variant.barcode;
                      if (variant.inStock !== undefined)
                        variantData.inStock = variant.inStock;
                      if (variant.price?.value) {
                        variantData.price =
                          typeof variant.price.value === 'string'
                            ? parseFloat(variant.price.value.replace(',', '.'))
                            : parseFloat(variant.price.value);
                      }
                      if (Object.keys(variantData).length > 0) {
                        extractedVariants.push(variantData);
                      }
                    });
                    if (extractedVariants.length > 0) {
                      details.variants = extractedVariants;
                      this.logger.debug(
                        `Extracted ${extractedVariants.length} variants from window object`
                      );
                    }
                  } else {
                    // Update stock info for existing variants based on size
                    const stockMap = new Map<string, boolean>();
                    product.variants.forEach((variant: any) => {
                      if (variant.value && variant.inStock !== undefined) {
                        stockMap.set(variant.value, variant.inStock);
                      }
                    });

                    let updatedCount = 0;
                    details.variants.forEach((variant: any) => {
                      if (
                        variant.sizeValue &&
                        stockMap.has(variant.sizeValue)
                      ) {
                        variant.inStock = stockMap.get(variant.sizeValue);
                        updatedCount++;
                      }
                    });

                    if (updatedCount > 0) {
                      this.logger.debug(
                        `Updated stock info for ${updatedCount} variants from window object (per-size stock)`
                      );
                    }
                  }
                }
              }
            } catch (e) {
              // Skip if not valid JSON
            }
          }

          // Also look for size-picker props which contain variants with accurate stock info
          const sizePickerMatches = scriptText.match(
            /window\["__envoy_size-picker__PROPS"\]\s*=\s*({.+?});/s
          );
          if (sizePickerMatches) {
            try {
              const sizePickerData = JSON.parse(sizePickerMatches[1]);
              if (
                sizePickerData.product?.variants &&
                Array.isArray(sizePickerData.product.variants)
              ) {
                // If we already have variants from JSON-LD, update their stock info
                if (details.variants && details.variants.length > 0) {
                  // Create a map of size -> stock info from size-picker
                  const stockMap = new Map<string, boolean>();
                  sizePickerData.product.variants.forEach((variant: any) => {
                    if (variant.value && variant.inStock !== undefined) {
                      stockMap.set(variant.value, variant.inStock);
                    }
                  });

                  // Update stock info for existing variants
                  let updatedCount = 0;
                  details.variants.forEach((variant: any) => {
                    if (variant.sizeValue && stockMap.has(variant.sizeValue)) {
                      variant.inStock = stockMap.get(variant.sizeValue);
                      updatedCount++;
                    }
                  });

                  if (updatedCount > 0) {
                    this.logger.debug(
                      `Updated stock info for ${updatedCount} variants from size-picker`
                    );
                  }
                } else {
                  // If no variants yet, extract from size-picker
                  const extractedVariants: any[] = [];
                  sizePickerData.product.variants.forEach((variant: any) => {
                    const variantData: any = {};
                    if (variant.itemNumber)
                      variantData.itemNumber = variant.itemNumber;
                    if (variant.value) variantData.sizeValue = variant.value;
                    if (variant.barcode) variantData.barcode = variant.barcode;
                    if (variant.inStock !== undefined)
                      variantData.inStock = variant.inStock;
                    if (variant.price?.value) {
                      variantData.price =
                        typeof variant.price.value === 'string'
                          ? parseFloat(variant.price.value.replace(',', '.'))
                          : parseFloat(variant.price.value);
                    }
                    if (Object.keys(variantData).length > 0) {
                      extractedVariants.push(variantData);
                    }
                  });
                  if (extractedVariants.length > 0) {
                    details.variants = extractedVariants;
                    this.logger.debug(
                      `Extracted ${extractedVariants.length} variants from size-picker`
                    );
                  }
                }
              }
            } catch (e) {
              // Skip if not valid JSON
              this.logger.debug(`Error parsing size-picker data: ${e.message}`);
            }
          }

          // Try to find variants in any window variable (more flexible regex)
          if (!details.variants || details.variants.length === 0) {
            // Look for any window variable that might contain product/variant data
            const windowVarMatches = scriptText.match(
              /window\["__[^"]+__PROPS"\]\s*=\s*({.+?});/gs
            );
            if (windowVarMatches) {
              for (const match of windowVarMatches) {
                try {
                  const jsonMatch = match.match(/=\s*({.+?});/s);
                  if (jsonMatch) {
                    const windowData = JSON.parse(jsonMatch[1]);
                    // Check multiple possible paths for variants
                    const possiblePaths = [
                      windowData.product?.variants,
                      windowData.product?.product?.variants,
                      windowData.variants,
                      windowData.data?.product?.variants,
                      windowData.data?.variants,
                    ];

                    for (const variants of possiblePaths) {
                      if (
                        variants &&
                        Array.isArray(variants) &&
                        variants.length > 0
                      ) {
                        const extractedVariants: any[] = [];
                        variants.forEach((variant: any) => {
                          const variantData: any = {};
                          if (variant.itemNumber)
                            variantData.itemNumber = variant.itemNumber;
                          if (variant.value)
                            variantData.sizeValue = variant.value;
                          if (variant.barcode)
                            variantData.barcode = variant.barcode;
                          if (variant.inStock !== undefined)
                            variantData.inStock = variant.inStock;
                          if (variant.price?.value) {
                            variantData.price =
                              typeof variant.price.value === 'string'
                                ? parseFloat(
                                    variant.price.value.replace(',', '.')
                                  )
                                : parseFloat(variant.price.value);
                          }
                          if (variant.beautifiedValue)
                            variantData.beautifiedValue =
                              variant.beautifiedValue;
                          if (Object.keys(variantData).length > 0) {
                            extractedVariants.push(variantData);
                          }
                        });
                        if (extractedVariants.length > 0) {
                          details.variants = extractedVariants;
                          this.logger.debug(
                            `Extracted ${extractedVariants.length} variants from window variable`
                          );
                          break; // Found variants, no need to check other paths
                        }
                      }
                    }
                    if (details.variants && details.variants.length > 0) {
                      break; // Found variants, no need to check other matches
                    }
                  }
                } catch (e) {
                  // Skip if not valid JSON
                }
              }
            }
          }
        } catch (error) {
          // Skip invalid scripts
        }
      });

      // Extract product specifications/attributes (Ürün Özellikleri)
      const specifications: Record<string, string> = {};

      // Try multiple approaches to find product specifications
      // Approach 1: Look for "Ürün Özellikleri" section
      const specSectionSelectors = [
        '*:contains("Ürün Özellikleri")',
        '*:contains("Ürün Özellikleri")',
        '.product-properties',
        '.product-attributes',
        '.pr-in-dt',
      ];

      for (const sectionSelector of specSectionSelectors) {
        const specSection = $(sectionSelector).first();
        if (specSection.length > 0) {
          // Find the container that holds the properties
          const container =
            specSection.closest('div, section').length > 0
              ? specSection.closest('div, section')
              : specSection.parent();

          // Try table structure
          container.find('table tr').each((i, el) => {
            const $el = $(el);
            const tds = $el.find('td');
            if (tds.length >= 2) {
              const key = tds.eq(0).text().trim();
              const value = tds.eq(1).text().trim();
              if (key && value && key.length < 100 && value.length < 200) {
                specifications[key] = value;
              }
            }
          });

          // Try dl/dt/dd structure
          if (Object.keys(specifications).length === 0) {
            container.find('dl dt, dl dd').each((i, el) => {
              const $el = $(el);
              if ($el.is('dt')) {
                const key = $el.text().trim();
                const value = $el.next('dd').text().trim();
                if (key && value && key.length < 100) {
                  specifications[key] = value;
                }
              }
            });
          }

          // Try div-based structure with labels
          if (Object.keys(specifications).length === 0) {
            container.find('div, span').each((i, el) => {
              const $el = $(el);
              const text = $el.text().trim();
              // Look for pattern like "Kalıp: Slim Fit" or "Kalıp Slim Fit"
              const colonMatch = text.match(/^([^:]+):\s*(.+)$/);
              if (colonMatch) {
                const key = colonMatch[1].trim();
                const value = colonMatch[2].trim();
                if (
                  key.length < 50 &&
                  value.length < 200 &&
                  !specifications[key]
                ) {
                  specifications[key] = value;
                }
              }
            });
          }

          if (Object.keys(specifications).length > 0) break;
        }
      }

      // Approach 2: Direct table/div search in common locations
      if (Object.keys(specifications).length === 0) {
        const directSelectors = [
          '.product-properties-list tr',
          '.product-attributes tr',
          '[data-testid="product-specifications"] tr',
          'table.product-specs tr',
        ];

        for (const selector of directSelectors) {
          $(selector).each((i, el) => {
            const $el = $(el);
            const tds = $el.find('td');
            if (tds.length >= 2) {
              const key = tds.eq(0).text().trim();
              const value = tds.eq(1).text().trim();
              if (key && value && key.length < 100) {
                specifications[key] = value;
              }
            }
          });
          if (Object.keys(specifications).length > 0) break;
        }
      }

      // Extract specific common attributes if not found in specifications
      const commonAttributes = [
        { key: 'Kalıp', selectors: ['[data-testid="fit"]', '.fit-type'] },
        {
          key: 'Yaka Tipi',
          selectors: ['[data-testid="collar"]', '.collar-type'],
        },
        {
          key: 'Materyal',
          selectors: ['[data-testid="material"]', '.material'],
        },
        { key: 'Renk', selectors: ['[data-testid="color"]', '.color'] },
        {
          key: 'Koleksiyon',
          selectors: ['[data-testid="collection"]', '.collection'],
        },
      ];

      for (const attr of commonAttributes) {
        if (!specifications[attr.key]) {
          for (const selector of attr.selectors) {
            const value = $(selector).first().text().trim();
            if (value) {
              specifications[attr.key] = value;
              break;
            }
          }
        }
      }

      // Extract washing instructions (Yıkama Talimatları)
      let washingInstructions = '';
      const washingSelectors = [
        '.washing-instructions',
        '.care-instructions',
        '[data-testid="care-instructions"]',
        '.yikama-talimatlari',
      ];

      for (const selector of washingSelectors) {
        const washing = $(selector).first().text().trim();
        if (washing && washing.length > 10) {
          washingInstructions = washing;
          break;
        }
      }

      // If not found, try to find in product properties
      if (!washingInstructions) {
        $('*:contains("Yıkama"), *:contains("Yıkama Talimatları")').each(
          (i, el) => {
            const $el = $(el);
            const text = $el.text();
            if (text.includes('Yıkama') || text.includes('yıkanabilir')) {
              const parent = $el.parent();
              const instructions = parent.text().trim();
              if (instructions.length > 20 && instructions.length < 500) {
                washingInstructions = instructions;
                return false; // break
              }
            }
          }
        );
      }

      // Extract discount info (Sepette %15 İndirim)
      let discountInfo = '';
      const discountSelectors = [
        '.discount-info',
        '.indirim-bilgisi',
        '[data-testid="discount"]',
        '*:contains("İndirim")',
      ];

      for (const selector of discountSelectors) {
        const discount = $(selector).first().text().trim();
        if (discount && discount.includes('İndirim') && discount.length < 100) {
          discountInfo = discount;
          break;
        }
      }

      // Extract stock/availability info
      let availability = '';
      const availabilitySelectors = [
        '.stock-info',
        '.availability',
        '[data-testid="stock"]',
        '*:contains("Stok")',
      ];

      for (const selector of availabilitySelectors) {
        const avail = $(selector).first().text().trim();
        if (
          avail &&
          (avail.includes('Stok') || avail.includes('Mevcut')) &&
          avail.length < 100
        ) {
          availability = avail;
          break;
        }
      }

      // Extract rating/review info if available (if not already set from JSON-LD)
      const ratingSelectors = [
        '[data-testid="rating"]',
        '.rating',
        '.product-rating',
      ];

      for (const selector of ratingSelectors) {
        const ratingText = $(selector).first().text().trim();
        const ratingMatch = ratingText.match(/(\d+[.,]\d+)/);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1].replace(',', '.'));
        }

        const reviewMatch = ratingText.match(
          /(\d+)\s*(yorum|review|değerlendirme)/i
        );
        if (reviewMatch) {
          reviewCount = parseInt(reviewMatch[1]);
        }
      }

      // Log variants extraction result before translation
      if (details.variants && details.variants.length > 0) {
        this.logger.log(
          `Successfully extracted ${details.variants.length} variants before translation`
        );
        this.logger.debug(
          `Variants in details object: ${JSON.stringify(
            details.variants.slice(0, 2)
          )}`
        );
      } else {
        this.logger.warn('No variants extracted from product page');
        this.logger.debug(
          `details.variants = ${JSON.stringify(details.variants)}`
        );
      }

      // Build comprehensive additionalData
      details.additionalData = {
        scrapedAt: new Date().toISOString(),
        sourceUrl: productUrl,
        source: 'product-detail-page',
        hasDetailedInfo: true,
        specifications:
          Object.keys(specifications).length > 0 ? specifications : undefined,
        washingInstructions: washingInstructions || undefined,
        discountInfo: discountInfo || undefined,
        availability: availability || undefined,
        rating: rating || undefined,
        reviewCount: reviewCount || undefined,
      };

      // Note: Variants translation is now handled in batch translation above (in scrapeProductDetails)
      // All translations (title, description, slug, variants) are done in one API call for better performance

      // Convert price to Toman (after all price extraction methods including JSON-LD)
      if (details.price) {
        this.logger.debug(
          `Converting price to Toman: ${
            details.price
          } (type: ${typeof details.price})`
        );
        try {
          let priceInToman = await this.convertPriceToToman(details.price);
          this.logger.debug(
            `Price conversion result: ${priceInToman} (type: ${typeof priceInToman})`
          );

          // Apply markup percentage if provided
          if (options?.markupPercentage && priceInToman) {
            const originalPrice = priceInToman;
            priceInToman = priceInToman * (1 + options.markupPercentage / 100);
            priceInToman = Math.round(priceInToman * 100) / 100;
            this.logger.debug(
              `Applied ${options.markupPercentage}% markup: ${originalPrice} -> ${priceInToman}`
            );
          }

          // Round to nearest thousand (round up) after markup
          if (priceInToman) {
            const roundedPrice = this.roundToNearestThousand(priceInToman);
            this.logger.debug(
              `Rounded price to nearest thousand: ${priceInToman} -> ${roundedPrice}`
            );
            priceInToman = roundedPrice;
          }

          details.priceInToman = priceInToman;
          this.logger.debug(
            `Set details.priceInToman = ${details.priceInToman}`
          );
        } catch (error) {
          this.logger.error(
            `Error converting price to Toman: ${error.message}`,
            error.stack
          );
        }
      } else {
        this.logger.warn(`No price found in details, skipping conversion`);
      }

      // Set category if provided
      if (options?.category) {
        details.category = options.category;
        this.logger.debug(`Set category: ${options.category}`);
      }

      // Build attributes array (for size and color attributes)
      if (details.variants && details.variants.length > 0) {
        const attributes: Array<{
          type: string;
          name: string;
          attribute_type: string;
        }> = [];

        // Check if we have color variants
        const hasColorVariants = details.variants.some(
          (v: any) => v.color && v.color.trim().length > 0
        );
        if (hasColorVariants) {
          attributes.push({
            type: 'string',
            name: 'رنگ',
            attribute_type: 'differentiator',
          });
          this.logger.debug('Added color attribute to product');
        }

        // Check if we have size variants
        const hasSizeVariants = details.variants.some(
          (v: any) => v.sizeValue || (v.size && v.size.length > 0)
        );
        if (hasSizeVariants) {
          attributes.push({
            type: 'string',
            name: 'سایز',
            attribute_type: 'differentiator',
          });
          this.logger.debug('Added size attribute to product');
        }

        if (attributes.length > 0) {
          details.attributes = attributes;
          this.logger.debug(
            `Added ${attributes.length} attributes to product: ${attributes
              .map((a) => a.name)
              .join(', ')}`
          );
        }
      }

      // Convert variant prices to Toman and apply markup/rounding
      if (details.variants && details.variants.length > 0 && options) {
        this.logger.debug(
          `Converting prices for ${details.variants.length} variants`
        );
        try {
          // Get TRY exchange rate
          const currency = await this.CurrencyPricesRepo.findOne({
            where: { slug: 'TRY' },
          });
          if (!currency || !currency.price) {
            this.logger.warn(
              'TRY exchange rate not found, skipping variant price conversion'
            );
          } else {
            const exchangeRate = parseFloat(currency.price.toString());
            this.logger.debug(`Using TRY exchange rate: ${exchangeRate}`);

            for (const variant of details.variants) {
              if (variant.price) {
                try {
                  // Convert to Toman
                  let variantPriceInToman =
                    parseFloat(variant.price.toString()) * exchangeRate;

                  // Apply markup percentage if provided
                  if (options.markupPercentage && variantPriceInToman) {
                    const originalVariantPrice = variantPriceInToman;
                    variantPriceInToman =
                      variantPriceInToman *
                      (1 + options.markupPercentage / 100);
                    variantPriceInToman =
                      Math.round(variantPriceInToman * 100) / 100;
                    this.logger.debug(
                      `Applied ${options.markupPercentage}% markup to variant: ${originalVariantPrice} -> ${variantPriceInToman}`
                    );
                  }

                  // Round to nearest thousand (round up) after markup
                  if (variantPriceInToman) {
                    const roundedVariantPrice =
                      this.roundToNearestThousand(variantPriceInToman);
                    variantPriceInToman = roundedVariantPrice;
                    this.logger.debug(
                      `Rounded variant price to nearest thousand: ${variantPriceInToman}`
                    );
                  }

                  variant.priceInToman = variantPriceInToman;
                } catch (error) {
                  this.logger.error(
                    `Error converting variant price: ${error.message}`
                  );
                }
              }
            }
            this.logger.debug('Variant prices converted successfully');
          }
        } catch (error) {
          this.logger.error(
            `Error in variant price conversion: ${error.message}`,
            error.stack
          );
        }
      }

      this.logger.debug(
        `Extracted details: price=${details.price}, originalPrice=${
          details.originalPrice
        }, priceInToman=${details.priceInToman}, category=${
          details.category
        }, brand=${details.brand}, images=${imageUrls.length}, specs=${
          Object.keys(specifications).length
        }, variants=${details.variants?.length || 0}, attributes=${
          details.attributes?.length || 0
        }`
      );

      // Log variants if they exist
      if (details.variants && details.variants.length > 0) {
        this.logger.log(
          `Returning ${details.variants.length} variants in details object`
        );
        this.logger.debug(
          `First variant sample: ${JSON.stringify(details.variants[0])}`
        );
      }

      return Object.keys(details).length > 0 ? details : null;
    } catch (error) {
      this.logger.error(
        `Error scraping product details from ${productUrl}:`,
        error.message || error
      );
      return null;
    }
  }

  async getAllProducts(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [products, total] = await this.trendyolProductRepository.findAndCount(
      {
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      }
    );

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductById(id: number) {
    return this.trendyolProductRepository.findOne({ where: { id } });
  }

  async deleteProduct(id: number) {
    return this.trendyolProductRepository.delete({ id });
  }

  /**
   * Export products to Sazito
   * Converts Trendyol products to Sazito format and sends them via SazitoService
   */
  async exportToSazito(productIds?: number[]): Promise<{
    success: boolean;
    message: string;
    exported: number;
    failed: number;
    results: Array<{ productId: number; success: boolean; error?: string }>;
  }> {
    try {
      // Fetch products from database
      // Only get products that don't have sazitoId (haven't been exported yet)
      let products: TrendyolProduct[];
      if (productIds && productIds.length > 0) {
        products = await this.trendyolProductRepository.find({
          where: productIds.map((id) => ({
            id,
            sazitoId: IsNull(), // Only products without sazitoId
          })),
        });
      } else {
        products = await this.trendyolProductRepository.find({
          where: {
            isScraped: true,
            sazitoId: IsNull(), // Only products without sazitoId
          },
          order: { createdAt: 'DESC' },
        });
      }

      if (!products || products.length === 0) {
        return {
          success: false,
          message:
            'No products found to export (all products already have sazitoId)',
          exported: 0,
          failed: 0,
          results: [],
        };
      }

      this.logger.log(
        `Exporting ${products.length} products to Sazito (products without sazitoId)`
      );

      const results: Array<{
        productId: number;
        success: boolean;
        error?: string;
      }> = [];
      let exported = 0;
      let failed = 0;

      // Process each product
      for (const product of products) {
        try {
          // Download and upload images to Sazito
          const imageIds = await this.downloadAndUploadImages(product);
          console.log('imageIds', imageIds);
          // Convert Trendyol product to Sazito format
          const sazitoProduct = this.convertToSazitoFormat(product);

          // Add image_ids and image_orders if images were uploaded
          if (imageIds && imageIds.length > 0) {
            sazitoProduct.image_ids = imageIds;
            sazitoProduct.image_orders = imageIds.map((id, index) => ({
              id,
              order: index + 1,
            }));
          }

          // Send to Sazito via SazitoService
          const response = await this.sazitoService.createProduct(
            sazitoProduct
          );

          // Extract product ID from response and save to database
          const sazitoProductId = response?.result?.product?.id;
          if (sazitoProductId) {
            await this.trendyolProductRepository.update(
              { id: product.id },
              { sazitoId: sazitoProductId }
            );
            this.logger.debug(
              `Saved Sazito ID ${sazitoProductId} for product ${product.id}`
            );
          }

          exported++;
          results.push({
            productId: product.id,
            success: true,
          });

          this.logger.debug(
            `Successfully exported product ${product.id} (${product.title}) to Sazito with ID: ${sazitoProductId}`
          );
        } catch (error) {
          failed++;
          const errorMessage = error.message || 'Unknown error';
          results.push({
            productId: product.id,
            success: false,
            error: errorMessage,
          });

          this.logger.error(
            `Failed to export product ${product.id} to Sazito: ${errorMessage}`
          );
        }
      }

      return {
        success: exported > 0,
        message: `Exported ${exported} products, ${failed} failed`,
        exported,
        failed,
        results,
      };
    } catch (error) {
      this.logger.error(
        `Error exporting to Sazito: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Download images from Trendyol and upload them to Sazito
   */
  private async downloadAndUploadImages(
    product: TrendyolProduct
  ): Promise<number[]> {
    try {
      // Get image URLs from product
      const imageUrls: string[] = [];

      if (product.imageUrls && product.imageUrls.length > 0) {
        imageUrls.push(...product.imageUrls);
      } else if (product.imageUrl) {
        imageUrls.push(product.imageUrl);
      }

      if (imageUrls.length === 0) {
        this.logger.debug(`No images found for product ${product.id}`);
        return [];
      }

      this.logger.debug(
        `Downloading ${imageUrls.length} images for product ${product.id}`
      );

      // Download images and prepare for upload
      const imagesToUpload = await Promise.all(
        imageUrls.map(async (imageUrl, index) => {
          try {
            // Download image
            const response = await firstValueFrom(
              this.httpService.get(imageUrl, {
                responseType: 'arraybuffer',
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
              })
            );

            // Get file extension from URL or default to jpg
            const urlParts = imageUrl.split('.');
            const extension =
              urlParts.length > 1
                ? urlParts[urlParts.length - 1].split('?')[0]
                : 'jpg';

            // Create file-like object for Sazito upload
            const fileName = `${product.productId || product.id}_${
              index + 1
            }.${extension}`;

            return {
              file: {
                buffer: Buffer.from(response.data),
                originalname: fileName,
                filename: fileName,
                mimetype: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
              },
              name: fileName,
              alt: product.title || '',
            };
          } catch (error) {
            this.logger.error(
              `Failed to download image ${imageUrl} for product ${product.id}: ${error.message}`
            );
            return null;
          }
        })
      );

      // Filter out failed downloads
      const validImages = imagesToUpload.filter((img) => img !== null);

      if (validImages.length === 0) {
        this.logger.warn(`No valid images to upload for product ${product.id}`);
        return [];
      }

      this.logger.debug(
        `Preparing to upload ${validImages.length} images for product ${product.id}`
      );

      // Upload images to Sazito in batches if needed (API might have limits)
      // For now, upload all at once
      const uploadResponse = await this.sazitoService.uploadImages(validImages);

      // Log response structure for debugging
      this.logger.debug(
        `Upload response structure for product ${product.id}:`,
        JSON.stringify(uploadResponse, null, 2)
      );

      // Extract image IDs from response
      // Response structure might vary, so we check multiple possibilities
      const imageIds: number[] = [];

      if (
        uploadResponse?.result?.images &&
        Array.isArray(uploadResponse.result.images)
      ) {
        uploadResponse.result.images.forEach((img: any) => {
          if (img.id) {
            imageIds.push(img.id);
          }
        });
      } else if (
        uploadResponse?.images &&
        Array.isArray(uploadResponse.images)
      ) {
        uploadResponse.images.forEach((img: any) => {
          if (img.id) {
            imageIds.push(img.id);
          }
        });
      } else if (
        uploadResponse?.result &&
        Array.isArray(uploadResponse.result)
      ) {
        uploadResponse.result.forEach((img: any) => {
          if (img.id) {
            imageIds.push(img.id);
          }
        });
      } else if (uploadResponse?.data && Array.isArray(uploadResponse.data)) {
        uploadResponse.data.forEach((img: any) => {
          if (img.id) {
            imageIds.push(img.id);
          }
        });
      }

      this.logger.debug(
        `Uploaded ${imageIds.length} images to Sazito for product ${product.id}`
      );

      return imageIds;
    } catch (error) {
      this.logger.error(
        `Error downloading/uploading images for product ${product.id}: ${error.message}`,
        error.stack
      );
      return [];
    }
  }

  /**
   * Convert TrendyolProduct to Sazito CreateProductInput format
   */
  private convertToSazitoFormat(product: TrendyolProduct): CreateProductInput {
    // Convert variants to Sazito format
    const productVariants = [];

    if (product.variants && product.variants.length > 0) {
      // Product has variants
      for (const variant of product.variants) {
        const variantAttributes = [];

        // Add color attribute if exists
        if (variant.color) {
          variantAttributes.push({
            name: 'رنگ',
            value: variant.color,
          });
        }

        // Add size attribute if exists
        if (variant.sizeValue) {
          variantAttributes.push({
            name: 'سایز',
            value: variant.sizeValue,
          });
        } else if (variant.size && variant.size.length > 0) {
          // If size is an array, use the first one
          variantAttributes.push({
            name: 'سایز',
            value: variant.size[0],
          });
        }

        productVariants.push({
          price: variant.priceInToman || 0,
          sku: variant.sku || product.productId,
          enabled: variant.inStock !== false, // Default to true if inStock is not explicitly false
          has_max_order: false,
          min_order_count: 1,
          is_stock_managed:
            variant.inStock !== undefined ? variant.inStock !== false : false,
          stock_number: variant.inStock ? 999 : 0, // Use a high number if in stock, 0 if not
          relative: false,
          weight: 0,
          attributes: variantAttributes,
          commercial_files: [],
          raw_price: null,
          sort_index: variant.itemNumber || 0,
        });
      }
    } else {
      // Product has no variants - create a single variant
      productVariants.push({
        price: product.priceInToman || 0,
        sku: product.productId,
        enabled: true,
        has_max_order: false,
        min_order_count: 1,
        is_stock_managed: false,
        stock_number: 999,
        relative: false,
        weight: 0,
        attributes: [],
        commercial_files: [],
        raw_price: null,
        sort_index: 0,
      });
    }

    // Convert attributes from Trendyol format to Sazito format
    const attributes = [];
    if (product.attributes && product.attributes.length > 0) {
      for (const attr of product.attributes) {
        attributes.push({
          type: attr.type || 'string',
          name: attr.name,
          attribute_type:
            (attr.attribute_type as AttributeType) ||
            AttributeType.DIFFERENTIATOR,
        });
      }
    } else {
      // Default attributes based on variants
      if (product.variants && product.variants.some((v) => v.color)) {
        attributes.push({
          type: 'string',
          name: 'رنگ',
          attribute_type: AttributeType.DIFFERENTIATOR,
        });
      }
      if (
        product.variants &&
        product.variants.some(
          (v) => v.sizeValue || (v.size && v.size.length > 0)
        )
      ) {
        attributes.push({
          type: 'string',
          name: 'سایز',
          attribute_type: AttributeType.DIFFERENTIATOR,
        });
      }
    }

    // Add description as an attribute if it exists
    // Description attribute has a different structure (name, type, value) without attribute_type
    if (product.description) {
      attributes.push({
        name: 'description',
        type: 'text',
        value: product.description,
      });
    }

    return {
      product: {
        name: product.title,
        url: product.slug || product.url || '',
        product_type: ProductType.SIMPLE,
        enabled: false,
        form_id: -1, // Add form_id as per Sazito API requirement
      },
      attributes,
      tags: product.category ? [product.category] : [],
      product_variants: productVariants,
    } as CreateProductInput;
  }

  async exportToCSV(): Promise<string> {
    const products = await this.trendyolProductRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Define headers
    const headers = [
      'identifier',
      'product id',
      'variant id',
      'title',
      'description',
      'url',
      'enabled',
      'images',
      'category',
      'variant commercial asset link',
      'variant image id',
      'sku',
      'weight',
      'price',
      'discount price',
      'stock quantity',
      'type',
      'min purchase',
      'max purchase',
      'variant sort index',
      'seo title',
      'seo description',
      'seo keywords',
      'seo redirect',
      'seo canonical',
      'seo index',
      'variant 1 attributes',
      'variant 2 attributes',
      'variant 3 attributes',
      'variant 4 attributes',
      'variant 5 attributes',
      'variant 6 attributes',
      'variant 7 attributes',
      'variant 8 attributes',
      'variant 9 attributes',
      'variant 10 attributes',
    ];

    // Helper function to escape CSV values
    const escapeCSV = (value: string): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // If contains comma, newline, or quote, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV content
    const rows: string[] = [];

    // Add header row
    rows.push(headers.map(escapeCSV).join(','));

    // Add data rows
    products.forEach((product) => {
      // Extract variant attributes from specifications
      const specifications =
        (product.additionalData as any)?.specifications || {};
      const specEntries = Object.entries(specifications);
      const variantAttributes: string[] = Array(10).fill('');
      specEntries.slice(0, 10).forEach(([key, value], idx) => {
        variantAttributes[idx] = `${key}=${value}`;
      });

      // Format description as HTML if it exists
      let description = product.description || '';
      if (description && !description.startsWith('<')) {
        // Wrap in paragraph tags if not already HTML
        description = `<p>${description.replace(/\n/g, '<br>')}</p>`;
      }

      // Format images array
      const images =
        product.imageUrls && product.imageUrls.length > 0
          ? product.imageUrls
          : product.imageUrl
          ? [product.imageUrl]
          : [];
      const imagesString =
        images.length > 0
          ? `[${images.map((img) => `"${img}"`).join(',')}]`
          : '';

      // Extract URL slug (last part of URL)
      const urlSlug = product.url
        ? product.url.split('/').pop() || product.url
        : '';

      const row = [
        product.id || '', // identifier
        '', // product id (empty)
        '', // variant id (not available)
        product.title || '', // title
        description, // description (HTML formatted)
        urlSlug, // url (slug only)
        'FALSE', // enabled
        imagesString, // images
        product.category || '', // category
        '', // variant commercial asset link
        '', // variant image id
        '', // sku (empty)
        '0', // weight
        product.priceInToman ? product.priceInToman.toString() : '0', // price (in Toman)
        '', // discount price (empty)
        '-1', // stock quantity (not available)
        'simple', // type
        '1', // min purchase
        '0', // max purchase
        '0', // variant sort index
        product.title || '', // seo title
        product.description || '', // seo description
        '', // seo keywords
        '', // seo redirect
        product.url || '', // seo canonical
        '', // seo index
        variantAttributes[0], // variant 1 attributes
        variantAttributes[1], // variant 2 attributes
        variantAttributes[2], // variant 3 attributes
        variantAttributes[3], // variant 4 attributes
        variantAttributes[4], // variant 5 attributes
        variantAttributes[5], // variant 6 attributes
        variantAttributes[6], // variant 7 attributes
        variantAttributes[7], // variant 8 attributes
        variantAttributes[8], // variant 9 attributes
        variantAttributes[9], // variant 10 attributes
      ];

      rows.push(row.map(escapeCSV).join(','));
    });

    return rows.join('\n');
  }

  /**
   * Create a new scrape configuration
   */
  async createScrapeConfig(dto: CreateScrapeConfigDto): Promise<ScrapeConfig> {
    try {
      const config = this.scrapeConfigRepository.create({
        url: dto.url,
        maxPages: dto.maxPages || 1,
        delay: dto.delay || 2000,
        limit: dto.limit || null,
        category: dto.category || null,
        markupPercentage: dto.markupPercentage || 0,
        isActive: true,
        status: ScrapeConfigStatusEnum.idle,
        nextRunAt: new Date(), // Ready to run immediately
      });

      const savedConfig = await this.scrapeConfigRepository.save(config);
      this.logger.log(`Created scrape config with ID: ${savedConfig.id}`);
      return savedConfig;
    } catch (error) {
      this.logger.error(
        `Error creating scrape config: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get all scrape configurations
   */
  async getAllScrapeConfigs(): Promise<ScrapeConfig[]> {
    return this.scrapeConfigRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get active scrape configurations
   * Only returns configs that are ready to run (idle or failed, and nextRunAt is null or passed)
   */
  async getActiveScrapeConfigs(): Promise<ScrapeConfig[]> {
    const now = new Date();
    return this.scrapeConfigRepository
      .find({
        where: {
          isActive: true,
        },
        order: { createdAt: 'DESC' },
      })
      .then((configs) => {
        // Filter configs that are ready to run
        return configs.filter((config) => {
          // Skip if currently running
          if (config.status === ScrapeConfigStatusEnum.running) {
            return false;
          }
          // Run if nextRunAt is null or has passed
          if (!config.nextRunAt || config.nextRunAt <= now) {
            return true;
          }
          return false;
        });
      });
  }

  /**
   * Update scrape configuration
   */
  async updateScrapeConfig(
    id: number,
    dto: Partial<CreateScrapeConfigDto>
  ): Promise<ScrapeConfig> {
    const config = await this.scrapeConfigRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new Error(`Scrape config with ID ${id} not found`);
    }

    Object.assign(config, dto);
    const updatedConfig = await this.scrapeConfigRepository.save(config);
    this.logger.log(`Updated scrape config with ID: ${updatedConfig.id}`);
    return updatedConfig;
  }

  /**
   * Delete scrape configuration
   */
  async deleteScrapeConfig(id: number): Promise<void> {
    const result = await this.scrapeConfigRepository.delete(id);
    if (result.affected === 0) {
      throw new Error(`Scrape config with ID ${id} not found`);
    }
    this.logger.log(`Deleted scrape config with ID: ${id}`);
  }

  /**
   * Get scrape configuration status
   */
  async getScrapeConfigStatus(id: number): Promise<{
    id: number;
    status: ScrapeConfigStatusEnum;
    isActive: boolean;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    lastProductsScraped: number | null;
    lastError: string | null;
    duration: number | null; // duration in milliseconds if completed
    isRunning: boolean;
    isReadyToRun: boolean;
  }> {
    const config = await this.scrapeConfigRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new Error(`Scrape config with ID ${id} not found`);
    }

    const now = new Date();
    const isRunning = config.status === ScrapeConfigStatusEnum.running;
    const isReadyToRun =
      config.isActive &&
      !isRunning &&
      (!config.nextRunAt || config.nextRunAt <= now);

    let duration: number | null = null;
    if (config.startedAt && config.completedAt) {
      duration = config.completedAt.getTime() - config.startedAt.getTime();
    } else if (config.startedAt && isRunning) {
      duration = now.getTime() - config.startedAt.getTime();
    }

    return {
      id: config.id,
      status: config.status,
      isActive: config.isActive,
      lastRunAt: config.lastRunAt,
      nextRunAt: config.nextRunAt,
      startedAt: config.startedAt,
      completedAt: config.completedAt,
      lastProductsScraped: config.lastProductsScraped,
      lastError: config.lastError,
      duration,
      isRunning,
      isReadyToRun,
    };
  }

  /**
   * Execute scrape based on configuration
   */
  async executeScrapeFromConfig(config: ScrapeConfig): Promise<{
    success: boolean;
    message: string;
    productsScraped: number;
  }> {
    const startTime = new Date();

    try {
      // Update status to running
      config.status = ScrapeConfigStatusEnum.running;
      config.startedAt = startTime;
      config.lastError = null;
      await this.scrapeConfigRepository.save(config);

      this.logger.log(
        `Executing scrape from config ID: ${config.id}, URL: ${config.url}`
      );

      const dto: ScrapeProductsDto = {
        url: config.url,
        maxPages: config.maxPages,
        delay: config.delay,
        limit: config.limit,
        category: config.category,
        markupPercentage: config.markupPercentage,
      };

      const result = await this.scrapeProducts(dto);
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Check if scraping was actually successful
      if (result.success) {
        // Update config with success status
        config.status = ScrapeConfigStatusEnum.completed;
        config.lastRunAt = endTime;
        config.completedAt = endTime;
        config.lastProductsScraped = result.productsScraped;
        config.lastError = null;

        // Calculate next run time (default: 24 hours from now)
        const nextRun = new Date();
        nextRun.setHours(nextRun.getHours() + 24);
        config.nextRunAt = nextRun;

        await this.scrapeConfigRepository.save(config);

        this.logger.log(
          `Config ${
            config.id
          } completed successfully in ${duration}ms. Products scraped: ${
            result.productsScraped
          }. Next run: ${nextRun.toISOString()}`
        );
      } else {
        // Scraping failed (but no exception thrown)
        config.status = ScrapeConfigStatusEnum.failed;
        config.completedAt = endTime;
        config.lastError = result.message || 'Scraping failed';
        config.lastProductsScraped = result.productsScraped;
        await this.scrapeConfigRepository.save(config);

        this.logger.warn(
          `Config ${config.id} failed: ${result.message}. Duration: ${duration}ms. Products scraped: ${result.productsScraped}`
        );
      }

      return {
        success: result.success,
        message: result.message,
        productsScraped: result.productsScraped,
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Update config with failed status
      config.status = ScrapeConfigStatusEnum.failed;
      config.completedAt = endTime;
      config.lastError = error.message;
      await this.scrapeConfigRepository.save(config);

      this.logger.error(
        `Config ${config.id} failed after ${duration}ms: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Process all active scrape configurations
   * This method is called by the scheduled job
   */
  async processActiveScrapeConfigs(): Promise<void> {
    try {
      const activeConfigs = await this.getActiveScrapeConfigs();
      this.logger.log(
        `Processing ${activeConfigs.length} active scrape configurations`
      );

      for (const config of activeConfigs) {
        try {
          await this.executeScrapeFromConfig(config);
          // Add delay between configs to avoid overwhelming the system
          await this.delay(config.delay || 2000);
        } catch (error) {
          this.logger.error(
            `Error processing config ID ${config.id}: ${error.message}`
          );
          // Continue with next config even if one fails
        }
      }

      this.logger.log('Finished processing all active scrape configurations');
    } catch (error) {
      this.logger.error(
        `Error processing active scrape configs: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Update all product prices to Toman based on current exchange rate
   * Uses markupPercentage from ScrapeConfig based on category
   */
  async updateAllPricesToToman(options?: { batchSize?: number }): Promise<{
    success: boolean;
    message: string;
    totalProducts: number;
    updatedProducts: number;
    failedProducts: number;
  }> {
    const batchSize = options?.batchSize || 100;
    let updatedProducts = 0;
    let failedProducts = 0;
    let totalProducts = 0;
    let offset = 0;

    try {
      this.logger.log('Starting bulk price update to Toman');

      // Get current TRY exchange rate
      const currency = await this.CurrencyPricesRepo.findOne({
        where: { slug: 'TRY' },
      });

      if (!currency || !currency.price) {
        throw new Error('TRY currency not found or price is null');
      }

      const exchangeRate = Number(currency.price) / 10; // Divide by 10 as per user's change
      this.logger.log(`Using exchange rate: ${exchangeRate} (TRY to Toman)`);

      // Get all active scrape configs to build a map of category -> markupPercentage
      const scrapeConfigs = await this.scrapeConfigRepository.find({
        where: { isActive: true },
      });

      const markupMap = new Map<string, number>();
      scrapeConfigs.forEach((config) => {
        if (config.category && config.markupPercentage) {
          markupMap.set(config.category, Number(config.markupPercentage));
        }
      });

      this.logger.log(
        `Found ${markupMap.size} scrape configs with markup percentages`
      );

      // Process products in batches
      while (true) {
        const products = await this.trendyolProductRepository.find({
          where: {},
          take: batchSize,
          skip: offset,
          order: { id: 'ASC' },
        });

        if (products.length === 0) {
          break; // No more products
        }

        totalProducts += products.length;
        this.logger.log(
          `Processing batch: ${offset + 1} to ${
            offset + products.length
          } (total: ${totalProducts})`
        );

        for (const product of products) {
          try {
            if (!product.price || product.price <= 0) {
              this.logger.debug(
                `Skipping product ${product.id}: no valid price`
              );
              continue;
            }

            // Convert price to Toman
            let priceInToman = product.price * exchangeRate;

            // Get markup percentage from scrape config based on category
            const markupPercentage = product.category
              ? markupMap.get(product.category)
              : undefined;

            // Apply markup percentage if available from config
            if (markupPercentage && markupPercentage > 0 && priceInToman) {
              const originalPrice = priceInToman;
              priceInToman =
                priceInToman * (1 + Number(markupPercentage) / 100);
              priceInToman = Math.round(priceInToman * 100) / 100;
              this.logger.debug(
                `Applied ${markupPercentage}% markup from config (category: ${product.category}) for product ${product.id}: ${originalPrice} -> ${priceInToman}`
              );
            }

            // Round to nearest thousand (round up)
            if (priceInToman) {
              priceInToman = this.roundToNearestThousand(priceInToman);
            }

            // Update product
            await this.trendyolProductRepository.update(
              { id: product.id },
              { priceInToman }
            );

            updatedProducts++;
            this.logger.debug(
              `Updated product ${product.id}: ${
                product.price
              } TRY -> ${priceInToman} Toman (markup: ${
                markupPercentage || 0
              }%)`
            );
          } catch (error) {
            failedProducts++;
            this.logger.error(
              `Error updating product ${product.id}: ${error.message}`
            );
          }
        }

        offset += batchSize;

        // Add small delay between batches to avoid overwhelming the database
        if (products.length === batchSize) {
          await this.delay(100);
        }
      }

      this.logger.log(
        `Bulk price update completed: ${updatedProducts} updated, ${failedProducts} failed out of ${totalProducts} total`
      );

      return {
        success: true,
        message: `Successfully updated ${updatedProducts} products. ${failedProducts} failed.`,
        totalProducts,
        updatedProducts,
        failedProducts,
      };
    } catch (error) {
      this.logger.error(
        `Error in bulk price update: ${error.message}`,
        error.stack
      );
      return {
        success: false,
        message: `Error updating prices: ${error.message}`,
        totalProducts,
        updatedProducts,
        failedProducts,
      };
    }
  }
}
