import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'User registered successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Registered user information',
    example: {
      id: 'uuid',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  })
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };

  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  access_token?: string;
}

