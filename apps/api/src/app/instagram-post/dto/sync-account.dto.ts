import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export default class SyncAccountDto {
  @ApiProperty({
    description: 'شناسه connected account از Composio',
    example: 'ca_tpnXOSFooL77',
  })
  @IsString()
  connectedAccountId: string;
}

