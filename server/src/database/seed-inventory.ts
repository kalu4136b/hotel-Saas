import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import {
  Tenant,
  Property,
  Category,
  Product,
  InventoryItem,
  InventoryCategory,
  InventoryUnit,
  RecipeItem,
  StockMovement,
  StockMovementType,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from '../entities';

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
    Category,
    Product,
    InventoryItem,
    RecipeItem,
    StockMovement,
    Supplier,
    PurchaseOrder,
    PurchaseOrderItem,
  ],
  synchronize: true,
});

async function seedInventory() {
  await AppDataSource.initialize();
  console.log('--- Initializing Phase 3 Inventory & Recipe Seed ---');

  const propertyRepo = AppDataSource.getRepository(Property);
  const properties = await propertyRepo.find();

  for (const property of properties) {
    const { tenantId, id: propertyId } = property;
    console.log(`Seeding inventory for property: ${property.name} (${propertyId})`);

    const invRepo = AppDataSource.getRepository(InventoryItem);
    const existingCount = await invRepo.count({ where: { tenantId, propertyId } });
    if (existingCount > 0) {
      console.log(`  Items already exist for this property. Skipping.`);
      continue;
    }

    // 1. Seed Suppliers
    const supplierRepo = AppDataSource.getRepository(Supplier);
    const s1 = await supplierRepo.save(
      supplierRepo.create({
        tenantId,
        propertyId,
        name: 'Prime Fresh Produce & Dairy Co.',
        contactPerson: 'David Miller',
        email: 'orders@primefreshdairy.com',
        phone: '+1 (555) 234-8901',
        address: '45 Wholesale District Blvd, Metro City',
      }),
    );

    const s2 = await supplierRepo.save(
      supplierRepo.create({
        tenantId,
        propertyId,
        name: 'Apex Meats & Ocean Harvest',
        contactPerson: 'Sarah Jenkins',
        email: 'supply@apexmeats.com',
        phone: '+1 (555) 345-6789',
        address: '12 Harbor Distribution Way, Bay Area',
      }),
    );

    const s3 = await supplierRepo.save(
      supplierRepo.create({
        tenantId,
        propertyId,
        name: 'Artisan Roast & Beverage Logistics',
        contactPerson: 'Marco Rossi',
        email: 'marco@artisanroast.com',
        phone: '+1 (555) 456-7890',
        address: '88 Roasters Alley, Industrial Park',
      }),
    );

    // 2. Seed Inventory Items
    const itemsData = [
      {
        name: 'Black Angus Beef Patties (180g)',
        sku: 'ING-BEEF-001',
        category: InventoryCategory.MEAT,
        unit: InventoryUnit.PCS,
        currentStock: 95,
        minStockLevel: 25,
        costPerUnit: 3.5,
      },
      {
        name: 'Artisan Brioche Burger Buns',
        sku: 'ING-BUN-001',
        category: InventoryCategory.DRY_GOODS,
        unit: InventoryUnit.PCS,
        currentStock: 120,
        minStockLevel: 30,
        costPerUnit: 0.85,
      },
      {
        name: 'Aged Wisconsin White Cheddar',
        sku: 'ING-CHED-001',
        category: InventoryCategory.DAIRY,
        unit: InventoryUnit.KG,
        currentStock: 14.5,
        minStockLevel: 5.0,
        costPerUnit: 11.2,
      },
      {
        name: 'Vine-Ripened Roma Tomatoes',
        sku: 'ING-TOM-001',
        category: InventoryCategory.PRODUCE,
        unit: InventoryUnit.KG,
        currentStock: 22.0,
        minStockLevel: 8.0,
        costPerUnit: 3.4,
      },
      {
        name: 'Prime USDA Ribeye Loins',
        sku: 'ING-RIBEYE-001',
        category: InventoryCategory.MEAT,
        unit: InventoryUnit.KG,
        currentStock: 28.0,
        minStockLevel: 10.0,
        costPerUnit: 24.5,
      },
      {
        name: 'Fresh Chilean Seabass Portions',
        sku: 'ING-SEABASS-001',
        category: InventoryCategory.MEAT,
        unit: InventoryUnit.KG,
        currentStock: 15.0,
        minStockLevel: 6.0,
        costPerUnit: 29.0,
      },
      {
        name: 'Estate Arabica Coffee Beans',
        sku: 'ING-COFFEE-001',
        category: InventoryCategory.BEVERAGES,
        unit: InventoryUnit.KG,
        currentStock: 35.0,
        minStockLevel: 10.0,
        costPerUnit: 18.5,
      },
      {
        name: 'Organic Barista Whole Milk',
        sku: 'ING-MILK-001',
        category: InventoryCategory.DAIRY,
        unit: InventoryUnit.L,
        currentStock: 48.0,
        minStockLevel: 15.0,
        costPerUnit: 1.9,
      },
      {
        name: 'Tropical Alphonso Mango Puree',
        sku: 'ING-MANGO-001',
        category: InventoryCategory.PRODUCE,
        unit: InventoryUnit.L,
        currentStock: 6.5, // near threshold!
        minStockLevel: 5.0,
        costPerUnit: 4.8,
      },
      {
        name: 'Eco-Craft Kraft Takeaway Boxes',
        sku: 'PKG-BOX-001',
        category: InventoryCategory.PACKAGING,
        unit: InventoryUnit.PCS,
        currentStock: 280,
        minStockLevel: 100,
        costPerUnit: 0.45,
      },
    ];

    const savedItems: Record<string, InventoryItem> = {};
    for (const data of itemsData) {
      const item = await invRepo.save(
        invRepo.create({
          tenantId,
          propertyId,
          ...data,
        }),
      );
      savedItems[data.sku] = item;
    }

    // 3. Connect Recipes (BOM) to Products
    const prodRepo = AppDataSource.getRepository(Product);
    const products = await prodRepo.find({ where: { tenantId, propertyId } });
    const recipeRepo = AppDataSource.getRepository(RecipeItem);

    for (const prod of products) {
      if (prod.name.includes('Angus Burger')) {
        await recipeRepo.save([
          recipeRepo.create({
            tenantId,
            propertyId,
            productId: prod.id,
            inventoryItemId: savedItems['ING-BEEF-001'].id,
            quantityRequired: 1, // 1 patty
          }),
          recipeRepo.create({
            tenantId,
            propertyId,
            productId: prod.id,
            inventoryItemId: savedItems['ING-BUN-001'].id,
            quantityRequired: 1, // 1 bun
          }),
          recipeRepo.create({
            tenantId,
            propertyId,
            productId: prod.id,
            inventoryItemId: savedItems['ING-CHED-001'].id,
            quantityRequired: 0.05, // 50g cheese
          }),
          recipeRepo.create({
            tenantId,
            propertyId,
            productId: prod.id,
            inventoryItemId: savedItems['ING-TOM-001'].id,
            quantityRequired: 0.04, // 40g tomato
          }),
        ]);
        console.log(`  Linked BOM recipe for: ${prod.name}`);
      } else if (prod.name.includes('Ribeye')) {
        await recipeRepo.save([
          recipeRepo.create({
            tenantId,
            propertyId,
            productId: prod.id,
            inventoryItemId: savedItems['ING-RIBEYE-001'].id,
            quantityRequired: 0.3, // 300g
          }),
        ]);
        console.log(`  Linked BOM recipe for: ${prod.name}`);
      } else if (prod.name.includes('Seabass')) {
        await recipeRepo.save([
          recipeRepo.create({
            tenantId,
            propertyId,
            productId: prod.id,
            inventoryItemId: savedItems['ING-SEABASS-001'].id,
            quantityRequired: 0.25, // 250g
          }),
        ]);
        console.log(`  Linked BOM recipe for: ${prod.name}`);
      } else if (prod.name.includes('Mango Smoothie')) {
        await recipeRepo.save([
          recipeRepo.create({
            tenantId,
            propertyId,
            productId: prod.id,
            inventoryItemId: savedItems['ING-MANGO-001'].id,
            quantityRequired: 0.2, // 200ml
          }),
          recipeRepo.create({
            tenantId,
            propertyId,
            productId: prod.id,
            inventoryItemId: savedItems['ING-MILK-001'].id,
            quantityRequired: 0.15, // 150ml milk
          }),
        ]);
        console.log(`  Linked BOM recipe for: ${prod.name}`);
      }
    }

    // 4. Seed a Sample Purchase Order (PO)
    const poRepo = AppDataSource.getRepository(PurchaseOrder);
    const poItemRepo = AppDataSource.getRepository(PurchaseOrderItem);

    const samplePo = await poRepo.save(
      poRepo.create({
        tenantId,
        propertyId,
        supplierId: s1.id,
        poNumber: 'PO-2026-0001',
        status: PurchaseOrderStatus.RECEIVED,
        totalAmount: 184.5,
        notes: 'Weekly fresh dairy and produce delivery',
        expectedDate: new Date(),
        receivedAt: new Date(),
      }),
    );

    await poItemRepo.save([
      poItemRepo.create({
        purchaseOrderId: samplePo.id,
        inventoryItemId: savedItems['ING-CHED-001'].id,
        quantityOrdered: 10,
        quantityReceived: 10,
        unitCost: 11.2,
        totalCost: 112.0,
      }),
      poItemRepo.create({
        purchaseOrderId: samplePo.id,
        inventoryItemId: savedItems['ING-MILK-001'].id,
        quantityOrdered: 30,
        quantityReceived: 30,
        unitCost: 1.9,
        totalCost: 57.0,
      }),
    ]);
  }

  console.log('--- Phase 3 Inventory & Recipe Seed Complete! ---');
  await AppDataSource.destroy();
}

seedInventory().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
