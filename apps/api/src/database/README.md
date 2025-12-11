# Database Seeding

این فولدر شامل script های seeding برای ایجاد داده‌های اولیه در دیتابیس است.

## نحوه استفاده

### اجرای Seed

```bash
pnpm seed
```

این دستور:
- نقش‌های اولیه را ایجاد می‌کند (Admin, Supplier, Carrier)
- کاربران اولیه را ایجاد می‌کند:
  - Admin User
  - Supplier User
  - Carrier User
  - Multi-Role User (با نقش‌های Supplier و Carrier)

### تنظیمات

می‌توانید اطلاعات کاربران را از طریق متغیرهای محیطی در `.env.development` تنظیم کنید:

```env
ADMIN_EMAIL=admin@trendyol.com
ADMIN_PASSWORD=Admin123!@#
SUPPLIER_EMAIL=supplier@trendyol.com
SUPPLIER_PASSWORD=Supplier123!@#
CARRIER_EMAIL=carrier@trendyol.com
CARRIER_PASSWORD=Carrier123!@#
MULTI_ROLE_EMAIL=multirole@trendyol.com
MULTI_ROLE_PASSWORD=MultiRole123!@#
```

اگر این متغیرها تنظیم نشوند، مقادیر پیش‌فرض استفاده می‌شوند.

### نکات مهم

- Seed script به صورت idempotent است - اگر داده‌ها از قبل وجود داشته باشند، دوباره ایجاد نمی‌شوند
- برای reset کردن دیتابیس، ابتدا دیتابیس را drop کنید و دوباره seed را اجرا کنید
- در production، حتماً password های قوی تنظیم کنید

