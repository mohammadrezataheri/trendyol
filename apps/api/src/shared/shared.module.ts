import { Module, Global } from '@nestjs/common';
import { LoadUserInterceptor } from './interceptors/load-user.interceptor';

/**
 * SharedModule برای اشتراک‌گذاری interceptor ها و سایر سرویس‌های مشترک
 * این module به صورت global است تا در همه جا در دسترس باشد
 */
@Global()
@Module({
  providers: [LoadUserInterceptor],
  exports: [LoadUserInterceptor],
})
export class SharedModule {}
