import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export default class SeoDto {
  @IsString()
  @MaxLength(70)
  @IsOptional()
  metaTitle: string;

  @IsString()
  @MaxLength(320)
  @IsOptional()
  metaDescription: string;

  @IsString({ each: true })
  @IsOptional()
  keywords: string[];
  
  @IsBoolean()
  @IsOptional()
  index: boolean;

  @IsOptional()
  @IsBoolean()
  follow: boolean;
}
