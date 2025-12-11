import { IsString, IsOptional, IsArray, IsUrl } from 'class-validator';

export default class CreateAuthConfigDto {
  @IsString()
  clientId: string;

  @IsString()
  clientSecret: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsUrl()
  @IsOptional()
  redirectUrl?: string;
}

