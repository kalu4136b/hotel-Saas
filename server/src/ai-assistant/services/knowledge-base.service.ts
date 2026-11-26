import { Injectable, OnModuleInit } from '@nestjs/common';
import { AiKnowledgeDocument } from '../../entities/ai-knowledge-document.entity';
import { TenantConnectionManager } from '../../database/tenant-connection-manager.service';

export interface KnowledgeMatch {
  title: string;
  category: string;
  content: string;
  relevanceScore: number;
}

@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  // Built-in system knowledge base documents
  private readonly defaultDocuments: Array<{
    category: string;
    title: string;
    keywords: string;
    content: string;
  }> = [
    {
      category: 'PMS',
      title: 'PMS Room Status Lifecycle and Check-in Rules',
      keywords: 'room, status, check in, check out, clean, dirty, maintenance, occupied, folio, rules',
      content: `### Room Status Lifecycle in PMS:
1. **AVAILABLE**: Room is vacant, inspected, and ready for immediate guest check-in.
2. **RESERVED**: Room has been pre-assigned to an upcoming confirmed reservation.
3. **OCCUPIED**: Guest has checked in. Room key issued.
4. **DIRTY**: Set automatically upon guest check-out. Housekeeping team must clean the room before it can be assigned again.
5. **IN_CLEANING**: Housekeeper is actively servicing the room.
6. **CLEAN**: Room has been cleaned and made ready for supervisor inspection.
7. **INSPECTED**: Cleanliness verified by Head of Housekeeping. Can be booked or checked into.
8. **MAINTENANCE / OUT_OF_SERVICE**: Room disabled for plumbing, HVAC, or structural repairs.

**Check-in Validation Rules:**
- A room MUST be in **CLEAN** or **INSPECTED** status to permit check-in.
- If a room is marked **DIRTY** or **IN_CLEANING**, the PMS will block check-in to prevent negative guest experience.
- If an urgent check-in is required, the receptionist or manager must update the cleanliness status or request immediate priority turn from Housekeeping.`,
    },
    {
      category: 'PMS',
      title: 'Guest Check-out and Folio Settlement SOP',
      keywords: 'check out, folio, balance, settlement, cash, card, payment, receipt, bill',
      content: `### Guest Check-Out Protocol:
1. **Retrieve Folio**: Locate the reservation by Room Number or Guest Name and inspect the Guest Folio balance.
2. **Review Charges**: Verify room lodging charges, restaurant dining charges transferred to room, mini-bar consumption, laundry, and property taxes.
3. **Settle Outstanding Balance**: Outstanding balance must be equal to 0.00 before checkout can be finalized. Post payment via Credit Card, Debit Card, Cash, or Approved Corporate Account.
4. **Finalize Checkout**: Click 'Check Out'. The reservation status transitions to **CHECKED_OUT**, the Guest Folio status updates to **SETTLED**, and the assigned room is automatically marked **DIRTY**.
5. **Websocket Notification**: Housekeeping dashboard is instantly alerted via real-time websockets that the room is vacant and requires turnover.`,
    },
    {
      category: 'HOUSEKEEPING',
      title: 'Housekeeping Turnaround and Priority Cleaning SOP',
      keywords: 'housekeeping, clean, dirty, priority, turnover, linen, inspect, maid, cleaning',
      content: `### Housekeeping Operations SOP:
1. **Morning Briefing**: Inspect the PMS Arrivals dashboard to identify early check-ins (VIPs, early flights).
2. **Priority Order**:
   - Priority 1: Rooms with upcoming confirmed arrivals scheduled today.
   - Priority 2: Stay-over service requests (fresh towels, bedding change, amenity restock).
   - Priority 3: Vacant dirty checkout rooms.
3. **Status Updates**:
   - When entering a dirty room, change status to **IN_CLEANING**.
   - When finished (fresh linens, sanitized bathroom, restocked coffee/water), update to **CLEAN**.
   - Housekeeping supervisor conducts random or VIP inspections and marks the room **INSPECTED**.`,
    },
    {
      category: 'POS',
      title: 'Restaurant POS Shift Management & KOT Dispatch',
      keywords: 'pos, shift, open shift, close shift, float, table, order, kot, kitchen ticket, split bill',
      content: `### Restaurant & Dining POS Operations:
1. **Opening a Shift**:
   - Cashier enters initial opening float amount (e.g. LKR 10,000 / USD 50).
   - Select active POS outlet (e.g. Main Restaurant, Pool Bar, Rooftop Lounge).
2. **Table Management**:
   - Green tables are vacant. Blue tables have seated guests with an open order. Red tables have bills printed pending settlement.
3. **Sending KOT (Kitchen Order Ticket)**:
   - When items are added, clicking 'Send to Kitchen' dispatches digital KOTs to kitchen display stations and thermal printers.
   - Modifiers (e.g., 'No onion', 'Spicy', 'Gluten free') print clearly on the ticket.
4. **Transferring to Room Folio**:
   - If guest wishes to charge dining to room, select 'Charge to Room', enter room number, verify guest surname, and post. The charge is automatically debited to their active PMS Guest Folio.
5. **Closing Shift**:
   - End of day: tally Cash, Cards, and Room Charges. Generate Z-Report and close shift.`,
    },
    {
      category: 'INVENTORY',
      title: 'Inventory Stock Levels, Low Stock Alerts & Purchase Orders',
      keywords: 'inventory, low stock, stock level, min stock, purchase order, po, supplier, grn, goods received',
      content: `### Inventory Management & Procurement Runbook:
1. **Low Stock Triggers**:
   - When an item's current stock falls to or below \`minStockLevel\`, the system flags a **LOW_STOCK_ALERT**.
   - Common critical items: Housekeeping toiletries, bottled water, coffee pods, cooking oil, dairy, fresh vegetables.
2. **Creating Purchase Orders (PO)**:
   - Select default supplier, add items with unit cost and requested quantities.
   - PO begins in **DRAFT** status.
   - Once approved by Hotel Manager or F&B Director, status moves to **SENT**.
3. **Goods Received Note (GRN)**:
   - When the delivery truck arrives, warehouse supervisor inspects quantities and physical condition.
   - Create GRN against the PO. The system automatically increments current stock levels and recalculates weighted average unit cost.`,
    },
    {
      category: 'BAR',
      title: 'Bar & Liquor Management: Milliliter Pours, Shots & Wastage',
      keywords: 'bar, liquor, pour, shot, ml, bottle, wastage, cocktail, recipe, restock, whiskey, vodka, gin',
      content: `### Bar Operations & Liquor Inventory Protocol:
1. **Tracking by Milliliters (ML)**:
   - Liquor inventory is tracked at dual precision: Full Bottles Stock + Current Open Bottle Remaining ML.
   - Standard pour measurements:
     - Single Shot: 30ml
     - Double Shot: 60ml
     - Cocktail Pour: 45ml - 60ml per recipe specification.
2. **Pour Deductions**:
   - POS cocktail or spirit sales automatically deduct milliliters from the active open bottle.
   - When open bottle reaches 0 ml, the system opens a new bottle and decrements \`fullBottlesStock\` by 1.
3. **Wastage & Breakage**:
   - Spillage, dropped bottles, or expired mixers must be logged under 'Log Bar Wastage' with reason and volume in ml.
4. **Par Levels & Restocking**:
   - Each liquor item has a configured Par Level in bottles. If full bottles drop below par, order replenishment from main cellar storage.`,
    },
    {
      category: 'CHANNEL_MANAGER',
      title: 'Channel Manager OTA Sync, Rate Plans & Troubleshooting',
      keywords: 'channel manager, ota, sync, booking.com, agoda, expedia, airbnb, rate plan, markup, error, mapping',
      content: `### Channel Manager & OTA Synchronization Guide:
1. **Supported Channels**:
   - Booking.com (XML / B.com Content API)
   - Agoda (YCS API)
   - Expedia (EPC Partner Central)
   - Airbnb (API & 2-Way iCal)
   - TripAdvisor & Universal iCal calendars.
2. **Two-Way Synchronization**:
   - **Outbound**: Automatically updates room inventory, rates, minimum stay, and closed-to-arrival (CTA) across all OTAs whenever a reservation is made or cancelled in PMS.
   - **Inbound**: Listens to instant OTA webhook events. When a guest books on Booking.com or Agoda, the reservation is parsed and created in PMS within seconds.
3. **Common OTA Sync Errors & Resolutions**:
   - *Error: 'Authentication Expired / Invalid API Key'*: Re-enter channel credentials in Settings -> Channel Manager -> Connections.
   - *Error: 'Room Type Unmapped'*: Ensure newly added PMS room types are mapped to their corresponding OTA Room IDs.
   - *Error: 'Rate Parity Mismatch'*: Check Pricing Rules. If you have an active channel markup rule (e.g. +15% on Booking.com to cover commission), the channel rate will intentionally differ from direct rates.`,
    },
    {
      category: 'HARDWARE',
      title: 'Hardware Troubleshooting: Thermal Printers, Cash Drawers & Sync',
      keywords: 'printer, thermal, kot, print, paper jam, offline, cash drawer, hardware, troubleshoot, error',
      content: `### Hardware Diagnostics & Troubleshooting Runbook:
1. **Thermal Receipt / KOT Printer Offline or Not Printing**:
   - **Step 1: Check Paper Feed**: Ensure thermal paper roll is facing the right way (scratch test: thermal side darkens when scratched with fingernail).
   - **Step 2: Paper Jam / Cover**: Open printer cover, clear any stuck paper, ensure roll is seated flat, and close cover firmly until it clicks.
   - **Step 3: Network / USB Connection**: If Ethernet printer, check green link light on RJ-45 jack. If USB, check cable connection to POS terminal.
   - **Step 4: Self-Test Print**: Turn off printer. Hold down the 'FEED' button and turn power ON. Release FEED after 3 seconds. The printer should print its IP address and configuration.
   - **Step 5: IP Conflict**: If printer IP changed due to router reboot, update Printer IP in POS Outlet settings.
2. **Cash Drawer Not Opening Automatically**:
   - Ensure RJ-11 phone cable is securely connected from the back of the cash drawer to the receipt printer's DK (Drawer Kick) port.
   - Ensure the physical key lock is turned to vertical neutral position (not locked horizontally).
3. **Websocket / Real-Time Disconnection**:
   - If dashboard indicators turn orange ('Reconnecting'), check hotel Wi-Fi/LAN connection. The system automatically reconnects with exponential backoff.`,
    },
  ];

  constructor(private readonly tenantConn: TenantConnectionManager) {}

  async onModuleInit() {
    await this.seedKnowledgeBaseIfEmpty();
  }

  /**
   * Seeds default knowledge documents if table is empty
   */
  async seedKnowledgeBaseIfEmpty() {
    try {
      const repo = this.tenantConn.getMasterDataSource().getRepository(AiKnowledgeDocument);
      const count = await repo.count({ where: { isSystem: true } });
      if (count === 0) {
        for (const doc of this.defaultDocuments) {
          await repo.save(
            repo.create({
              category: doc.category,
              title: doc.title,
              keywords: doc.keywords,
              content: doc.content,
              language: 'EN',
              isSystem: true,
            }),
          );
        }
      }
    } catch (err: any) {
      console.warn('Could not seed AI knowledge base documents:', err?.message);
    }
  }

  /**
   * Search knowledge base for relevant SOPs, guides, or troubleshooting runbooks
   */
  async searchKnowledgeBase(
    query: string,
    categoryFilter?: string,
    tenantId?: string,
  ): Promise<KnowledgeMatch[]> {
    const qLower = query.toLowerCase();
    const queryTokens = qLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const masterDs = this.tenantConn.getMasterDataSource();
    const systemDocs = await masterDs
      .getRepository(AiKnowledgeDocument)
      .find({ where: { isSystem: true } });

    const docMap = new Map<string, AiKnowledgeDocument>();
    for (const d of systemDocs) {
      docMap.set(d.id, d);
    }

    if (tenantId) {
      try {
        const { ds, tenantId: validTenantId } =
          await this.tenantConn.getDataSourceForTenant(tenantId);
        const tenantDocs = await ds.getRepository(AiKnowledgeDocument).find({
          where: { tenantId: validTenantId },
        });
        for (const d of tenantDocs) {
          docMap.set(d.id, d);
        }
      } catch {
        // Ignore if tenant lacks custom knowledge docs
      }
    }

    const docs = Array.from(docMap.values());

    const matches: KnowledgeMatch[] = [];

    for (const doc of docs) {
      if (categoryFilter && doc.category.toUpperCase() !== categoryFilter.toUpperCase()) {
        continue;
      }

      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const keywordsLower = (doc.keywords || '').toLowerCase();
      const contentLower = doc.content.toLowerCase();

      // Check full phrase match
      if (titleLower.includes(qLower)) score += 30;
      if (keywordsLower.includes(qLower)) score += 20;

      // Check individual tokens
      for (const token of queryTokens) {
        if (titleLower.includes(token)) score += 10;
        if (keywordsLower.includes(token)) score += 6;
        if (contentLower.includes(token)) score += 2;
      }

      if (score >= 6) {
        matches.push({
          title: doc.title,
          category: doc.category,
          content: doc.content,
          relevanceScore: score,
        });
      }
    }

    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3);
  }
}
