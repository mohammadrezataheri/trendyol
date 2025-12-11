import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
  })
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
  })
  lastName?: string;

  @ApiProperty({
    description: 'Google ID if user logged in with Google',
    example: '123456789',
    required: false,
  })
  googleId?: string;

  @ApiProperty({
    description: 'User roles',
    example: ['admin', 'Supplier'],
    type: [String],
  })
  roles: string[];

  @ApiProperty({
    description: 'Whether user has password set',
    example: true,
  })
  hasPassword: boolean;

  @ApiProperty({
    description: 'Whether user is active',
    example: true,
  })
  isActive: boolean;
}
