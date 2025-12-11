import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './api-controller.decorator';
import { User } from 'src/app/auth/entity/user.entity';

export type { IGetUser, GetUserField } from './get-user.interface';

/**
 * Decorator برای دریافت اطلاعات کاربر از request
 * این دکوریتور اطلاعات کاربر را از request.user برمی‌گرداند
 * اطلاعات کاربر توسط LoadUserInterceptor از دیتابیس بارگذاری می‌شود
 *
 * در endpoint های public: اگر کاربر لاگین کرده باشد، اطلاعاتش را برمی‌گرداند وگرنه null
 * در endpoint های معمولی: اگر کاربر لاگین نکرده باشد، خطا می‌دهد
 *
 * @example
 * // دریافت کل اطلاعات کاربر از دیتابیس (endpoint معمولی)
 * @Get('profile')
 * async getProfile(@GetUser() user: User) {
 *   return user;
 * }
 *
 * @example
 * // دریافت کل اطلاعات کاربر در endpoint public
 * @Get('public')
 * @Public()
 * async getPublicData(@GetUser() user: User | null) {
 *   if (user) {
 *     return { message: `Hello ${user.email}` };
 *   }
 *   return { message: 'Hello Guest' };
 * }
 *
 * @example
 * // دریافت یک فیلد خاص از کاربر
 * @Get('profile')
 * async getProfile(@GetUser('id') userId: string) {
 *   return userId;
 * }
 *
 * @example
 * // دریافت یک فیلد خاص در endpoint public
 * @Get('public')
 * @Public()
 * async getPublicData(@GetUser('id') userId: string | null) {
 *   if (userId) {
 *     return { userId };
 *   }
 *   return { message: 'No user' };
 * }
 */
export const GetUser = createParamDecorator(
  <K extends keyof User>(
    data: K | undefined,
    ctx: ExecutionContext
  ): User | User[K] | null => {
    const request = ctx.switchToHttp().getRequest();

    // بررسی می‌کنیم که آیا endpoint public است یا نه
    const handler = ctx.getHandler();
    const classRef = ctx.getClass();
    const isPublic =
      Reflect.getMetadata(IS_PUBLIC_KEY, handler) ||
      Reflect.getMetadata(IS_PUBLIC_KEY, classRef);

    // دریافت کاربر از request
    // اطلاعات کاربر توسط LoadUserInterceptor از دیتابیس بارگذاری شده است
    const user = request.user as User | null;

    // اگر endpoint public است و کاربر لاگین نکرده، null برمی‌گردانیم
    if (isPublic && !user) {
      return null;
    }

    // اگر endpoint معمولی است و کاربر لاگین نکرده، خطا می‌دهیم
    if (!isPublic && !user) {
      throw new Error(
        'User not found in request. Make sure JwtAuthGuard is applied.'
      );
    }

    // اگر data مشخص شده باشد، فقط آن فیلد را برمی‌گردانیم
    return data ? user[data] : user;
  }
);
