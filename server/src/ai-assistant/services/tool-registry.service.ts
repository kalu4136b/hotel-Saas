import { Injectable } from '@nestjs/common';

export interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  category: 'PMS' | 'HOUSEKEEPING' | 'INVENTORY' | 'BAR' | 'POS' | 'CHANNEL_MANAGER' | 'REPORTS' | 'DIAGNOSTICS';
  description: string;
  isWrite: boolean; // If true, requires explicit 2-step confirmation card
  requiredRoles?: string[];
  parameters: Record<string, ToolParameter>;
}

@Injectable()
export class ToolRegistryService {
  private readonly tools: Record<string, ToolDefinition> = {
    // ----------------- PMS / HOUSEKEEPING -----------------
    get_available_rooms: {
      name: 'get_available_rooms',
      category: 'PMS',
      description: 'List available rooms with optional filter by room type or cleanliness status',
      isWrite: false,
      parameters: {
        roomTypeId: { type: 'string', description: 'Filter by room type ID (optional)' },
        cleanlinessStatus: {
          type: 'string',
          description: 'Filter by cleanliness status (CLEAN, INSPECTED, DIRTY, IN_CLEANING)',
          enum: ['CLEAN', 'INSPECTED', 'DIRTY', 'IN_CLEANING'],
        },
      },
    },

    get_room_status: {
      name: 'get_room_status',
      category: 'PMS',
      description: 'Get current status, cleanliness, and active guest for a specific room number',
      isWrite: false,
      parameters: {
        roomNumber: { type: 'string', description: 'Room number (e.g., "101", "204")', required: true },
      },
    },

    get_today_arrivals: {
      name: 'get_today_arrivals',
      category: 'PMS',
      description: 'Get list of guest reservations arriving today or on a specific date',
      isWrite: false,
      parameters: {
        date: { type: 'string', description: 'YYYY-MM-DD date (defaults to today)' },
      },
    },

    get_today_departures: {
      name: 'get_today_departures',
      category: 'PMS',
      description: 'Get list of guest reservations departing today with folio balance check',
      isWrite: false,
      parameters: {
        date: { type: 'string', description: 'YYYY-MM-DD date (defaults to today)' },
      },
    },

    get_guest_reservation: {
      name: 'get_guest_reservation',
      category: 'PMS',
      description: 'Search reservations by guest name or booking confirmation code',
      isWrite: false,
      parameters: {
        search: { type: 'string', description: 'Guest full name or reservation number (e.g. "BK-9041")', required: true },
      },
    },

    get_guest_folio: {
      name: 'get_guest_folio',
      category: 'PMS',
      description: 'Retrieve folio charges, payments, and balance due for a reservation or room',
      isWrite: false,
      parameters: {
        reservationId: { type: 'string', description: 'Reservation ID (optional if roomNumber provided)' },
        roomNumber: { type: 'string', description: 'Room number (optional if reservationId provided)' },
      },
    },

    update_room_cleanliness: {
      name: 'update_room_cleanliness',
      category: 'HOUSEKEEPING',
      description: 'Update the cleanliness status of a room (CLEAN, DIRTY, IN_CLEANING, INSPECTED)',
      isWrite: true,
      parameters: {
        roomNumber: { type: 'string', description: 'Room number', required: true },
        status: {
          type: 'string',
          description: 'New cleanliness status',
          enum: ['CLEAN', 'DIRTY', 'IN_CLEANING', 'INSPECTED'],
          required: true,
        },
      },
    },

    update_room_occupancy: {
      name: 'update_room_occupancy',
      category: 'PMS',
      description: 'Update room occupancy status (AVAILABLE, MAINTENANCE, OUT_OF_SERVICE)',
      isWrite: true,
      parameters: {
        roomNumber: { type: 'string', description: 'Room number', required: true },
        status: {
          type: 'string',
          description: 'New occupancy status',
          enum: ['AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE'],
          required: true,
        },
      },
    },

    create_reservation: {
      name: 'create_reservation',
      category: 'PMS',
      description: 'Create a new room booking reservation with guest details',
      isWrite: true,
      parameters: {
        guestName: { type: 'string', description: 'Full name of primary guest', required: true },
        checkInDate: { type: 'string', description: 'Check-in date (YYYY-MM-DD)', required: true },
        checkOutDate: { type: 'string', description: 'Check-out date (YYYY-MM-DD)', required: true },
        roomTypeId: { type: 'string', description: 'Room Type ID or Room Type Name (e.g. Deluxe, Suite)' },
        roomNumber: { type: 'string', description: 'Optional pre-assigned room number' },
        guestPhone: { type: 'string', description: 'Guest contact phone' },
        guestEmail: { type: 'string', description: 'Guest email address' },
        adultsCount: { type: 'number', description: 'Number of adults (default 1)' },
      },
    },

    check_in_guest: {
      name: 'check_in_guest',
      category: 'PMS',
      description: 'Check in a guest into their assigned room',
      isWrite: true,
      parameters: {
        reservationNumber: { type: 'string', description: 'Reservation code (e.g. "BK-9041")', required: true },
        roomNumber: { type: 'string', description: 'Room number to assign if not already assigned' },
      },
    },

    check_out_guest: {
      name: 'check_out_guest',
      category: 'PMS',
      description: 'Check out a guest, settle folio, and mark room as dirty',
      isWrite: true,
      parameters: {
        roomNumber: { type: 'string', description: 'Room number or reservation number', required: true },
      },
    },

    post_folio_charge: {
      name: 'post_folio_charge',
      category: 'PMS',
      description: 'Post an additional charge (room service, laundry, minibar) to guest folio',
      isWrite: true,
      parameters: {
        roomNumber: { type: 'string', description: 'Room number', required: true },
        chargeType: {
          type: 'string',
          description: 'Charge category',
          enum: ['ROOM_SERVICE', 'RESTAURANT', 'BAR', 'LAUNDRY', 'SPA', 'MINIBAR', 'OTHER'],
          required: true,
        },
        description: { type: 'string', description: 'Charge item description', required: true },
        amount: { type: 'number', description: 'Charge amount', required: true },
      },
    },

    post_folio_payment: {
      name: 'post_folio_payment',
      category: 'PMS',
      description: 'Post a payment to settle an open guest folio',
      isWrite: true,
      parameters: {
        roomNumber: { type: 'string', description: 'Room number', required: true },
        amount: { type: 'number', description: 'Payment amount', required: true },
        paymentMethod: {
          type: 'string',
          description: 'Payment method',
          enum: ['CASH', 'CARD', 'ONLINE', 'BANK_TRANSFER'],
          required: true,
        },
      },
    },

    // ----------------- INVENTORY -----------------
    get_low_stock_inventory: {
      name: 'get_low_stock_inventory',
      category: 'INVENTORY',
      description: 'List all inventory items currently below minimum stock level',
      isWrite: false,
      parameters: {
        category: { type: 'string', description: 'Category filter (BAR, KITCHEN, OPERATIONAL)' },
      },
    },

    get_inventory_items: {
      name: 'get_inventory_items',
      category: 'INVENTORY',
      description: 'Search inventory items by name, SKU, or category',
      isWrite: false,
      parameters: {
        search: { type: 'string', description: 'Search term or item name' },
        category: { type: 'string', description: 'Category (BAR, KITCHEN, OPERATIONAL)' },
      },
    },

    create_purchase_order: {
      name: 'create_purchase_order',
      category: 'INVENTORY',
      description: 'Create a draft purchase order for inventory replenishment',
      isWrite: true,
      parameters: {
        supplierId: { type: 'string', description: 'Supplier ID or Supplier Name', required: true },
        items: {
          type: 'array',
          description: 'Array of items with { inventoryItemId, quantity, unitCost }',
          required: true,
        },
        notes: { type: 'string', description: 'Order notes or delivery instructions' },
      },
    },

    // ----------------- BAR -----------------
    get_bar_stock_levels: {
      name: 'get_bar_stock_levels',
      category: 'BAR',
      description: 'Get liquor stock levels including full bottles, open bottle remaining ml, and low stock warnings',
      isWrite: false,
      parameters: {
        search: { type: 'string', description: 'Liquor brand or name (e.g. Whiskey, Vodka, Gin)' },
        lowStockOnly: { type: 'boolean', description: 'Filter only items below par level' },
      },
    },

    log_bar_wastage: {
      name: 'log_bar_wastage',
      category: 'BAR',
      description: 'Record bar liquor wastage, spillage, or broken bottles',
      isWrite: true,
      parameters: {
        barItemId: { type: 'string', description: 'Bar Item ID or Name', required: true },
        millilitersWasted: { type: 'number', description: 'Volume in milliliters wasted', required: true },
        reason: { type: 'string', description: 'Reason for wastage (Spillage, Broken bottle, Quality expiry)', required: true },
        bartenderName: { type: 'string', description: 'Name of bartender reporting' },
      },
    },

    // ----------------- POS / RESTAURANT -----------------
    get_daily_sales_summary: {
      name: 'get_daily_sales_summary',
      category: 'REPORTS',
      description: 'Get daily sales, orders count, gross sales, discounts, and net revenue',
      isWrite: false,
      parameters: {
        startDate: { type: 'string', description: 'YYYY-MM-DD (defaults to today)' },
        endDate: { type: 'string', description: 'YYYY-MM-DD' },
      },
    },

    get_pos_tables_status: {
      name: 'get_pos_tables_status',
      category: 'POS',
      description: 'Get current dining table occupancy status (VACANT, OCCUPIED, RESERVED, BILLED)',
      isWrite: false,
      parameters: {
        outletId: { type: 'string', description: 'Filter by POS Outlet ID (optional)' },
      },
    },

    // ----------------- CHANNEL MANAGER -----------------
    get_channel_sync_status: {
      name: 'get_channel_sync_status',
      category: 'CHANNEL_MANAGER',
      description: 'Get overview of OTA connections (Booking.com, Agoda, Expedia, Airbnb), sync health, and pending jobs',
      isWrite: false,
      parameters: {},
    },

    trigger_channel_sync: {
      name: 'trigger_channel_sync',
      category: 'CHANNEL_MANAGER',
      description: 'Trigger full two-way synchronization of rates and inventory across OTA channels',
      isWrite: true,
      parameters: {
        channelCode: {
          type: 'string',
          description: 'Specific channel code (BOOKING_COM, EXPEDIA, AGODA, AIRBNB) or ALL',
          enum: ['ALL', 'BOOKING_COM', 'EXPEDIA', 'AGODA', 'AIRBNB', 'TRIPADVISOR'],
        },
      },
    },

    // ----------------- HARDWARE DIAGNOSTICS -----------------
    diagnose_hardware_issue: {
      name: 'diagnose_hardware_issue',
      category: 'DIAGNOSTICS',
      description: 'Troubleshoot hardware problems: thermal KOT printers, cash drawers, network connectivity',
      isWrite: false,
      parameters: {
        hardwareType: {
          type: 'string',
          description: 'Type of hardware experiencing issue',
          enum: ['PRINTER', 'CASH_DRAWER', 'NETWORK', 'WEBSOCKET'],
          required: true,
        },
        symptom: { type: 'string', description: 'Observed problem or error message', required: true },
      },
    },
  };

  /**
   * Return all registered tools
   */
  getAllTools(): ToolDefinition[] {
    return Object.values(this.tools);
  }

  /**
   * Get specific tool by name
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools[name];
  }

  /**
   * Return tools formatted for LLM function calling schema
   */
  getToolSchemasForLLM(): any[] {
    return Object.values(this.tools).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters,
        required: Object.entries(tool.parameters)
          .filter(([_, param]) => param.required)
          .map(([key]) => key),
      },
    }));
  }
}
