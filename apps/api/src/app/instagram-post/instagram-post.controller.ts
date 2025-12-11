import { InstagramPostService } from './instagram-post.service';
import { Get, Post, Query, Body, Controller, UseGuards } from '@nestjs/common';
import CreateAuthConfigDto from './dto/create-auth-config.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { RoleName } from '../auth/entity/role.entity';
import { RequireRoles } from 'src/shared/decorators/require-roles.decorator';

@ApiController('instagram-post')
export class AdminInstagramPostController {
  constructor(private InstagramPostService: InstagramPostService) {}

  @RequireRoles(RoleName.ADMIN)
  @ApiOperation({ summary: 'لیست اکانت های اینستاگرام' })
  @Get('account/list')
  accountList() // @Query() SearchBaseDto: SearchBaseDto // @GetUser() userReq: userRequest,
  {
    return this.InstagramPostService.accountList(null, null);
  }

  @RequireRoles(RoleName.ADMIN)
  @ApiOperation({
    summary: 'ایجاد پیکربندی احراز هویت Composio برای اینستاگرام',
  })
  @Post('auth-config/create')
  createAuthConfig(
    // @GetUser() userReq: userRequest,
    @Body() createAuthConfigDto: CreateAuthConfigDto
  ) {
    return this.InstagramPostService.createAuthConfig(
      null,
      createAuthConfigDto
    );
  }

  @RequireRoles(RoleName.ADMIN)
  @ApiOperation({ summary: 'لیست پیکربندی‌های احراز هویت' })
  @Get('auth-config/list')
  getAuthConfigs() // @Query() searchBaseDto: SearchBaseDto // @GetUser() userReq: userRequest,
  {
    return this.InstagramPostService.getAuthConfigs(null, null);
  }
}
