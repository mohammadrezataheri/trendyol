import { Get, Put, Param, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RoleName } from '../auth/entity/role.entity';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

import { User } from '../auth/entity/user.entity';
import {
  ApiController,
  Public,
} from 'src/shared/decorators/api-controller.decorator';
import { RequireRoles } from 'src/shared/decorators/require-roles.decorator';
import { GetUser, IGetUser } from 'src/shared/decorators/get-user.decorator';

@ApiController('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the profile of the authenticated user. Works with all authentication strategies (Local, JWT, Google OAuth)',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getProfile(@GetUser() user: IGetUser): Promise<ProfileResponseDto> {
    // دکوریتور GetUser اطلاعات کامل کاربر را از دیتابیس برمی‌گرداند
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      googleId: user.googleId,
      roles: user.roles.map((role) => role.name),
      hasPassword: !!user.password,
      isActive: user.isActive,
    };
  }

  @Get('roles')
  @RequireRoles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Get all available roles (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all roles',
    schema: {
      example: [
        {
          id: 'uuid',
          name: 'admin',
          description: 'admin role',
        },
        {
          id: 'uuid',
          name: 'Supplier',
          description: 'Supplier role',
        },
        {
          id: 'uuid',
          name: 'Carrier',
          description: 'Carrier role',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  getAllRoles() {
    return this.usersService.getAllRoles();
  }

  @Put(':id/roles')
  @RequireRoles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Update user roles (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'uuid',
  })
  @ApiBody({ type: UpdateUserRolesDto })
  @ApiResponse({
    status: 200,
    description: 'User roles updated successfully',
    schema: {
      example: {
        id: 'uuid',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: [
          {
            id: 'uuid',
            name: 'admin',
            description: 'admin role',
          },
          {
            id: 'uuid',
            name: 'Supplier',
            description: 'Supplier role',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'User or role not found',
  })
  async updateUserRoles(
    @Param('id') userId: string,
    @Body() updateUserRolesDto: UpdateUserRolesDto
  ) {
    return this.usersService.updateUserRoles(
      userId,
      updateUserRolesDto.roleNames
    );
  }

  @Get('public-info')
  @Public()
  @ApiOperation({
    summary: 'Get public information (works with or without authentication)',
    description:
      'This endpoint is public but can detect if user is logged in. If user has a valid token, user info will be available.',
  })
  @ApiResponse({
    status: 200,
    description: 'Public information retrieved successfully',
  })
  async getPublicInfo(@GetUser() user: User | null) {
    if (user) {
      return {
        message: `Hello ${user.email}! You are logged in.`,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }
    return {
      message: 'Hello Guest! You are not logged in.',
    };
  }
}
