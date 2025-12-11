import { IsOptional, IsNumber, Min } from 'class-validator';

export class UpdatePricesDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  batchSize?: number = 100; // Number of products to process in each batch
  // Note: markupPercentage is now automatically retrieved from ScrapeConfig based on category
}
