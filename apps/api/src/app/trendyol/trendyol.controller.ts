import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ScrapeProductsDto,
  CreateScrapeConfigDto,
} from './dto/scrape-products.dto';
import { UpdatePricesDto } from './dto/update-prices.dto';
import { TrendyolService } from './trendyol.service';

@Controller('trendyol')
export class TrendyolController {
  constructor(private readonly trendyolService: TrendyolService) {}

  @Post('scrape')
  async scrapeProducts(@Body() dto: ScrapeProductsDto) {
    return this.trendyolService.scrapeProducts(dto);
  }

  @Get('products')
  async getAllProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.trendyolService.getAllProducts(pageNum, limitNum);
  }

  @Get('products/:id')
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    return this.trendyolService.getProductById(id);
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.trendyolService.deleteProduct(id);
  }

  @Get('export/csv')
  async exportToCSV(@Res() res: Response) {
    const csvContent = await this.trendyolService.exportToCSV();
    const filename = `trendyol-products-${
      new Date().toISOString().split('T')[0]
    }.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
    res.send(csvContent);
  }

  // Scrape Config endpoints
  @Post('scrape-config')
  async createScrapeConfig(@Body() dto: CreateScrapeConfigDto) {
    return this.trendyolService.createScrapeConfig(dto);
  }

  @Get('scrape-config')
  async getAllScrapeConfigs() {
    return this.trendyolService.getAllScrapeConfigs();
  }

  @Get('scrape-config/active')
  async getActiveScrapeConfigs() {
    return this.trendyolService.getActiveScrapeConfigs();
  }

  @Get('scrape-config/:id/status')
  async getScrapeConfigStatus(@Param('id', ParseIntPipe) id: number) {
    return this.trendyolService.getScrapeConfigStatus(id);
  }

  @Put('scrape-config/:id')
  async updateScrapeConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateScrapeConfigDto>
  ) {
    return this.trendyolService.updateScrapeConfig(id, dto);
  }

  @Delete('scrape-config/:id')
  async deleteScrapeConfig(@Param('id', ParseIntPipe) id: number) {
    return this.trendyolService.deleteScrapeConfig(id);
  }

  @Post('scrape-config/:id/execute')
  async executeScrapeConfig(@Param('id', ParseIntPipe) id: number) {
    const configs = await this.trendyolService.getAllScrapeConfigs();
    const config = configs.find((c) => c.id === id);
    if (!config) {
      throw new Error(`Scrape config with ID ${id} not found`);
    }
    return this.trendyolService.executeScrapeFromConfig(config);
  }

  // Price update endpoint
  // Markup percentage is automatically retrieved from ScrapeConfig based on categoryId
  @Post('products/update-prices')
  async updateAllPricesToToman(@Body() dto?: UpdatePricesDto) {
    return this.trendyolService.updateAllPricesToToman({
      batchSize: dto?.batchSize,
    });
  }

  // Export to Sazito endpoint
  @Post('export/sazito')
  async exportToSazito(@Query('productIds') queryProductIds?: string) {
    const productIds = queryProductIds?.split(',').map(Number);
    return this.trendyolService.exportToSazito(productIds);
  }
}
