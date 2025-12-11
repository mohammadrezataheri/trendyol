import {
  applyDecorators,
  Controller,
  UseGuards,
  SetMetadata,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoadUserInterceptor } from '../interceptors/load-user.interceptor';
import { JwtAuthGuard } from 'src/app/auth/guards/jwt-auth.guard';

/**
 * Metadata key برای endpoint های public
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator برای مشخص کردن endpoint های public (بدون احراز هویت)
 * این دکوریتور را روی endpoint های خاص استفاده کنید تا از احراز هویت معاف شوند
 *
 * @example
 * @ApiController('users')
 * export class UsersController {
 *   @Get('public')
 *   @Public()
 *   getPublicData() {
 *     return { message: 'This is public' };
 *   }
 *
 *   @Get('private')
 *   getPrivateData() {
 *     return { message: 'This requires auth' };
 *   }
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Decorator ترکیبی برای Controller های احراز هویت شده با JWT
 * این دکوریتور شامل:
 * - @Controller(path)
 * - @ApiTags(tag)
 * - @ApiBearerAuth('JWT-auth') (اگر useAuth = true)
 * - @UseGuards(JwtAuthGuard) (اگر useAuth = true)
 *
 * @param path - مسیر controller (مثلاً 'users', 'products')
 * @param options - گزینه‌های اختیاری:
 *   - tag: تگ Swagger (معمولاً همان path است)
 *   - useAuth: آیا احراز هویت لازم است؟ (پیش‌فرض: true)
 *
 * @example
 * // Controller با احراز هویت (پیش‌فرض)
 * @ApiController('users')
 * export class UsersController {
 *   @Get('profile')
 *   getProfile() { }
 *
 *   @Get('public')
 *   @Public() // این endpoint public است
 *   getPublic() { }
 * }
 *
 * @example
 * // Controller بدون احراز هویت
 * @ApiController('public', { useAuth: false })
 * export class PublicController {
 *   @Get('data')
 *   getData() { }
 * }
 */
export const ApiController = (
  path: string,
  options?: { tag?: string; useAuth?: boolean }
) => {
  const tag = options?.tag || path;
  const useAuth = options?.useAuth !== false; // پیش‌فرض true

  const decorators = [
    Controller(path),
    ApiTags(tag),
    UseInterceptors(LoadUserInterceptor),
  ];

  if (useAuth) {
    decorators.push(ApiBearerAuth('JWT-auth'), UseGuards(JwtAuthGuard));
  }

  return applyDecorators(...decorators);
};
