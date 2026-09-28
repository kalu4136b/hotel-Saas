import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Tenant,
  TenantStatus,
  SubscriptionTier,
  Property,
  User,
  UserRole,
  POSOutlet,
  DiningTable,
  TableStatus,
  Category,
  Product,
  POSShift,
  Order,
  OrderItem,
  KOT,
  KOTItem,
  Bill,
  Payment,
  AuditLog,
  RoomType,
  Room,
  RoomStatus,
  CleanlinessStatus,
  Guest,
  Reservation,
  ReservationStatus,
  GuestFolio,
  FolioStatus,
  FolioItem,
  FolioChargeType,
  FolioPayment,
} from '../entities';

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'hotel_saas',
  entities: [
    Tenant,
    Property,
    User,
    POSOutlet,
    DiningTable,
    Category,
    Product,
    POSShift,
    Order,
    OrderItem,
    KOT,
    KOTItem,
    Bill,
    Payment,
    AuditLog,
    RoomType,
    Room,
    Guest,
    Reservation,
    GuestFolio,
    FolioItem,
    FolioPayment,
  ],
  synchronize: true,
  logging: false,
});

async function runSeed() {
  console.log('🔄 Initializing database connection...');
  await AppDataSource.initialize();
  console.log('✅ Connected to MySQL database:', process.env.DB_DATABASE || 'hotel_saas');

  const tenantRepo = AppDataSource.getRepository(Tenant);
  const propertyRepo = AppDataSource.getRepository(Property);
  const userRepo = AppDataSource.getRepository(User);
  const outletRepo = AppDataSource.getRepository(POSOutlet);
  const tableRepo = AppDataSource.getRepository(DiningTable);
  const catRepo = AppDataSource.getRepository(Category);
  const productRepo = AppDataSource.getRepository(Product);
  const roomTypeRepo = AppDataSource.getRepository(RoomType);
  const roomRepo = AppDataSource.getRepository(Room);
  const guestRepo = AppDataSource.getRepository(Guest);
  const resRepo = AppDataSource.getRepository(Reservation);
  const folioRepo = AppDataSource.getRepository(GuestFolio);
  const folioItemRepo = AppDataSource.getRepository(FolioItem);

  const demoEmail = 'admin@hotel.com';
  let adminUser = await userRepo.findOne({ where: { email: demoEmail } });

  let tenant: Tenant;
  let property: Property;

  if (adminUser) {
    console.log(`ℹ️ Demo account (${demoEmail}) already exists. Fetching tenant & property...`);
    tenant = (await tenantRepo.findOne({ where: { id: adminUser.tenantId } }))!;
    property = (await propertyRepo.findOne({ where: { tenantId: tenant.id } }))!;
  } else {
    console.log('🌱 Creating Grand Horizon Demo Tenant & Property Profile...');
    tenant = await tenantRepo.save(
      tenantRepo.create({
        name: 'Grand Horizon Resort & Spa',
        slug: 'grand-horizon-resort',
        status: TenantStatus.ACTIVE,
        subscriptionTier: SubscriptionTier.BUSINESS,
      }),
    );

    property = await propertyRepo.save(
      propertyRepo.create({
        tenantId: tenant.id,
        name: 'Grand Horizon Hotel & Suites',
        code: 'GH-01',
        currency: 'USD',
        timezone: 'UTC',
        defaultTaxRate: 10.0,
        serviceChargeRate: 10.0,
        address: '88 Coastal Boulevard, Palm Beach',
        phone: '+1 (555) 438-9000',
        email: 'info@grandhorizonresort.com',
        isActive: true,
      }),
    );

    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    console.log('👥 Creating standard demo user accounts...');
    // 1. Admin
    adminUser = await userRepo.save(
      userRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        email: 'admin@hotel.com',
        username: 'admin',
        fullName: 'Alex Morgan (Admin)',
        role: UserRole.TENANT_ADMIN,
        passwordHash,
        phone: '+1 555-0101',
        isActive: true,
      }),
    );

    // 2. Manager
    await userRepo.save(
      userRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        email: 'manager@hotel.com',
        username: 'manager',
        fullName: 'Sarah Jenkins (Manager)',
        role: UserRole.MANAGER,
        passwordHash,
        phone: '+1 555-0102',
        isActive: true,
      }),
    );

    // 3. Cashier
    await userRepo.save(
      userRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        email: 'cashier@hotel.com',
        username: 'cashier',
        fullName: 'Leo Santos (Cashier)',
        role: UserRole.CASHIER,
        passwordHash,
        phone: '+1 555-0103',
        isActive: true,
      }),
    );

    // 4. Kitchen Chef
    await userRepo.save(
      userRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        email: 'kitchen@hotel.com',
        username: 'chef',
        fullName: 'Chef Gordon (Kitchen Head)',
        role: UserRole.KITCHEN,
        passwordHash,
        phone: '+1 555-0104',
        isActive: true,
      }),
    );
  }

  // 4. POS Outlet
  let outlet = await outletRepo.findOne({ where: { propertyId: property.id } });
  if (!outlet) {
    console.log('🍽️ Creating Primary POS Outlet: Horizon Terrace & Bistro...');
    outlet = await outletRepo.save(
      outletRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        name: 'Horizon Terrace & Bistro',
        code: 'OUTLET-MAIN',
        isActive: true,
      }),
    );
  }

  // 5. Dining Tables
  const existingTablesCount = await tableRepo.count({ where: { propertyId: property.id } });
  if (existingTablesCount === 0) {
    console.log('🪑 Seeding Dining Tables (T-01 to T-10)...');
    const tableSpecs = [
      { num: 'T-01', cap: 2, status: TableStatus.AVAILABLE },
      { num: 'T-02', cap: 2, status: TableStatus.OCCUPIED },
      { num: 'T-03', cap: 4, status: TableStatus.AVAILABLE },
      { num: 'T-04', cap: 4, status: TableStatus.AVAILABLE },
      { num: 'T-05', cap: 4, status: TableStatus.AVAILABLE },
      { num: 'T-06', cap: 6, status: TableStatus.AVAILABLE },
      { num: 'T-07', cap: 6, status: TableStatus.AVAILABLE },
      { num: 'T-08', cap: 8, status: TableStatus.AVAILABLE },
      { num: 'Bar-1', cap: 1, status: TableStatus.AVAILABLE },
      { num: 'Bar-2', cap: 1, status: TableStatus.AVAILABLE },
    ];

    for (const t of tableSpecs) {
      await tableRepo.save(
        tableRepo.create({
          tenantId: tenant.id,
          propertyId: property.id,
          outletId: outlet.id,
          tableNumber: t.num,
          capacity: t.cap,
          status: t.status,
        }),
      );
    }
  }

  // 6. Menu Categories & Products
  const existingCatCount = await catRepo.count({ where: { propertyId: property.id } });
  if (existingCatCount === 0) {
    console.log('🍕 Seeding Menu Categories and Chef Products...');
    const catStarters = await catRepo.save(
      catRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        name: 'Starters & Small Plates',
        description: 'Artisanal appetizers, tapas, and light bites',
        sortOrder: 1,
        isActive: true,
      }),
    );

    const catMains = await catRepo.save(
      catRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        name: "Chef's Special Mains",
        description: 'Prime cuts, fresh local catch, and signature entrees',
        sortOrder: 2,
        isActive: true,
      }),
    );

    const catPizza = await catRepo.save(
      catRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        name: 'Neapolitan Pizza & Pasta',
        description: 'Wood-fired sourdough pizza and house-made pasta',
        sortOrder: 3,
        isActive: true,
      }),
    );

    const catDesserts = await catRepo.save(
      catRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        name: 'Artisan Desserts',
        description: 'Decadent sweets crafted fresh daily by our pastry chef',
        sortOrder: 4,
        isActive: true,
      }),
    );

    const catBeverages = await catRepo.save(
      catRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        name: 'Signature Cocktails & Wines',
        description: 'Handcrafted mixology, local brews, and premium wines',
        sortOrder: 5,
        isActive: true,
      }),
    );

    // Products
    const items = [
      // Starters
      { cat: catStarters, name: 'Truffle Burrata Crostini', price: 18.5, sku: 'APP-001', desc: 'Fresh Pugliese burrata, black truffle honey, toasted sourdough' },
      { cat: catStarters, name: 'Wagyu Beef Carpaccio', price: 24.0, sku: 'APP-002', desc: 'Thinly sliced wagyu beef, caperberries, 24-month parmesan, white truffle oil' },
      { cat: catStarters, name: 'Crispy Calamari Fritti', price: 16.5, sku: 'APP-003', desc: 'Lightly battered baby squid with smoked paprika garlic aioli' },
      // Mains
      { cat: catMains, name: 'Pan-Seared Chilean Seabass', price: 38.0, sku: 'MAIN-001', desc: 'Saffron risotto, charred asparagus, lemon emulsion' },
      { cat: catMains, name: 'Prime Ribeye Steak (300g)', price: 46.0, sku: 'MAIN-002', desc: 'Grass-fed Angus ribeye, truffle potato puree, peppercorn jus' },
      { cat: catMains, name: 'Roasted Herb Spatchcock Chicken', price: 28.0, sku: 'MAIN-003', desc: 'Rosemary roasted potatoes, glazed baby carrots, thyme jus' },
      // Pizza & Pasta
      { cat: catPizza, name: 'Wood-Fired Margherita Pizza', price: 19.0, sku: 'PIZ-001', desc: 'San Marzano tomatoes, buffalo mozzarella, fresh basil, extra virgin olive oil' },
      { cat: catPizza, name: 'Truffle & Wild Mushroom Tagliolini', price: 28.5, sku: 'PAS-001', desc: 'Handmade ribbon pasta, porcini mushrooms, parmesan cream, winter truffle' },
      { cat: catPizza, name: 'Prosciutto Di Parma Pizza', price: 23.5, sku: 'PIZ-002', desc: 'Aged prosciutto, wild arugula, shaved parmesan, balsamic reduction' },
      // Desserts
      { cat: catDesserts, name: 'Belgian Chocolate Fondant', price: 14.0, sku: 'DES-001', desc: 'Warm molten chocolate cake with Madagascar vanilla bean gelato' },
      { cat: catDesserts, name: 'Sicilian Pistachio Tiramisu', price: 13.5, sku: 'DES-002', desc: 'Espresso-soaked ladyfingers with bronte pistachio mascarpone' },
      // Cocktails
      { cat: catBeverages, name: 'Smoked Vanilla Old Fashioned', price: 16.0, sku: 'BAR-001', desc: 'Bourbon, vanilla bean syrup, angostura bitters, applewood smoke' },
      { cat: catBeverages, name: 'Yuzu & Basil Botanical Gin Spritz', price: 15.0, sku: 'BAR-002', desc: 'Artisanal gin, fresh Japanese yuzu, sparkling prosecco, basil leaf' },
      { cat: catBeverages, name: 'Espresso Martini Classico', price: 15.5, sku: 'BAR-003', desc: 'Vodka, freshly pulled double espresso, coffee liqueur, cacao dust' },
    ];

    for (const item of items) {
      await productRepo.save(
        productRepo.create({
          tenantId: tenant.id,
          propertyId: property.id,
          categoryId: item.cat.id,
          name: item.name,
          description: item.desc,
          price: item.price,
          taxRate: 10.0,
          sku: item.sku,
          isActive: true,
        }),
      );
    }
  }

  // 7. PMS Room Types & Rooms
  const existingRoomTypesCount = await roomTypeRepo.count({ where: { propertyId: property.id } });
  if (existingRoomTypesCount === 0) {
    console.log('🏨 Seeding PMS Room Types and Luxury Rooms...');
    const villaType = await roomTypeRepo.save(
      roomTypeRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        name: 'Ocean Villa',
        code: 'VILLA',
        basePricePerNight: 340.0,
        maxOccupancy: 4,
        bedType: 'King Bed + Daybed',
        amenities: 'Private Plunge Pool, Panoramic Ocean View, Free Minibar, Espresso Bar, 24/7 Butler',
        description: 'Exquisite beachfront villa with private plunge pool and direct turquoise sea views.',
      }),
    );

    const suiteType = await roomTypeRepo.save(
      roomTypeRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        name: 'Deluxe Suite',
        code: 'SUITE',
        basePricePerNight: 290.0,
        maxOccupancy: 3,
        bedType: 'King Bed',
        amenities: 'Private Balcony, Hydro Spa Tub, Smart TV, Rainforest Shower, High-speed Fiber WiFi',
        description: 'Spacious contemporary suite featuring luxury marble bathroom and sunset views.',
      }),
    );

    const loftType = await roomTypeRepo.save(
      roomTypeRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        name: 'Mountain Loft',
        code: 'LOFT',
        basePricePerNight: 230.0,
        maxOccupancy: 2,
        bedType: 'Queen Bed',
        amenities: 'Scenic Forest View, Balcony Lounge, Organic Bath Amenities, Work Desk',
        description: 'Peaceful loft retreat immersed in lush tropical rainforest canopy.',
      }),
    );

    const bungalowType = await roomTypeRepo.save(
      roomTypeRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        name: 'Garden Bungalow',
        code: 'BUNGALOW',
        basePricePerNight: 180.0,
        maxOccupancy: 2,
        bedType: 'Queen Bed',
        amenities: 'Private Garden Patio, Hammock, Outdoor Shower, Artisan Tea Selection',
        description: 'Charming standalone bungalow nestled in exotic botanical gardens.',
      }),
    );

    const roomsToSeed = [
      { num: '304', floor: 3, type: villaType, status: RoomStatus.OCCUPIED, clean: CleanlinessStatus.CLEAN },
      { num: '308', floor: 3, type: villaType, status: RoomStatus.AVAILABLE, clean: CleanlinessStatus.CLEAN },
      { num: '102', floor: 1, type: suiteType, status: RoomStatus.AVAILABLE, clean: CleanlinessStatus.INSPECTED },
      { num: '108', floor: 1, type: suiteType, status: RoomStatus.RESERVED, clean: CleanlinessStatus.CLEAN },
      { num: '205', floor: 2, type: loftType, status: RoomStatus.OCCUPIED, clean: CleanlinessStatus.IN_CLEANING },
      { num: '208', floor: 2, type: loftType, status: RoomStatus.AVAILABLE, clean: CleanlinessStatus.CLEAN },
      { num: '12', floor: 1, type: bungalowType, status: RoomStatus.AVAILABLE, clean: CleanlinessStatus.CLEAN },
      { num: '14', floor: 1, type: bungalowType, status: RoomStatus.AVAILABLE, clean: CleanlinessStatus.DIRTY },
    ];

    const seededRooms: Room[] = [];
    for (const r of roomsToSeed) {
      const room = await roomRepo.save(
        roomRepo.create({
          tenantId: tenant.id,
          propertyId: property.id,
          roomTypeId: r.type.id,
          roomNumber: r.num,
          floor: r.floor,
          status: r.status,
          cleanlinessStatus: r.clean,
          notes: `Building A - Level ${r.floor}`,
        }),
      );
      seededRooms.push(room);
    }

    // 8. Guests & Active Reservations
    console.log('👤 Seeding Guest Profiles & Active Folios...');
    const guest1 = await guestRepo.save(
      guestRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        fullName: 'Alexander Wright',
        email: 'alex.wright@example.com',
        phone: '+1 (555) 349-2041',
        passportOrId: 'US-8940284',
        nationality: 'United States',
        vipLevel: 'PLATINUM',
      }),
    );

    await guestRepo.save(
      guestRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        fullName: 'Elena Rostova',
        email: 'elena.rostova@example.com',
        phone: '+44 7700 900481',
        passportOrId: 'GB-1049285',
        nationality: 'United Kingdom',
        vipLevel: 'VIP',
      }),
    );

    await guestRepo.save(
      guestRepo.create({
        tenantId: tenant.id,
        propertyId: property.id,
        fullName: 'Marcus Vance',
        email: 'marcus.v@example.com',
        phone: '+61 491 570 159',
        passportOrId: 'AU-7892301',
        nationality: 'Australia',
        vipLevel: 'STANDARD',
      }),
    );

    // Active Check-in for Room 304
    const room304 = seededRooms.find((r) => r.roomNumber === '304');
    if (room304) {
      const res1: Reservation = await resRepo.save(
        resRepo.create({
          tenantId: tenant.id,
          propertyId: property.id,
          reservationNumber: `RES-${Date.now().toString(36).toUpperCase()}-1`,
          guestId: guest1.id,
          roomTypeId: villaType.id,
          roomId: room304.id,
          checkInDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
          checkOutDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
          adultsCount: 2,
          childrenCount: 0,
          nightlyRate: 340.0,
          totalAmount: 1360.0,
          status: ReservationStatus.CHECKED_IN,
          source: 'DIRECT',
          specialRequests: 'Late checkout requested (2 PM). Complimentary sparkling wine sent.',
        }),
      );

      const folio: GuestFolio = await folioRepo.save(
        folioRepo.create({
          tenantId: tenant.id,
          propertyId: property.id,
          reservationId: res1.id,
          guestId: guest1.id,
          roomId: room304.id,
          status: FolioStatus.OPEN,
          totalCharges: 1420.0,
          totalPayments: 680.0,
          balanceDue: 740.0,
        }),
      );

      await folioItemRepo.save(
        folioItemRepo.create({
          folioId: folio.id,
          chargeType: FolioChargeType.ROOM_CHARGE,
          description: 'Ocean Villa (2 Nights Lodging)',
          amount: 680.0,
        }),
      );

      await folioItemRepo.save(
        folioItemRepo.create({
          folioId: folio.id,
          chargeType: FolioChargeType.RESTAURANT_POS,
          description: 'Horizon Bistro Dinner (Order #POS-1049)',
          amount: 120.0,
          referenceId: 'POS-1049',
        }),
      );
    }
  }

  console.log('\n======================================================');
  console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log(`🏨 Property:    ${property.name} (${tenant.name})`);
  console.log(`🔑 Login Portal: http://localhost:3000/login`);
  console.log('------------------------------------------------------');
  console.log('👤 DEMO USER CREDENTIALS (Password: Password123!)');
  console.log('------------------------------------------------------');
  console.log('  1. ADMIN:    admin@hotel.com   (TENANT_ADMIN - All access)');
  console.log('  2. MANAGER:  manager@hotel.com (MANAGER - Floor & Reports)');
  console.log('  3. CASHIER:  cashier@hotel.com (CASHIER - POS & Billing)');
  console.log('  4. KITCHEN:  kitchen@hotel.com (KITCHEN - Kitchen KDS)');
  console.log('======================================================\n');

  await AppDataSource.destroy();
}

runSeed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
