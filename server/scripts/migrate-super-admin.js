const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function migrate() {
  const c = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'hotel_saas'
  });

  console.log('1. Altering users.role enum...');
  await c.execute(
    "ALTER TABLE users MODIFY COLUMN role ENUM('SUPER_ADMIN','TENANT_ADMIN','MANAGER','CASHIER','KITCHEN') NOT NULL DEFAULT 'CASHIER'"
  );

  console.log('2. Making users.tenantId nullable...');
  await c.execute(
    "ALTER TABLE users MODIFY COLUMN tenantId VARCHAR(36) NULL"
  );

  console.log('3. Adding columns to tenants table...');
  const [cols] = await c.execute('DESCRIBE tenants');
  const existingCols = cols.map(col => col.Field);

  if (!existingCols.includes('modules')) {
    await c.execute('ALTER TABLE tenants ADD COLUMN modules TEXT NULL AFTER subscriptionTier');
  }
  if (!existingCols.includes('subscriptionPlan')) {
    await c.execute("ALTER TABLE tenants ADD COLUMN subscriptionPlan VARCHAR(50) NOT NULL DEFAULT 'CUSTOM' AFTER modules");
  }
  if (!existingCols.includes('planPrice')) {
    await c.execute("ALTER TABLE tenants ADD COLUMN planPrice DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER subscriptionPlan");
  }
  if (!existingCols.includes('billingCycle')) {
    await c.execute("ALTER TABLE tenants ADD COLUMN billingCycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' AFTER planPrice");
  }
  if (!existingCols.includes('maxRooms')) {
    await c.execute('ALTER TABLE tenants ADD COLUMN maxRooms INT NULL AFTER billingCycle');
  }
  if (!existingCols.includes('maxStaff')) {
    await c.execute('ALTER TABLE tenants ADD COLUMN maxStaff INT NULL AFTER maxRooms');
  }
  if (!existingCols.includes('expiresAt')) {
    await c.execute('ALTER TABLE tenants ADD COLUMN expiresAt DATETIME NULL AFTER maxStaff');
  }

  console.log('4. Initializing existing tenants with full module access...');
  const allModules = JSON.stringify([
    'pos', 'orders', 'tables', 'menu', 'kitchen',
    'pms_hub', 'pms_rooms', 'pms_reservations', 'pms_front_desk',
    'inventory', 'reports', 'settings', 'dashboard'
  ]);
  await c.execute('UPDATE tenants SET modules = ? WHERE modules IS NULL', [allModules]);

  console.log('5. Creating or updating default SUPER_ADMIN user...');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('SuperAdmin123!', salt);

  const [existingAdmin] = await c.execute(
    'SELECT id FROM users WHERE username = ? OR email = ?',
    ['superadmin', 'admin@ninthhotel.com']
  );

  if (existingAdmin.length === 0) {
    const adminId = crypto.randomUUID();
    await c.execute(
      `INSERT INTO users (id, tenantId, propertyId, email, username, fullName, phone, passwordHash, role, permissions, isActive)
       VALUES (?, NULL, NULL, 'admin@ninthhotel.com', 'superadmin', 'Platform Super Admin', '+1 800-555-0199', ?, 'SUPER_ADMIN', ?, 1)`,
      [adminId, hash, allModules]
    );
    console.log('Created Super Admin user: superadmin / SuperAdmin123!');
  } else {
    await c.execute(
      "UPDATE users SET role = 'SUPER_ADMIN', passwordHash = ?, permissions = ? WHERE id = ?",
      [hash, allModules, existingAdmin[0].id]
    );
    console.log('Updated existing Super Admin user!');
  }

  await c.end();
  console.log('Migration completed successfully!');
}

migrate().catch(console.error);
