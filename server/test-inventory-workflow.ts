import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { InventoryService } from './src/inventory/inventory.service';
import { Property, MainInventoryCategory, ItemType, PurchaseOrderStatus, ProcurementCategory } from './src/entities';
import { DataSource } from 'typeorm';

async function runTests() {
  console.log('--- Starting Inventory Workflow End-to-End Verification ---');
  const app = await NestFactory.createApplicationContext(AppModule);
  const inventoryService = app.get(InventoryService);
  const dataSource = app.get(DataSource);

  try {
    const propertyRepo = dataSource.getRepository(Property);
    const property = await propertyRepo.findOne({ where: {} });
    if (!property) {
      throw new Error('No property found in database. Seed data first.');
    }
    const { tenantId, id: propertyId } = property;
    console.log(`[PASS] Using Tenant ID: ${tenantId}, Property ID: ${propertyId}`);

    // 1. Fetch Existing Suppliers
    const suppliers = await inventoryService.getSuppliers(tenantId, propertyId);
    if (!suppliers.length) {
      throw new Error('No suppliers found in database');
    }
    const testSupplier = suppliers[0];
    console.log(`[PASS] Using Supplier: ${testSupplier.name} (${testSupplier.supplierCode})`);

    // 2. Create a specialized test Bar Item with UOM conversion (e.g. Case of 24 bottles)
    const testItem = await inventoryService.createItem(tenantId, propertyId, {
      name: `Test Premium Vodka Case-${Date.now()}`,
      sku: `VODKA-TEST-${Date.now().toString().slice(-4)}`,
      mainCategory: MainInventoryCategory.BAR,
      subcategory: 'Spirits',
      unit: 'BOTTLE',
      purchaseUnit: 'CASE_24',
      conversionFactor: 24, // 1 case = 24 bottles
      currentStock: 0,
      minStockLevel: 5,
      reorderLevel: 10,
      purchaseCost: 240, // $240 per case -> $10 per bottle
      costPerUnit: 10,
      sellingPrice: 18,
      isSellingItem: true,
      itemType: ItemType.CONSUMABLE,
      defaultSupplierId: testSupplier.id,
    });
    console.log(`[PASS] Created Test Item: ${testItem.name} with Initial Stock: ${testItem.currentStock} ${testItem.unit}`);

    // 3. Create a Purchase Order for 5 Cases of this item
    const po = await inventoryService.createPurchaseOrder(
      tenantId,
      propertyId,
      {
        supplierId: testSupplier.id,
        inventoryCategory: ProcurementCategory.BAR,
        deliveryLocation: 'Main Cellar',
        paymentTerms: 'Net 30',
        expectedDate: new Date().toISOString(),
        items: [
          {
            inventoryItemId: testItem.id,
            purchaseUnit: 'CASE_24',
            conversionFactor: 24,
            quantityOrdered: 5, // 5 Cases = 120 bottles
            unitCost: 240,
          },
        ],
      },
      'tester-user-id',
      'Test Procurement Officer',
    );
    console.log(`[PASS] Created PO: ${po.poNumber} with Status: ${po.status}`);
    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      throw new Error(`Expected PENDING_APPROVAL status, got ${po.status}`);
    }

    // 4. CRITICAL TEST: Approve PO - Verify stock does NOT change!
    const approvedPo = await inventoryService.approvePurchaseOrder(
      tenantId,
      propertyId,
      po.id,
      'admin-approver-id',
      'General Manager Test',
    );
    console.log(`[PASS] PO Approved: ${approvedPo.poNumber}, Status: ${approvedPo.status}`);
    if (approvedPo.status !== PurchaseOrderStatus.APPROVED) {
      throw new Error(`Expected APPROVED status, got ${approvedPo.status}`);
    }

    const itemAfterPoApproval = await inventoryService.getItem(tenantId, propertyId, testItem.id);
    console.log(`[VERIFICATION] Stock after PO approval: ${itemAfterPoApproval.currentStock}`);
    if (Number(itemAfterPoApproval.currentStock) !== 0) {
      throw new Error(`CRITICAL FAILURE: Stock incremented upon PO approval! Current stock: ${itemAfterPoApproval.currentStock}`);
    }
    console.log('[PASS - CRITICAL RULE] Stock strictly did NOT increase upon PO approval.');

    // 5. Partial Receiving via GRN
    // PO Item has 5 cases ordered.
    // Delivery arrives with 3 cases: 2 accepted, 1 rejected due to breakage.
    const fullPo = await inventoryService.getPurchaseOrder(tenantId, propertyId, approvedPo.id);
    const poItemId = fullPo.items[0].id;
    const grn1 = await inventoryService.createGRN(
      tenantId,
      propertyId,
      {
        purchaseOrderId: approvedPo.id,
        deliveryNoteNumber: `DN-TEST-${Date.now().toString().slice(-4)}`,
        receivedDate: new Date().toISOString(),
        notes: 'Partial shipment received; 1 carton crushed during transit',
        items: [
          {
            purchaseOrderItemId: poItemId,
            inventoryItemId: testItem.id,
            quantityReceiving: 3,
            quantityAccepted: 2, // 2 cases * 24 = 48 bottles added
            quantityRejected: 1, // 1 case rejected
            rejectionReason: 'Broken glass and leakage in transit',
            unitCost: 240,
          },
        ],
      },
      'clerk-id',
      'Receiving Clerk Alex',
    );
    console.log(`[PASS] Created GRN 1: ${grn1.grnNumber}, Total Accepted: ${grn1.totalAcceptedQuantity}, Total Rejected: ${grn1.totalRejectedQuantity}`);

    // Check item stock: should be exactly 2 cases * 24 = 48 bottles
    const itemAfterGrn1 = await inventoryService.getItem(tenantId, propertyId, testItem.id);
    console.log(`[VERIFICATION] Stock after GRN 1: ${itemAfterGrn1.currentStock} ${itemAfterGrn1.unit}`);
    if (Number(itemAfterGrn1.currentStock) !== 48) {
      throw new Error(`Expected 48 bottles, got ${itemAfterGrn1.currentStock}`);
    }
    console.log('[PASS - CONVERSION & ACCEPTED ONLY] Exactly 48 bottles added (rejected 1 case was excluded).');

    // Check PO status: should now be PARTIALLY_RECEIVED
    const poAfterGrn1 = await inventoryService.getPurchaseOrder(tenantId, propertyId, approvedPo.id);
    console.log(`[VERIFICATION] PO status after partial GRN: ${poAfterGrn1.status}`);
    if (poAfterGrn1.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
      throw new Error(`Expected PARTIALLY_RECEIVED, got ${poAfterGrn1.status}`);
    }
    console.log('[PASS] PO transitioned correctly to PARTIALLY_RECEIVED.');

    // 6. Complete remaining shipment via GRN 2
    // Supplier sends 3 cases (2 balance ordered + 1 replacement for rejected bottle in GRN 1).
    // Total accepted will now equal 2 + 3 = 5 cases = 120 bottles.
    const grn2 = await inventoryService.createGRN(
      tenantId,
      propertyId,
      {
        purchaseOrderId: approvedPo.id,
        deliveryNoteNumber: `DN-TEST-FINAL-${Date.now().toString().slice(-4)}`,
        receivedDate: new Date().toISOString(),
        notes: 'Final delivery of remaining 2 cartons plus replacement for damaged carton',
        items: [
          {
            purchaseOrderItemId: poItemId,
            inventoryItemId: testItem.id,
            quantityReceiving: 3,
            quantityAccepted: 3, // 3 cases * 24 = 72 bottles added
            quantityRejected: 0,
            unitCost: 240,
          },
        ],
      },
      'clerk-id',
      'Receiving Clerk Alex',
    );
    console.log(`[PASS] Created GRN 2: ${grn2.grnNumber}, Total Accepted: ${grn2.totalAcceptedQuantity}`);

    const itemAfterGrn2 = await inventoryService.getItem(tenantId, propertyId, testItem.id);
    console.log(`[VERIFICATION] Stock after GRN 2: ${itemAfterGrn2.currentStock} ${itemAfterGrn2.unit}`);
    if (Number(itemAfterGrn2.currentStock) !== 120) {
      throw new Error(`Expected 120 bottles (5 cases * 24), got ${itemAfterGrn2.currentStock}`);
    }
    console.log('[PASS] Stock now stands at 120 bottles (5 cases * 24).');

    const poAfterGrn2 = await inventoryService.getPurchaseOrder(tenantId, propertyId, approvedPo.id);
    console.log(`[VERIFICATION] PO status after full receipt: ${poAfterGrn2.status}`);
    if (poAfterGrn2.status !== PurchaseOrderStatus.FULLY_RECEIVED) {
      throw new Error(`Expected FULLY_RECEIVED, got ${poAfterGrn2.status}`);
    }
    console.log('[PASS] PO transitioned correctly to FULLY_RECEIVED.');

    // 7. Test Operational Stock Issuance
    // Create an operational item
    const opItem = await inventoryService.createItem(tenantId, propertyId, {
      name: `Thermal POS Rolls 80mm-${Date.now()}`,
      sku: `ROLL-TEST-${Date.now().toString().slice(-4)}`,
      mainCategory: MainInventoryCategory.OPERATIONAL,
      subcategory: 'Stationery & Printing',
      unit: 'ROLL',
      purchaseUnit: 'BOX_50',
      conversionFactor: 50,
      currentStock: 100,
      minStockLevel: 20,
      reorderLevel: 30,
      purchaseCost: 75,
      costPerUnit: 1.5,
      itemType: ItemType.CONSUMABLE,
      assignedDepartment: 'FRONT_OFFICE',
    });
    console.log(`[PASS] Created Operational Item: ${opItem.name} with Initial Stock: 100`);

    // Issue 15 rolls to FRONT_OFFICE
    const issuance = await inventoryService.createIssuance(
      tenantId,
      propertyId,
      {
        department: 'FRONT_OFFICE',
        receivedByName: 'Front Desk Agent Sarah',
        notes: 'Replenishing front desk folio printers',
        items: [
          {
            inventoryItemId: opItem.id,
            quantity: 15,
            purpose: 'Billing receipt rolls',
          },
        ],
      },
      'storekeeper-id',
      'Storekeeper Jack',
    );
    console.log(`[PASS] Created Issuance: ${issuance.issuanceNumber} to ${issuance.department}`);

    const opItemAfterIssuance = await inventoryService.getItem(tenantId, propertyId, opItem.id);
    console.log(`[VERIFICATION] Operational stock after issuance: ${opItemAfterIssuance.currentStock}`);
    if (Number(opItemAfterIssuance.currentStock) !== 85) {
      throw new Error(`Expected 85 rolls, got ${opItemAfterIssuance.currentStock}`);
    }
    console.log('[PASS] Operational stock deducted accurately (100 - 15 = 85).');

    // 8. Test Stock Movements Ledger
    const itemMovements = await inventoryService.getStockMovements(tenantId, propertyId, opItem.id);
    console.log(`[VERIFICATION] Movements recorded for operational item: ${itemMovements.length}`);
    const issuanceMovement = itemMovements.find((m: any) => m.movementType === 'OPERATIONAL_ISSUANCE');
    if (!issuanceMovement) {
      throw new Error('Expected OPERATIONAL_ISSUANCE movement in ledger');
    }
    console.log(`[PASS] Movement ledger logged issuance: Qty Out ${issuanceMovement.quantityOut}, Previous ${issuanceMovement.previousStock}, New ${issuanceMovement.newStock}`);

    // 9. Test Reporting Endpoints
    const summaryStats = await inventoryService.getInventorySummaryStats(tenantId, propertyId);
    console.log('[PASS] Summary Stats:', {
      totalItems: summaryStats.totalItems,
      totalValuation: summaryStats.totalValuation,
      barValuation: summaryStats.barStockValue,
      kitchenValuation: summaryStats.kitchenStockValue,
      operationalValuation: summaryStats.operationalStockValue,
      lowStockCount: summaryStats.lowStockCount,
    });

    const valuationReport = await inventoryService.getValuationReport(tenantId, propertyId);
    console.log(`[PASS] Valuation report returned ${valuationReport.length} categories.`);

    const issuanceReport = await inventoryService.getDepartmentIssuanceReport(tenantId, propertyId);
    console.log(`[PASS] Department Issuance report returned ${issuanceReport.length} department aggregates.`);

    console.log('\n======================================================');
    console.log('ALL INVENTORY & PROCUREMENT E2E TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('TEST RUNNER FAILED:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runTests();
