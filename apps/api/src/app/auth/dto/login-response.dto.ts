import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'User information',
    example: {
      id: 'uuid',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      roles: ['admin', 'Supplier'],
    },
  })
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
  };
}

