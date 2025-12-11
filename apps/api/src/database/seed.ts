import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { User } from '../app/auth/entity/user.entity';
import { Role, RoleName } from '../app/auth/entity/role.entity';
import * as bcrypt from 'bcrypt';

// Load environment variables
const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env'
    : `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: resolve(process.cwd(), envFile) });
dotenv.config({ path: resolve(process.cwd(), '.env') }); // Fallback to .env

async function seed() {
  // ایجاد connection به دیتابیس
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'trendyol_scrapper',
    entities: [User, Role],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const roleRepository = dataSource.getRepository(Role);
    const userRepository = dataSource.getRepository(User);

    // 1. ایجاد نقش‌ها
    console.log('📝 Seeding roles...');
    const roles: Role[] = [];
    for (const roleName of Object.values(RoleName)) {
      let role = await roleRepository.findOne({ where: { name: roleName } });
      if (!role) {
        role = roleRepository.create({
          name: roleName,
          description: `${roleName} role`,
        });
        role = await roleRepository.save(role);
        console.log(`  ✓ Created role: ${roleName}`);
      } else {
        console.log(`  - Role already exists: ${roleName}`);
      }
      roles.push(role);
    }

    // 2. ایجاد کاربران اولیه
    console.log('\n👤 Seeding users...');

    // Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@trendyol.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';

    let adminUser = await userRepository.findOne({
      where: { email: adminEmail },
    });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      adminUser = userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        roles: [roles.find((r) => r.name === RoleName.ADMIN)!],
        isActive: true,
      });
      adminUser = await userRepository.save(adminUser);
      console.log(`  ✓ Created admin user: ${adminEmail}`);
      console.log(`    Password: ${adminPassword}`);
    } else {
      console.log(`  - Admin user already exists: ${adminEmail}`);
    }

    // Supplier User
    const supplierEmail = process.env.SUPPLIER_EMAIL || 'supplier@trendyol.com';
    const supplierPassword = process.env.SUPPLIER_PASSWORD || 'Supplier123!@#';

    let supplierUser = await userRepository.findOne({
      where: { email: supplierEmail },
    });
    if (!supplierUser) {
      const hashedPassword = await bcrypt.hash(supplierPassword, 10);
      supplierUser = userRepository.create({
        email: supplierEmail,
        password: hashedPassword,
        firstName: 'Supplier',
        lastName: 'User',
        roles: [roles.find((r) => r.name === RoleName.SUPPLIER)!],
        isActive: true,
      });
      supplierUser = await userRepository.save(supplierUser);
      console.log(`  ✓ Created supplier user: ${supplierEmail}`);
      console.log(`    Password: ${supplierPassword}`);
    } else {
      console.log(`  - Supplier user already exists: ${supplierEmail}`);
    }

    // Carrier User
    const carrierEmail = process.env.CARRIER_EMAIL || 'carrier@trendyol.com';
    const carrierPassword = process.env.CARRIER_PASSWORD || 'Carrier123!@#';

    let carrierUser = await userRepository.findOne({
      where: { email: carrierEmail },
    });
    if (!carrierUser) {
      const hashedPassword = await bcrypt.hash(carrierPassword, 10);
      carrierUser = userRepository.create({
        email: carrierEmail,
        password: hashedPassword,
        firstName: 'Carrier',
        lastName: 'User',
        roles: [roles.find((r) => r.name === RoleName.CARRIER)!],
        isActive: true,
      });
      carrierUser = await userRepository.save(carrierUser);
      console.log(`  ✓ Created carrier user: ${carrierEmail}`);
      console.log(`    Password: ${carrierPassword}`);
    } else {
      console.log(`  - Carrier user already exists: ${carrierEmail}`);
    }

    // User with multiple roles
    const multiRoleEmail =
      process.env.MULTI_ROLE_EMAIL || 'multirole@trendyol.com';
    const multiRolePassword =
      process.env.MULTI_ROLE_PASSWORD || 'MultiRole123!@#';

    let multiRoleUser = await userRepository.findOne({
      where: { email: multiRoleEmail },
    });
    if (!multiRoleUser) {
      const hashedPassword = await bcrypt.hash(multiRolePassword, 10);
      multiRoleUser = userRepository.create({
        email: multiRoleEmail,
        password: hashedPassword,
        firstName: 'Multi',
        lastName: 'Role',
        roles: [
          roles.find((r) => r.name === RoleName.SUPPLIER)!,
          roles.find((r) => r.name === RoleName.CARRIER)!,
        ],
        isActive: true,
      });
      multiRoleUser = await userRepository.save(multiRoleUser);
      console.log(`  ✓ Created multi-role user: ${multiRoleEmail}`);
      console.log(`    Password: ${multiRolePassword}`);
      console.log(`    Roles: Supplier, Carrier`);
    } else {
      console.log(`  - Multi-role user already exists: ${multiRoleEmail}`);
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  - Roles: Admin, Supplier, Carrier');
    console.log('  - Users: Admin, Supplier, Carrier, Multi-Role');
    console.log('\n💡 Tip: You can customize users via environment variables:');
    console.log('  ADMIN_EMAIL, ADMIN_PASSWORD');
    console.log('  SUPPLIER_EMAIL, SUPPLIER_PASSWORD');
    console.log('  CARRIER_EMAIL, CARRIER_PASSWORD');
    console.log('  MULTI_ROLE_EMAIL, MULTI_ROLE_PASSWORD');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seed();
