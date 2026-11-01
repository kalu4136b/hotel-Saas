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
  MainInventoryCategory,
  ItemType,
  InventoryCategory,
  RecipeItem,
  StockMovement,
  StockMovementType,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  ProcurementCategory,
  GoodsReceivedNote,
  GoodsReceivedNoteItem,
  GRNStatus,
  OperationalStockIssuance,
  OperationalStockIssuanceItem,
  IssuanceStatus,
  BarItem,
  BarCategory,
  BarPourLog,
  BarStockAdjustment,
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
    GoodsReceivedNote,
    GoodsReceivedNoteItem,
    OperationalStockIssuance,
    OperationalStockIssuanceItem,
    BarItem,
    BarPourLog,
    BarStockAdjustment,
  ],
  synchronize: true,
});

async function seedInventory() {
  await AppDataSource.initialize();
  console.log('--- Initializing Enhanced Inventory (Bar, Kitchen, Operational, PO, GRN) Seed ---');

  const propertyRepo = AppDataSource.getRepository(Property);
  const properties = await propertyRepo.find();

  for (const property of properties) {
    const { tenantId, id: propertyId } = property;
    console.log(`Seeding inventory for property: ${property.name} (${propertyId})`);

    const invRepo = AppDataSource.getRepository(InventoryItem);
    const existingCount = await invRepo.count({ where: { tenantId, propertyId } });
    if (existingCount > 0) {
      console.log(`  Updating existing items with category and UOM classifications...`);
      // Update existing items without mainCategory
      const items = await invRepo.find({ where: { tenantId, propertyId } });
      for (const item of items) {
        let changed = false;
        if (!item.mainCategory) {
          if (item.category === InventoryCategory.BEVERAGES) {
            item.mainCategory = MainInventoryCategory.BAR;
          } else if (item.category === InventoryCategory.AMENITIES || item.category === InventoryCategory.PACKAGING) {
            item.mainCategory = MainInventoryCategory.OPERATIONAL;
          } else {
            item.mainCategory = MainInventoryCategory.KITCHEN;
          }
          changed = true;
        }
        if (!item.purchaseUnit) {
          item.purchaseUnit = item.unit || 'PCS';
          item.conversionFactor = 1.0;
          changed = true;
        }
        if (changed) {
          await invRepo.save(item);
        }
      }
    }

    // 1. Seed / Ensure Suppliers
    const supplierRepo = AppDataSource.getRepository(Supplier);
    let s1 = await supplierRepo.findOne({ where: { tenantId, propertyId, name: 'Prime Fresh Produce & Dairy Co.' } });
    if (!s1) {
      s1 = await supplierRepo.save(
        supplierRepo.create({
          tenantId,
          propertyId,
          name: 'Prime Fresh Produce & Dairy Co.',
          supplierCode: 'SUP-FOOD-001',
          contactPerson: 'David Miller',
          email: 'orders@primefreshdairy.com',
          phone: '+1 (555) 234-8901',
          address: '45 Wholesale District Blvd, Metro City',
          paymentTerms: 'Net 30',
        }),
      );
    }

    let s2 = await supplierRepo.findOne({ where: { tenantId, propertyId, name: 'Apex Meats & Ocean Harvest' } });
    if (!s2) {
      s2 = await supplierRepo.save(
        supplierRepo.create({
          tenantId,
          propertyId,
          name: 'Apex Meats & Ocean Harvest',
          supplierCode: 'SUP-MEAT-002',
          contactPerson: 'Sarah Jenkins',
          email: 'supply@apexmeats.com',
          phone: '+1 (555) 345-6789',
          address: '12 Harbor Distribution Way, Bay Area',
          paymentTerms: 'Net 15',
        }),
      );
    }

    let s3 = await supplierRepo.findOne({ where: { tenantId, propertyId, name: 'Artisan Beverage & Spirits Logistics' } });
    if (!s3) {
      s3 = await supplierRepo.save(
        supplierRepo.create({
          tenantId,
          propertyId,
          name: 'Artisan Beverage & Spirits Logistics',
          supplierCode: 'SUP-BEV-003',
          contactPerson: 'Marco Rossi',
          email: 'marco@artisanbeverage.com',
          phone: '+1 (555) 456-7890',
          address: '88 Roasters Alley, Industrial Park',
          paymentTerms: 'Net 30',
        }),
      );
    }

    let s4 = await supplierRepo.findOne({ where: { tenantId, propertyId, name: 'Metro Hospitality Operational Depot' } });
    if (!s4) {
      s4 = await supplierRepo.save(
        supplierRepo.create({
          tenantId,
          propertyId,
          name: 'Metro Hospitality Operational Depot',
          supplierCode: 'SUP-OPS-004',
          contactPerson: 'Elena Rostova',
          email: 'sales@metroopsdepot.com',
          phone: '+1 (555) 567-8901',
          address: '100 Supply Terminal Road, North Sector',
          paymentTerms: 'Due on Receipt',
        }),
      );
    }

    // 2. Seed Items Across 3 Categories if not already present
    const seedItemList = [
      // --- A. BAR INVENTORY ---
      {
        name: 'Heineken Lager Beer (330ml Bottle)',
        sku: 'BAR-BEER-001',
        itemCode: 'BAR-BEER-001',
        mainCategory: MainInventoryCategory.BAR,
        subcategory: 'Beer & Cider',
        category: InventoryCategory.BEVERAGES,
        unit: 'BOTTLE',
        purchaseUnit: 'CARTON',
        conversionFactor: 24, // 1 Carton = 24 Bottles
        currentStock: 96, // 4 Cartons = 96 Bottles
        minStockLevel: 24,
        reorderLevel: 48,
        defaultSupplierId: s3.id,
        purchaseCost: 36.0, // $36 / carton = $1.50 / bottle
        costPerUnit: 1.5,
        sellingPrice: 7.0, // Retails at $7.00
        isSellingItem: true,
      },
      {
        name: 'Coca-Cola Zero Sugar (330ml Can)',
        sku: 'BAR-SODA-001',
        itemCode: 'BAR-SODA-001',
        mainCategory: MainInventoryCategory.BAR,
        subcategory: 'Soft Drinks & Mixers',
        category: InventoryCategory.BEVERAGES,
        unit: 'CAN',
        purchaseUnit: 'CARTON',
        conversionFactor: 24,
        currentStock: 120,
        minStockLevel: 48,
        reorderLevel: 72,
        defaultSupplierId: s3.id,
        purchaseCost: 19.2, // $0.80 / can
        costPerUnit: 0.8,
        sellingPrice: 4.5,
        isSellingItem: true,
      },
      {
        name: 'San Pellegrino Sparkling Mineral Water (750ml)',
        sku: 'BAR-WATER-001',
        itemCode: 'BAR-WATER-001',
        mainCategory: MainInventoryCategory.BAR,
        subcategory: 'Water',
        category: InventoryCategory.BEVERAGES,
        unit: 'BOTTLE',
        purchaseUnit: 'CARTON',
        conversionFactor: 12,
        currentStock: 36,
        minStockLevel: 12,
        reorderLevel: 24,
        defaultSupplierId: s3.id,
        purchaseCost: 24.0, // $2.00 / bottle
        costPerUnit: 2.0,
        sellingPrice: 8.0,
        isSellingItem: true,
      },
      {
        name: 'Fever-Tree Mediterranean Tonic (200ml)',
        sku: 'BAR-MIX-001',
        itemCode: 'BAR-MIX-001',
        mainCategory: MainInventoryCategory.BAR,
        subcategory: 'Soft Drinks & Mixers',
        category: InventoryCategory.BEVERAGES,
        unit: 'BOTTLE',
        purchaseUnit: 'CARTON',
        conversionFactor: 24,
        currentStock: 48,
        minStockLevel: 24,
        reorderLevel: 48,
        defaultSupplierId: s3.id,
        purchaseCost: 28.8,
        costPerUnit: 1.2,
        sellingPrice: 5.0,
        isSellingItem: true,
      },
      {
        name: 'Organic Fresh Lime & Cocktail Garnishes',
        sku: 'BAR-GARN-001',
        itemCode: 'BAR-GARN-001',
        mainCategory: MainInventoryCategory.BAR,
        subcategory: 'Bar Consumables',
        category: InventoryCategory.PRODUCE,
        unit: 'KG',
        purchaseUnit: 'BOX',
        conversionFactor: 5, // 5kg box
        currentStock: 8.5,
        minStockLevel: 4.0,
        reorderLevel: 6.0,
        defaultSupplierId: s1.id,
        purchaseCost: 18.0,
        costPerUnit: 3.6,
        isSellingItem: false,
      },

      // --- B. KITCHEN INVENTORY ---
      {
        name: 'Black Angus Beef Patties (180g)',
        sku: 'KIT-BEEF-001',
        itemCode: 'KIT-BEEF-001',
        mainCategory: MainInventoryCategory.KITCHEN,
        subcategory: 'Meat & Poultry',
        category: InventoryCategory.MEAT,
        unit: 'PCS',
        purchaseUnit: 'BOX',
        conversionFactor: 40, // 40 patties per box
        currentStock: 80,
        minStockLevel: 20,
        reorderLevel: 40,
        defaultSupplierId: s2.id,
        purchaseCost: 140.0,
        costPerUnit: 3.5,
        isSellingItem: false,
      },
      {
        name: 'Artisan Brioche Burger Buns',
        sku: 'KIT-BUN-001',
        itemCode: 'KIT-BUN-001',
        mainCategory: MainInventoryCategory.KITCHEN,
        subcategory: 'Dry Goods & Bakery',
        category: InventoryCategory.DRY_GOODS,
        unit: 'PCS',
        purchaseUnit: 'PACK',
        conversionFactor: 24,
        currentStock: 120,
        minStockLevel: 36,
        reorderLevel: 48,
        defaultSupplierId: s1.id,
        purchaseCost: 20.4,
        costPerUnit: 0.85,
        isSellingItem: false,
      },
      {
        name: 'Aged Wisconsin White Cheddar',
        sku: 'KIT-CHED-001',
        itemCode: 'KIT-CHED-001',
        mainCategory: MainInventoryCategory.KITCHEN,
        subcategory: 'Dairy & Cheese',
        category: InventoryCategory.DAIRY,
        unit: 'KG',
        purchaseUnit: 'BLOCK',
        conversionFactor: 2.5, // 2.5kg block
        currentStock: 12.5,
        minStockLevel: 5.0,
        reorderLevel: 10.0,
        defaultSupplierId: s1.id,
        purchaseCost: 28.0,
        costPerUnit: 11.2,
        isSellingItem: false,
        expiryTracking: true,
      },
      {
        name: 'Vine-Ripened Roma Tomatoes',
        sku: 'KIT-TOM-001',
        itemCode: 'KIT-TOM-001',
        mainCategory: MainInventoryCategory.KITCHEN,
        subcategory: 'Produce & Greens',
        category: InventoryCategory.PRODUCE,
        unit: 'KG',
        purchaseUnit: 'CRATE',
        conversionFactor: 10,
        currentStock: 25.0,
        minStockLevel: 8.0,
        reorderLevel: 15.0,
        defaultSupplierId: s1.id,
        purchaseCost: 34.0,
        costPerUnit: 3.4,
        isSellingItem: false,
        batchTracking: true,
      },
      {
        name: 'Premium Jasmine Rice (AAA Grade)',
        sku: 'KIT-RICE-001',
        itemCode: 'KIT-RICE-001',
        mainCategory: MainInventoryCategory.KITCHEN,
        subcategory: 'Dry Goods & Bakery',
        category: InventoryCategory.DRY_GOODS,
        unit: 'KG',
        purchaseUnit: 'BAG',
        conversionFactor: 25, // 25kg bag
        currentStock: 75.0,
        minStockLevel: 25.0,
        reorderLevel: 50.0,
        defaultSupplierId: s1.id,
        purchaseCost: 45.0,
        costPerUnit: 1.8,
        isSellingItem: false,
      },
      {
        name: 'Organic Barista Whole Milk',
        sku: 'KIT-MILK-001',
        itemCode: 'KIT-MILK-001',
        mainCategory: MainInventoryCategory.KITCHEN,
        subcategory: 'Dairy & Cheese',
        category: InventoryCategory.DAIRY,
        unit: 'L',
        purchaseUnit: 'CARTON',
        conversionFactor: 12,
        currentStock: 48.0,
        minStockLevel: 15.0,
        reorderLevel: 24.0,
        defaultSupplierId: s1.id,
        purchaseCost: 22.8,
        costPerUnit: 1.9,
        isSellingItem: false,
        expiryTracking: true,
      },

      // --- C. OPERATIONAL INVENTORY ---
      {
        name: 'Thermal POS Bill Rolls (80mm x 70m)',
        sku: 'OPS-ROLL-001',
        itemCode: 'OPS-ROLL-001',
        mainCategory: MainInventoryCategory.OPERATIONAL,
        subcategory: 'Stationery & Printing',
        category: InventoryCategory.OTHER,
        unit: 'ROLL',
        purchaseUnit: 'BOX',
        conversionFactor: 50, // 50 rolls per box
        currentStock: 120, // 120 rolls on hand
        minStockLevel: 30,
        reorderLevel: 50,
        defaultSupplierId: s4.id,
        purchaseCost: 42.5, // $0.85 per roll
        costPerUnit: 0.85,
        isSellingItem: false,
        itemType: ItemType.CONSUMABLE,
      },
      {
        name: 'Multi-Surface Hospital-Grade Sanitizer (5L)',
        sku: 'OPS-CLEAN-001',
        itemCode: 'OPS-CLEAN-001',
        mainCategory: MainInventoryCategory.OPERATIONAL,
        subcategory: 'Housekeeping & Cleaning',
        category: InventoryCategory.OTHER,
        unit: 'L',
        purchaseUnit: 'CAN',
        conversionFactor: 5,
        currentStock: 25.0,
        minStockLevel: 10.0,
        reorderLevel: 15.0,
        defaultSupplierId: s4.id,
        purchaseCost: 32.0, // $6.40 per L
        costPerUnit: 6.4,
        isSellingItem: false,
        itemType: ItemType.CONSUMABLE,
      },
      {
        name: 'Industrial Microfiber Wet/Dry Mop System',
        sku: 'OPS-MOP-001',
        itemCode: 'OPS-MOP-001',
        mainCategory: MainInventoryCategory.OPERATIONAL,
        subcategory: 'Housekeeping & Cleaning',
        category: InventoryCategory.OTHER,
        unit: 'PCS',
        purchaseUnit: 'SET',
        conversionFactor: 1,
        currentStock: 8,
        minStockLevel: 2,
        reorderLevel: 4,
        defaultSupplierId: s4.id,
        purchaseCost: 24.5,
        costPerUnit: 24.5,
        isSellingItem: false,
        itemType: ItemType.CONSUMABLE,
      },
      {
        name: 'Epson TM-T88VI Thermal Receipt Printer',
        sku: 'OPS-EQ-PRN-001',
        itemCode: 'OPS-EQ-PRN-001',
        mainCategory: MainInventoryCategory.OPERATIONAL,
        subcategory: 'IT & POS Hardware',
        category: InventoryCategory.OTHER,
        unit: 'UNIT',
        purchaseUnit: 'UNIT',
        conversionFactor: 1,
        currentStock: 3,
        minStockLevel: 1,
        reorderLevel: 2,
        defaultSupplierId: s4.id,
        purchaseCost: 260.0,
        costPerUnit: 260.0,
        isSellingItem: false,
        itemType: ItemType.REUSABLE_EQUIPMENT,
        assetTag: 'AST-PRN-101',
        serialNumber: 'SN-EPS-88VI-9921',
        assignedDepartment: 'FRONT_OFFICE',
      },
      {
        name: 'Datalogic 2D Wireless Barcode Scanner',
        sku: 'OPS-EQ-SCN-001',
        itemCode: 'OPS-EQ-SCN-001',
        mainCategory: MainInventoryCategory.OPERATIONAL,
        subcategory: 'IT & POS Hardware',
        category: InventoryCategory.OTHER,
        unit: 'UNIT',
        purchaseUnit: 'UNIT',
        conversionFactor: 1,
        currentStock: 4,
        minStockLevel: 1,
        reorderLevel: 2,
        defaultSupplierId: s4.id,
        purchaseCost: 145.0,
        costPerUnit: 145.0,
        isSellingItem: false,
        itemType: ItemType.REUSABLE_EQUIPMENT,
        assetTag: 'AST-SCN-201',
        serialNumber: 'SN-DLG-2D-4482',
        assignedDepartment: 'BAR',
      },
      {
        name: 'Karcher Professional Wet & Dry Vacuum Cleaner',
        sku: 'OPS-EQ-VAC-001',
        itemCode: 'OPS-EQ-VAC-001',
        mainCategory: MainInventoryCategory.OPERATIONAL,
        subcategory: 'Housekeeping & Cleaning',
        category: InventoryCategory.OTHER,
        unit: 'UNIT',
        purchaseUnit: 'UNIT',
        conversionFactor: 1,
        currentStock: 2,
        minStockLevel: 1,
        reorderLevel: 1,
        defaultSupplierId: s4.id,
        purchaseCost: 480.0,
        costPerUnit: 480.0,
        isSellingItem: false,
        itemType: ItemType.REUSABLE_EQUIPMENT,
        assetTag: 'AST-VAC-301',
        serialNumber: 'SN-KRC-NT30-1092',
        assignedDepartment: 'HOUSEKEEPING',
      },
    ];

    const savedItemsMap: Record<string, InventoryItem> = {};
    for (const itemData of seedItemList) {
      let existing = await invRepo.findOne({ where: { tenantId, propertyId, sku: itemData.sku } });
      if (!existing) {
        existing = await invRepo.save(
          invRepo.create({
            tenantId,
            propertyId,
            ...itemData,
            isActive: true,
          }),
        );
      }
      savedItemsMap[itemData.sku] = existing;
    }

    // 3. Seed Purchase Orders & GRNs if none exist
    const poRepo = AppDataSource.getRepository(PurchaseOrder);
    const existingPOs = await poRepo.count({ where: { tenantId, propertyId } });

    if (existingPOs === 0) {
      console.log('  Seeding Purchase Orders, Goods Received Notes & Movements...');

      // PO 1: Bar Beverages (Fully Received via GRN)
      const po1 = await poRepo.save(
        poRepo.create({
          tenantId,
          propertyId,
          poNumber: 'PO-2026-0001',
          supplierId: s3.id,
          status: PurchaseOrderStatus.FULLY_RECEIVED,
          inventoryCategory: ProcurementCategory.BAR,
          deliveryLocation: 'Central Bar Store',
          paymentTerms: 'Net 30',
          subtotal: 144.0,
          discountAmount: 0.0,
          taxAmount: 7.2,
          totalAmount: 151.2,
          notes: 'Standard weekend restock for Bar & Lounge',
          expectedDate: new Date(Date.now() - 3 * 86400000),
          receivedAt: new Date(Date.now() - 2 * 86400000),
          createdByName: 'Bar Manager',
          approvedByName: 'General Manager',
          approvedAt: new Date(Date.now() - 3 * 86400000),
          items: [
            AppDataSource.getRepository(PurchaseOrderItem).create({
              inventoryItemId: savedItemsMap['BAR-BEER-001'].id,
              purchaseUnit: 'CARTON',
              conversionFactor: 24,
              quantityOrdered: 4,
              quantityReceived: 4,
              quantityRejected: 0,
              unitCost: 36.0,
              totalCost: 144.0,
            }),
          ],
        }),
      );

      // GRN 1 against PO 1
      const grnRepo = AppDataSource.getRepository(GoodsReceivedNote);
      await grnRepo.save(
        grnRepo.create({
          tenantId,
          propertyId,
          grnNumber: 'GRN-2026-0001',
          purchaseOrderId: po1.id,
          supplierId: s3.id,
          inventoryCategory: 'BAR',
          receivedDate: new Date(Date.now() - 2 * 86400000),
          deliveryNoteNumber: 'DN-ARTISAN-8921',
          status: GRNStatus.RECEIVED,
          totalReceivedItems: 1,
          totalAcceptedQuantity: 4,
          totalRejectedQuantity: 0,
          totalAmount: 144.0,
          receivedByName: 'Bar Supervisor',
          notes: 'Delivered in good condition with cold chain verified',
          items: [
            AppDataSource.getRepository(GoodsReceivedNoteItem).create({
              purchaseOrderItemId: po1.items[0].id,
              inventoryItemId: savedItemsMap['BAR-BEER-001'].id,
              quantityOrdered: 4,
              quantityPreviouslyReceived: 0,
              quantityReceiving: 4,
              quantityAccepted: 4,
              quantityRejected: 0,
              unitCost: 36.0,
              totalCost: 144.0,
              batchNumber: 'HN-2026-B9',
            }),
          ],
        }),
      );

      // PO 2: Kitchen Supplies (Partially Received via GRN)
      const po2 = await poRepo.save(
        poRepo.create({
          tenantId,
          propertyId,
          poNumber: 'PO-2026-0002',
          supplierId: s1.id,
          status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
          inventoryCategory: ProcurementCategory.KITCHEN,
          deliveryLocation: 'Executive Kitchen Cold Store',
          paymentTerms: 'Net 30',
          subtotal: 182.0,
          discountAmount: 0.0,
          taxAmount: 9.1,
          totalAmount: 191.1,
          notes: 'Fresh dairy and roma tomatoes for banquet dinner',
          expectedDate: new Date(Date.now() - 1 * 86400000),
          createdByName: 'Head Chef',
          approvedByName: 'General Manager',
          approvedAt: new Date(Date.now() - 2 * 86400000),
          items: [
            AppDataSource.getRepository(PurchaseOrderItem).create({
              inventoryItemId: savedItemsMap['KIT-CHED-001'].id,
              purchaseUnit: 'BLOCK',
              conversionFactor: 2.5,
              quantityOrdered: 4, // 4 blocks = 10kg
              quantityReceived: 3, // 3 received, 1 rejected/remaining
              quantityRejected: 1,
              unitCost: 28.0,
              totalCost: 112.0,
            }),
            AppDataSource.getRepository(PurchaseOrderItem).create({
              inventoryItemId: savedItemsMap['KIT-TOM-001'].id,
              purchaseUnit: 'CRATE',
              conversionFactor: 10,
              quantityOrdered: 2, // 2 crates = 20kg
              quantityReceived: 2,
              quantityRejected: 0,
              unitCost: 34.0,
              totalCost: 68.0,
            }),
          ],
        }),
      );

      // GRN 2 against PO 2 (With 1 rejected cheese block due to damaged vacuum packaging)
      await grnRepo.save(
        grnRepo.create({
          tenantId,
          propertyId,
          grnNumber: 'GRN-2026-0002',
          purchaseOrderId: po2.id,
          supplierId: s1.id,
          inventoryCategory: 'KITCHEN',
          receivedDate: new Date(Date.now() - 1 * 86400000),
          deliveryNoteNumber: 'DN-PRIME-4431',
          status: GRNStatus.RECEIVED,
          totalReceivedItems: 2,
          totalAcceptedQuantity: 5,
          totalRejectedQuantity: 1,
          totalAmount: 152.0,
          receivedByName: 'Kitchen Receiving Clerk',
          notes: '1 Block Cheddar rejected due to punctured vacuum seal; replacement requested',
          items: [
            AppDataSource.getRepository(GoodsReceivedNoteItem).create({
              purchaseOrderItemId: po2.items[0].id,
              inventoryItemId: savedItemsMap['KIT-CHED-001'].id,
              quantityOrdered: 4,
              quantityPreviouslyReceived: 0,
              quantityReceiving: 4,
              quantityAccepted: 3,
              quantityRejected: 1,
              rejectionReason: 'Punctured vacuum seal / damaged packaging',
              unitCost: 28.0,
              totalCost: 84.0,
              batchNumber: 'CH-WISC-44',
            }),
            AppDataSource.getRepository(GoodsReceivedNoteItem).create({
              purchaseOrderItemId: po2.items[1].id,
              inventoryItemId: savedItemsMap['KIT-TOM-001'].id,
              quantityOrdered: 2,
              quantityPreviouslyReceived: 0,
              quantityReceiving: 2,
              quantityAccepted: 2,
              quantityRejected: 0,
              unitCost: 34.0,
              totalCost: 68.0,
              batchNumber: 'TOM-ROMA-08',
            }),
          ],
        }),
      );

      // PO 3: Operational Supplies (Approved, Pending GRN)
      await poRepo.save(
        poRepo.create({
          tenantId,
          propertyId,
          poNumber: 'PO-2026-0003',
          supplierId: s4.id,
          status: PurchaseOrderStatus.APPROVED,
          inventoryCategory: ProcurementCategory.OPERATIONAL,
          deliveryLocation: 'Central Operations Depot',
          paymentTerms: 'Due on Receipt',
          subtotal: 170.0,
          discountAmount: 10.0,
          taxAmount: 8.0,
          totalAmount: 168.0,
          notes: 'Bill rolls and cleaning detergent stock-up for monthly operations',
          expectedDate: new Date(Date.now() + 2 * 86400000),
          createdByName: 'Purchasing Officer',
          approvedByName: 'Financial Controller',
          approvedAt: new Date(),
          items: [
            AppDataSource.getRepository(PurchaseOrderItem).create({
              inventoryItemId: savedItemsMap['OPS-ROLL-001'].id,
              purchaseUnit: 'BOX',
              conversionFactor: 50,
              quantityOrdered: 4, // 4 boxes = 200 rolls
              quantityReceived: 0,
              quantityRejected: 0,
              unitCost: 42.5,
              totalCost: 170.0,
            }),
          ],
        }),
      );

      // 4. Seed Operational Issuance History
      const issRepo = AppDataSource.getRepository(OperationalStockIssuance);
      await issRepo.save(
        issRepo.create({
          tenantId,
          propertyId,
          issuanceNumber: 'ISS-2026-0001',
          issuanceDate: new Date(Date.now() - 1 * 86400000),
          department: 'FRONT_OFFICE',
          issuedByName: 'Storekeeper John',
          receivedByName: 'Front Desk Receptionist Sarah',
          totalItems: 1,
          totalQuantity: 20,
          status: IssuanceStatus.COMPLETED,
          notes: 'Monthly roll requisition for 4 check-in POS terminals',
          items: [
            AppDataSource.getRepository(OperationalStockIssuanceItem).create({
              inventoryItemId: savedItemsMap['OPS-ROLL-001'].id,
              quantity: 20,
              unitCost: 0.85,
              totalCost: 17.0,
              itemType: ItemType.CONSUMABLE,
              purpose: 'Front Desk Check-in terminals',
            }),
          ],
        }),
      );

      await issRepo.save(
        issRepo.create({
          tenantId,
          propertyId,
          issuanceNumber: 'ISS-2026-0002',
          issuanceDate: new Date(),
          department: 'BAR',
          issuedByName: 'Storekeeper John',
          receivedByName: 'Head Bartender Leo',
          totalItems: 2,
          totalQuantity: 11,
          status: IssuanceStatus.COMPLETED,
          notes: 'Receipt rolls and wireless scanner assignment',
          items: [
            AppDataSource.getRepository(OperationalStockIssuanceItem).create({
              inventoryItemId: savedItemsMap['OPS-ROLL-001'].id,
              quantity: 10,
              unitCost: 0.85,
              totalCost: 8.5,
              itemType: ItemType.CONSUMABLE,
              purpose: 'Main Bar register',
            }),
            AppDataSource.getRepository(OperationalStockIssuanceItem).create({
              inventoryItemId: savedItemsMap['OPS-EQ-SCN-001'].id,
              quantity: 1,
              unitCost: 145.0,
              totalCost: 145.0,
              itemType: ItemType.REUSABLE_EQUIPMENT,
              assetTag: 'AST-SCN-201',
              serialNumber: 'SN-DLG-2D-4482',
              purpose: 'Bar stock-take scanner',
            }),
          ],
        }),
      );

      // 5. Seed Movements
      const smRepo = AppDataSource.getRepository(StockMovement);
      await smRepo.save([
        smRepo.create({
          tenantId,
          propertyId,
          inventoryItemId: savedItemsMap['BAR-BEER-001'].id,
          inventoryCategory: 'BAR',
          movementType: StockMovementType.PURCHASE_RECEIPT,
          quantity: 96,
          quantityIn: 96,
          quantityOut: 0,
          previousStock: 0,
          newStock: 96,
          unitCost: 1.5,
          referenceId: 'GRN-2026-0001',
          reason: 'GRN-2026-0001 against PO-2026-0001 (4 Cartons accepted)',
          createdByName: 'Bar Supervisor',
        }),
        smRepo.create({
          tenantId,
          propertyId,
          inventoryItemId: savedItemsMap['OPS-ROLL-001'].id,
          inventoryCategory: 'OPERATIONAL',
          movementType: StockMovementType.OPERATIONAL_ISSUANCE,
          quantity: -20,
          quantityIn: 0,
          quantityOut: 20,
          previousStock: 150,
          newStock: 130,
          unitCost: 0.85,
          referenceId: 'ISS-2026-0001',
          department: 'FRONT_OFFICE',
          reason: 'Issued to FRONT_OFFICE (Received by Front Desk Receptionist Sarah)',
          createdByName: 'Storekeeper John',
        }),
        smRepo.create({
          tenantId,
          propertyId,
          inventoryItemId: savedItemsMap['OPS-ROLL-001'].id,
          inventoryCategory: 'OPERATIONAL',
          movementType: StockMovementType.OPERATIONAL_ISSUANCE,
          quantity: -10,
          quantityIn: 0,
          quantityOut: 10,
          previousStock: 130,
          newStock: 120,
          unitCost: 0.85,
          referenceId: 'ISS-2026-0002',
          department: 'BAR',
          reason: 'Issued to BAR (Received by Head Bartender Leo)',
          createdByName: 'Storekeeper John',
        }),
      ]);
    }
  }

  console.log('--- Inventory Seed Complete ---');
  await AppDataSource.destroy();
}

seedInventory().catch((err) => {
  console.error('Inventory seed failed:', err);
  process.exit(1);
});
