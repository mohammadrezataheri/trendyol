# Trendyol Scrapper Dashboard

داشبورد مدیریتی برای Trendyol Scrapper با استفاده از Next.js و Refine.dev

## ویژگی‌ها

- ✅ احراز هویت کامل (Login/Register)
- ✅ داشبورد با آمار
- ✅ مدیریت کاربران
- ✅ مدیریت محصولات
- ✅ مدیریت پیکربندی اسکرپ

## راه‌اندازی

1. نصب وابستگی‌ها:
```bash
pnpm install
```

2. تنظیم متغیرهای محیطی:
```bash
# ایجاد فایل .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

3. اجرای اپلیکیشن:
```bash
pnpm dev:dashboard
# یا
nx serve dashboard
```

اپلیکیشن روی پورت 4200 اجرا می‌شود.

## ساختار پروژه

```
apps/dashboard/
├── src/
│   ├── app/              # صفحات Next.js App Router
│   │   ├── dashboard/    # صفحه داشبورد
│   │   ├── users/        # مدیریت کاربران
│   │   ├── products/     # مدیریت محصولات
│   │   ├── scrape-configs/ # مدیریت پیکربندی‌ها
│   │   └── login/        # صفحه ورود
│   ├── components/       # کامپوننت‌های React
│   ├── providers/        # Provider های Refine (auth, data)
│   └── config/           # تنظیمات Refine
```

## استفاده

1. ابتدا API را اجرا کنید (`pnpm dev:api`)
2. سپس داشبورد را اجرا کنید (`pnpm dev:dashboard`)
3. به آدرس `http://localhost:4200` بروید
4. با حساب کاربری خود وارد شوید

## تکنولوژی‌ها

- **Next.js 16** - Framework React
- **Refine.dev** - Framework مدیریت داده
- **Ant Design** - UI Components
- **TypeScript** - Type Safety

