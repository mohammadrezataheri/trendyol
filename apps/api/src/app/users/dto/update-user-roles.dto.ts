import { IsArray, IsEnum, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '../../auth/entity/role.entity';

export class UpdateUserRolesDto {
  @ApiProperty({
    description: 'Array of role names to assign to the user',
    example: ['admin', 'Supplier'],
    enum: RoleName,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RoleName, { each: true })
  roleNames: RoleName[];
}
