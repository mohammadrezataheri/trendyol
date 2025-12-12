import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostType } from '../entity/instagram-post.entity';

class ImageGenerationImageDto {
  @ApiProperty({ description: 'شناسه تصویر' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'پرمپت برای تولید تصویر' })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}

export default class CreateManualCronDto {
  @ApiProperty({ description: 'عنوان کرون جاب' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'شناسه اکانت اینستاگرام' })
  @IsNumber()
  @IsNotEmpty()
  accountId: number;

  @ApiProperty({ description: 'زمان اجرای کرون (cron expression)' })
  @IsString()
  @IsNotEmpty()
  cronTime: string;

  @ApiProperty({ 
    description: 'نوع پست',
    enum: PostType,
    default: PostType.MANUAL 
  })
  @IsEnum(PostType)
  @IsNotEmpty()
  postType: PostType;

  @ApiPropertyOptional({ description: 'پرمپت اصلی' })
  @IsString()
  @IsOptional()
  mainPrompt?: string;

  @ApiPropertyOptional({ description: 'پرمپت کپشن' })
  @IsString()
  @IsOptional()
  captionPrompt?: string;

  @ApiPropertyOptional({ 
    description: 'لیست تصاویر برای تولید',
    type: [ImageGenerationImageDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageGenerationImageDto)
  @IsOptional()
  imageGenerationImage?: ImageGenerationImageDto[];
}

