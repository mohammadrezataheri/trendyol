import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class ScrapeProductsDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxPages?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  delay?: number = 2000; // delay between requests in ms

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number; // limit number of products to scrape (for testing)

  @IsOptional()
  @IsString()
  category?: string; // category ID from external system

  @IsOptional()
  @IsNumber()
  @Min(0)
  markupPercentage?: number = 0; // markup percentage on priceInToman
}

export class CreateScrapeConfigDto extends ScrapeProductsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  markupPercentage?: number = 0;
}
