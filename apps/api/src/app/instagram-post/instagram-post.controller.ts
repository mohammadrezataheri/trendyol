import { InstagramPostService } from './instagram-post.service';
import { Get, Post, Query, Body, Controller, UseGuards } from '@nestjs/common';
import CreateAuthConfigDto from './dto/create-auth-config.dto';
import InitiateLoginDto from './dto/initiate-login.dto';
import SyncAccountDto from './dto/sync-account.dto';
import CreateManualCronDto from './dto/create-manual-cron.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiController } from 'src/shared/decorators/api-controller.decorator';
import { RoleName } from '../auth/entity/role.entity';
import { RequireRoles } from 'src/shared/decorators/require-roles.decorator';
import { GetUser, IGetUser } from 'src/shared/decorators/get-user.decorator';
import SearchBaseDto from 'src/shared/global/dto/searchBase.dto';

@ApiController('instagram-post')
export class AdminInstagramPostController {
  constructor(private InstagramPostService: InstagramPostService) {}

  @RequireRoles(RoleName.ADMIN)
  @ApiOperation({ summary: 'لیست اکانت های اینستاگرام' })
  @Get('account/list')
  accountList(@GetUser() user: IGetUser,@Query() SearchBaseDto: SearchBaseDto) {
    return this.InstagramPostService.accountList(user, SearchBaseDto);
  }

  @RequireRoles(RoleName.ADMIN)
  @ApiOperation({
    summary: 'شروع فرآیند لاگین اینستاگرام از طریق Composio',
    description: 'این endpoint یک URL برای لاگین اینستاگرام برمی‌گرداند که کاربر باید به آن مراجعه کند',
  })
  @Post('auth/login')
  initiateLogin(
    @GetUser() user: IGetUser,
    @Body() initiateLoginDto: InitiateLoginDto
  ) {
    return this.InstagramPostService.initiateLogin(user, initiateLoginDto);
  }

  @RequireRoles(RoleName.ADMIN)
  @ApiOperation({
    summary: 'همگام‌سازی اطلاعات اکانت اینستاگرام',
    description: 'این endpoint اطلاعات اکانت اینستاگرام را از Composio دریافت کرده و در دیتابیس به‌روزرسانی می‌کند',
  })
  @Post('account/sync')
  syncAccount(
    @GetUser() user: IGetUser,
    @Body() syncAccountDto: SyncAccountDto
  ) {
    return this.InstagramPostService.syncAccount(user, syncAccountDto);
  }

  @RequireRoles(RoleName.ADMIN)
  @ApiOperation({
    summary: 'ایجاد کرون جاب دستی',
    description: 'این endpoint یک کرون جاب جدید برای پست دستی ایجاد می‌کند',
  })
  @Post('cron/manual')
  createManualCron(
    @GetUser() user: IGetUser,
    @Body() createManualCronDto: CreateManualCronDto
  ) {
    return this.InstagramPostService.createManualCron(user, createManualCronDto);
  }

}
 