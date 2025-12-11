import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/shared/decorators/api-controller.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // بررسی می‌کنیم که آیا endpoint public است یا نه
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // اگر endpoint public باشد، احراز هویت اختیاری است
    // اگر توکن وجود داشت، آن را validate می‌کنیم اما اگر نبود، خطا نمی‌دهیم
    if (isPublic) {
      // تلاش می‌کنیم توکن را validate کنیم (اگر وجود داشت)
      // اما اگر توکن نبود یا نامعتبر بود، خطا نمی‌دهیم
      // برای این کار، canActivate را اجرا می‌کنیم اما در handleRequest خطا را handle می‌کنیم
      const result = super.canActivate(context);

      // اگر Promise است، آن را handle می‌کنیم
      if (result instanceof Promise) {
        return result.catch(() => true); // اگر خطا داشت، true برمی‌گردانیم (endpoint قابل دسترسی است)
      }

      return result;
    }

    // در غیر این صورت، احراز هویت اجباری است
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // بررسی می‌کنیم که آیا endpoint public است یا نه
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // اگر endpoint public باشد و توکن نامعتبر بود یا وجود نداشت، خطا نمی‌دهیم
    // فقط user را null برمی‌گردانیم (تا بتوانیم تشخیص دهیم که کاربر لاگین نکرده)
    if (isPublic) {
      // اگر خطا وجود داشت یا کاربر پیدا نشد، null برمی‌گردانیم (نه خطا)
      if (err || !user) {
        return null;
      }
      // اگر کاربر پیدا شد، آن را برمی‌گردانیم
      return user;
    }

    // در غیر این صورت (endpoint public نیست)، رفتار عادی را انجام می‌دهیم
    // اگر خطا وجود داشت یا کاربر پیدا نشد، خطا می‌دهیم
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }

    return user;
  }
}
