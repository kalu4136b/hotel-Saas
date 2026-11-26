import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PmsService } from '../../pms/pms.service';
import { InventoryService } from '../../inventory/inventory.service';
import { BarService } from '../../bar/bar.service';
import { PosService } from '../../pos/pos.service';
import { ChannelManagerService } from '../../channel-manager/channel-manager.service';
import { ReportsService } from '../../reports/reports.service';
import {
  Room,
  Reservation,
  RoomStatus,
  CleanlinessStatus,
  AiToolAuditLog,
  Supplier,
  UserRole,
} from '../../entities';
import { TenantConnectionManager } from '../../database/tenant-connection-manager.service';

export interface ToolExecutionUser {
  id: string;
  tenantId: string;
  propertyId: string;
  role: UserRole | string;
  permissions?: string[] | null;
  tenantModules?: string[] | string | null;
}

export interface ToolExecutionResult {
  toolName: string;
  isWrite: boolean;
  success: boolean;
  data: any;
  summary: string;
  error?: string;
}

@Injectable()
export class ToolExecutorService {
  constructor(
    private readonly tenantConn: TenantConnectionManager,
    private readonly pmsService: PmsService,
    private readonly inventoryService: InventoryService,
    private readonly barService: BarService,
    private readonly posService: PosService,
    private readonly channelManagerService: ChannelManagerService,
    private readonly reportsService: ReportsService,
  ) {}

  /**
   * Executes a tool with tenant isolation and logs the audit trail
   */
  async executeTool(
    toolName: string,
    params: any,
    user: ToolExecutionUser,
    isConfirmed: boolean = false,
  ): Promise<ToolExecutionResult> {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      user.tenantId,
      user.propertyId,
    );
    const startTime = Date.now();
    let resultData: any = null;
    let summary = '';
    let success = true;
    let errorMsg: string | undefined = undefined;

    try {
      switch (toolName) {
        // ================= PMS / HOUSEKEEPING =================
        case 'get_available_rooms': {
          const rooms = await this.pmsService.getRooms(tenantId, propertyId);
          let filtered = rooms.filter((r) => r.status === RoomStatus.AVAILABLE);
          if (params.cleanlinessStatus) {
            filtered = filtered.filter(
              (r) => r.cleanlinessStatus === params.cleanlinessStatus,
            );
          }
          if (params.roomTypeId) {
            filtered = filtered.filter((r) => r.roomTypeId === params.roomTypeId);
          }

          resultData = filtered.map((r) => ({
            id: r.id,
            roomNumber: r.roomNumber,
            floor: r.floor,
            roomType: r.roomType?.name || 'Standard',
            cleanlinessStatus: r.cleanlinessStatus,
            status: r.status,
          }));

          summary = `Found ${resultData.length} available room(s) for property.`;
          break;
        }

        case 'get_room_status': {
          const roomRepo = ds.getRepository(Room);
          const room = await roomRepo.findOne({
            where: {
              roomNumber: String(params.roomNumber).trim(),
              tenantId,
              propertyId,
            },
            relations: { roomType: true },
          });

          if (!room) {
            throw new NotFoundException(`Room #${params.roomNumber} not found.`);
          }

          const resRepo = ds.getRepository(Reservation);
          const activeRes = await resRepo.findOne({
            where: {
              roomId: room.id,
              tenantId,
              propertyId,
              status: 'CHECKED_IN' as any,
            },
            relations: { guest: true },
          });

          resultData = {
            roomNumber: room.roomNumber,
            floor: room.floor,
            roomType: room.roomType?.name,
            status: room.status,
            cleanlinessStatus: room.cleanlinessStatus,
            notes: room.notes,
            activeGuest: activeRes?.guest?.fullName || null,
            reservationNumber: activeRes?.reservationNumber || null,
          };

          summary = `Room ${room.roomNumber} is currently ${room.status} (${room.cleanlinessStatus}).${
            activeRes ? ` Checked-in to ${activeRes.guest?.fullName}.` : ''
          }`;
          break;
        }

        case 'get_today_arrivals': {
          const targetDate = params.date || new Date().toISOString().slice(0, 10);
          const reservations = await ds.getRepository(Reservation).find({
            where: {
              tenantId,
              propertyId,
              checkInDate: targetDate,
            },
            relations: { guest: true, roomType: true, room: true },
            order: { createdAt: 'ASC' },
          });

          resultData = reservations.map((r) => ({
            reservationNumber: r.reservationNumber,
            guestName: r.guest?.fullName || 'Unknown',
            roomType: r.roomType?.name || 'Standard',
            assignedRoom: r.room?.roomNumber || 'Unassigned',
            status: r.status,
            depositPaid: r.depositPaid,
            nightsCount: r.nightsCount,
          }));

          summary = `There are ${reservations.length} arrival(s) scheduled for ${targetDate}.`;
          break;
        }

        case 'get_today_departures': {
          const targetDate = params.date || new Date().toISOString().slice(0, 10);
          const reservations = await ds.getRepository(Reservation).find({
            where: {
              tenantId,
              propertyId,
              checkOutDate: targetDate,
            },
            relations: { guest: true, room: true },
            order: { createdAt: 'ASC' },
          });

          resultData = reservations.map((r) => ({
            reservationNumber: r.reservationNumber,
            guestName: r.guest?.fullName || 'Unknown',
            roomNumber: r.room?.roomNumber || 'Unknown',
            status: r.status,
          }));

          summary = `There are ${reservations.length} departure(s) scheduled for ${targetDate}.`;
          break;
        }

        case 'get_guest_reservation': {
          const q = String(params.search).trim();
          const reservations = await ds
            .getRepository(Reservation)
            .createQueryBuilder('res')
            .leftJoinAndSelect('res.guest', 'guest')
            .leftJoinAndSelect('res.roomType', 'roomType')
            .leftJoinAndSelect('res.room', 'room')
            .where('res.tenantId = :tenantId', { tenantId })
            .andWhere('res.propertyId = :propertyId', { propertyId })
            .andWhere(
              '(res.reservationNumber LIKE :q OR guest.fullName LIKE :q OR guest.phone LIKE :q)',
              { q: `%${q}%` },
            )
            .orderBy('res.createdAt', 'DESC')
            .take(5)
            .getMany();

          resultData = reservations.map((r) => ({
            reservationNumber: r.reservationNumber,
            guestName: r.guest?.fullName,
            guestPhone: r.guest?.phone,
            roomType: r.roomType?.name,
            roomNumber: r.room?.roomNumber || 'Unassigned',
            checkInDate: r.checkInDate,
            checkOutDate: r.checkOutDate,
            nightsCount: r.nightsCount,
            totalAmount: r.totalAmount,
            status: r.status,
          }));

          summary = `Found ${reservations.length} reservation(s) matching "${q}".`;
          break;
        }

        case 'get_guest_folio': {
          let resId = params.reservationId;
          if (!resId && params.roomNumber) {
            const room = await ds.getRepository(Room).findOne({
              where: {
                roomNumber: String(params.roomNumber).trim(),
                tenantId,
                propertyId,
              },
            });
            if (room) {
              const res = await ds.getRepository(Reservation).findOne({
                where: {
                  roomId: room.id,
                  tenantId,
                  propertyId,
                  status: 'CHECKED_IN' as any,
                },
              });
              if (res) resId = res.id;
            }
          }

          if (!resId) {
            throw new BadRequestException('Reservation ID or active Room Number is required.');
          }

          const folio = await this.pmsService.getFolio(tenantId, propertyId, resId);
          resultData = {
            id: folio.id,
            reservationNumber: folio.reservation?.reservationNumber,
            guestName: folio.guest?.fullName,
            roomNumber: folio.room?.roomNumber,
            totalCharges: folio.totalCharges,
            totalPayments: folio.totalPayments,
            balanceDue: folio.balanceDue,
            status: folio.status,
            items: folio.items,
            payments: folio.payments,
          };

          summary = `Folio for ${folio.guest?.fullName || 'Guest'} (Room ${folio.room?.roomNumber || 'N/A'}): Balance Due = LKR ${folio.balanceDue} (Status: ${folio.status}).`;
          break;
        }

        case 'update_room_cleanliness': {
          const room = await ds.getRepository(Room).findOne({
            where: {
              roomNumber: String(params.roomNumber).trim(),
              tenantId,
              propertyId,
            },
          });
          if (!room) throw new NotFoundException(`Room #${params.roomNumber} not found.`);

          const updated = await this.pmsService.updateCleanliness(
            tenantId,
            propertyId,
            room.id,
            params.status as CleanlinessStatus,
          );

          resultData = {
            roomNumber: updated.roomNumber,
            cleanlinessStatus: updated.cleanlinessStatus,
          };
          summary = `Successfully updated Room ${updated.roomNumber} cleanliness status to ${updated.cleanlinessStatus}.`;
          break;
        }

        case 'update_room_occupancy': {
          const room = await ds.getRepository(Room).findOne({
            where: {
              roomNumber: String(params.roomNumber).trim(),
              tenantId,
              propertyId,
            },
          });
          if (!room) throw new NotFoundException(`Room #${params.roomNumber} not found.`);

          const updated = await this.pmsService.updateOccupancyStatus(
            tenantId,
            propertyId,
            room.id,
            params.status as RoomStatus,
          );

          resultData = { roomNumber: updated.roomNumber, status: updated.status };
          summary = `Successfully updated Room ${updated.roomNumber} occupancy status to ${updated.status}.`;
          break;
        }

        case 'create_reservation': {
          let roomTypeId = params.roomTypeId;
          if (!roomTypeId || roomTypeId.length < 10) {
            const roomTypes = await this.pmsService.getRoomTypes(tenantId, propertyId);
            if (roomTypes.length > 0) {
              const matched = roomTypes.find((rt) =>
                rt.name.toLowerCase().includes(String(params.roomTypeId || '').toLowerCase()),
              );
              roomTypeId = matched ? matched.id : roomTypes[0].id;
            }
          }

          let roomId: string | undefined = undefined;
          if (params.roomNumber) {
            const rm = await ds.getRepository(Room).findOne({
              where: {
                roomNumber: String(params.roomNumber).trim(),
                tenantId,
                propertyId,
              },
            });
            if (rm) roomId = rm.id;
          }

          const res = await this.pmsService.createReservation(
            tenantId,
            propertyId,
            {
              guestName: params.guestName,
              guestEmail: params.guestEmail,
              guestPhone: params.guestPhone,
              checkInDate: params.checkInDate,
              checkOutDate: params.checkOutDate,
              roomTypeId,
              roomId,
              adultsCount: params.adultsCount || 1,
            },
            user.id,
          );

          resultData = {
            id: res.id,
            reservationNumber: res.reservationNumber,
            totalAmount: res.totalAmount,
            nightsCount: res.nightsCount,
            status: res.status,
          };
          summary = `Reservation ${res.reservationNumber} created for ${params.guestName} (${res.nightsCount} nights, Total: LKR ${res.totalAmount}).`;
          break;
        }

        case 'check_in_guest': {
          const res = await ds.getRepository(Reservation).findOne({
            where: {
              reservationNumber: String(params.reservationNumber).trim(),
              tenantId,
              propertyId,
            },
            relations: { room: true },
          });

          if (!res) {
            throw new NotFoundException(`Reservation ${params.reservationNumber} not found.`);
          }

          let targetRoomId = res.roomId;
          if (params.roomNumber) {
            const rm = await ds.getRepository(Room).findOne({
              where: {
                roomNumber: String(params.roomNumber).trim(),
                tenantId,
                propertyId,
              },
            });
            if (rm) targetRoomId = rm.id;
          }

          if (!targetRoomId) {
            throw new BadRequestException('Room must be specified to complete check-in.');
          }

          const checkInResult = await this.pmsService.checkIn(
            tenantId,
            propertyId,
            res.id,
            targetRoomId,
            user.id,
          );

          resultData = {
            reservationNumber: checkInResult.reservation.reservationNumber,
            status: checkInResult.reservation.status,
          };
          summary = `Guest successfully checked in for reservation ${res.reservationNumber}.`;
          break;
        }

        case 'check_out_guest': {
          const room = await ds.getRepository(Room).findOne({
            where: {
              roomNumber: String(params.roomNumber).trim(),
              tenantId,
              propertyId,
            },
          });

          let res = null;
          if (room) {
            res = await ds.getRepository(Reservation).findOne({
              where: {
                roomId: room.id,
                tenantId,
                propertyId,
                status: 'CHECKED_IN' as any,
              },
            });
          }

          if (!res) {
            res = await ds.getRepository(Reservation).findOne({
              where: {
                reservationNumber: String(params.roomNumber).trim(),
                tenantId,
                propertyId,
              },
            });
          }

          if (!res) {
            throw new NotFoundException(
              `No active checked-in reservation found for ${params.roomNumber}.`,
            );
          }

          const checkoutResult = await this.pmsService.checkOut(
            tenantId,
            propertyId,
            res.id,
            user.id,
          );

          resultData = checkoutResult;
          summary = `Reservation ${res.reservationNumber} successfully checked out. Room marked DIRTY for housekeeping turnover.`;
          break;
        }

        case 'post_folio_charge': {
          const room = await ds.getRepository(Room).findOne({
            where: {
              roomNumber: String(params.roomNumber).trim(),
              tenantId,
              propertyId,
            },
          });
          if (!room) throw new NotFoundException(`Room #${params.roomNumber} not found.`);

          const res = await ds.getRepository(Reservation).findOne({
            where: {
              roomId: room.id,
              tenantId,
              propertyId,
              status: 'CHECKED_IN' as any,
            },
          });
          if (!res) {
            throw new NotFoundException(
              `No active checked-in reservation for Room #${params.roomNumber}.`,
            );
          }

          const updatedFolio = await this.pmsService.postFolioCharge(
            tenantId,
            propertyId,
            res.id,
            {
              chargeType: params.chargeType,
              description: params.description,
              amount: Number(params.amount),
            },
          );

          resultData = { balanceDue: updatedFolio.balanceDue };
          summary = `Posted ${params.description} (LKR ${params.amount}) to Room ${params.roomNumber} folio. New Balance Due: LKR ${updatedFolio.balanceDue}.`;
          break;
        }

        case 'post_folio_payment': {
          const room = await ds.getRepository(Room).findOne({
            where: {
              roomNumber: String(params.roomNumber).trim(),
              tenantId,
              propertyId,
            },
          });
          if (!room) throw new NotFoundException(`Room #${params.roomNumber} not found.`);

          const res = await ds.getRepository(Reservation).findOne({
            where: {
              roomId: room.id,
              tenantId,
              propertyId,
              status: 'CHECKED_IN' as any,
            },
          });
          if (!res) {
            throw new NotFoundException(`No active reservation for Room #${params.roomNumber}.`);
          }

          const updatedFolio = await this.pmsService.postFolioPayment(
            tenantId,
            propertyId,
            res.id,
            {
              amount: Number(params.amount),
              paymentMethod: params.paymentMethod,
            },
          );

          resultData = { balanceDue: updatedFolio.balanceDue, status: updatedFolio.status };
          summary = `Payment of LKR ${params.amount} recorded for Room ${params.roomNumber}. Outstanding balance: LKR ${updatedFolio.balanceDue}.`;
          break;
        }

        // ================= INVENTORY =================
        case 'get_low_stock_inventory': {
          const items = await this.inventoryService.getItems(
            tenantId,
            propertyId,
            params.category,
            undefined,
            true,
          );

          resultData = items.map((i) => ({
            id: i.id,
            name: i.name,
            sku: i.sku,
            currentStock: i.currentStock,
            minStockLevel: i.minStockLevel,
            unit: i.unit,
            mainCategory: i.mainCategory,
            supplier: i.defaultSupplier?.name || 'N/A',
          }));

          summary = `Found ${items.length} low stock inventory item(s) below threshold.`;
          break;
        }

        case 'get_inventory_items': {
          const items = await this.inventoryService.getItems(
            tenantId,
            propertyId,
            params.category,
            params.search,
            false,
          );

          resultData = items.slice(0, 15).map((i) => ({
            id: i.id,
            name: i.name,
            sku: i.sku,
            currentStock: i.currentStock,
            minStockLevel: i.minStockLevel,
            unit: i.unit,
            unitCost: Number(i.costPerUnit || 0),
          }));

          summary = `Retrieved ${resultData.length} inventory item(s).`;
          break;
        }

        case 'create_purchase_order': {
          let supplierId = params.supplierId;
          const suppRepo = ds.getRepository(Supplier);
          const supplier = supplierId
            ? await suppRepo.findOne({
                where: { id: supplierId, tenantId, propertyId },
              })
            : null;

          if (!supplier) {
            const firstSupp = await suppRepo.findOne({
              where: { tenantId, propertyId },
            });
            if (firstSupp) supplierId = firstSupp.id;
            else throw new NotFoundException('No valid supplier found to create purchase order.');
          }

          const poItems = (params.items || []).map((it: any) => ({
            inventoryItemId: it.inventoryItemId || it.itemId || it.id,
            quantityOrdered: Number(it.quantityOrdered || it.quantity || 1),
            unitCost: Number(it.unitCost || 100),
          }));

          const po = await this.inventoryService.createPurchaseOrder(
            tenantId,
            propertyId,
            {
              supplierId,
              expectedDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
              notes: params.notes || 'Created via AI Assistant',
              items: poItems,
            },
            user.id,
          );

          resultData = { poNumber: po.poNumber, totalAmount: po.totalAmount, status: po.status };
          summary = `Draft Purchase Order ${po.poNumber} created for supplier. Total: LKR ${po.totalAmount}.`;
          break;
        }

        // ================= BAR =================
        case 'get_bar_stock_levels': {
          const items = await this.barService.getItems(tenantId, propertyId, {
            search: params.search,
            lowStock: params.lowStockOnly,
          });

          resultData = items.slice(0, 12).map((b) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            brand: b.brand,
            fullBottlesStock: b.fullBottlesStock,
            currentBottleRemainingMl: b.currentBottleRemainingMl,
            totalRemainingMl: b.totalRemainingMl,
            totalLiters: b.totalLiters,
            isLowStock: b.isLowStock,
          }));

          summary = `Retrieved ${resultData.length} bar liquor item(s).`;
          break;
        }

        case 'log_bar_wastage': {
          const wastage = await this.barService.logWastage(tenantId, propertyId, {
            barItemId: params.barItemId,
            millilitersWasted: Number(params.millilitersWasted),
            reason: params.reason,
            bartenderName: params.bartenderName || 'AI Assistant',
          });

          resultData = wastage;
          summary = `Logged ${params.millilitersWasted}ml bar wastage. Reason: ${params.reason}.`;
          break;
        }

        // ================= REPORTS & POS =================
        case 'get_daily_sales_summary': {
          const report = await this.reportsService.getDailySalesReport(
            tenantId,
            propertyId,
            params.startDate,
            params.endDate,
          );

          resultData = report;
          const today = report[0] || { netRevenue: 0, totalOrders: 0 };
          summary = `Daily Sales: ${today.totalOrders} order(s), Gross Sales: LKR ${today.grossSales}, Net Revenue: LKR ${today.netRevenue}.`;
          break;
        }

        case 'get_pos_tables_status': {
          const tables = await this.posService.getTables(tenantId, propertyId);
          resultData = tables.map((t) => ({
            tableNumber: t.tableNumber,
            capacity: t.capacity,
            status: t.status,
            outlet: t.outletId ? `Outlet ${t.outletId.slice(0, 4)}` : 'Main Outlet',
          }));

          const occupied = tables.filter((t) => t.status === 'OCCUPIED').length;
          summary = `Table Status: ${occupied}/${tables.length} tables currently occupied.`;
          break;
        }

        // ================= CHANNEL MANAGER =================
        case 'get_channel_sync_status': {
          const overview = await this.channelManagerService.getDashboardOverview(
            tenantId,
            propertyId,
          );

          resultData = overview;
          summary = `Channel Manager: ${overview.summary.connectedChannels}/${overview.summary.totalChannels} channels connected. ${overview.summary.channelsRequiringAttention} require attention. Pending sync jobs: ${overview.summary.pendingSyncJobs}.`;
          break;
        }

        case 'trigger_channel_sync': {
          const channelsToSync =
            params.channelCode && params.channelCode !== 'ALL'
              ? [params.channelCode]
              : ['BOOKING_COM', 'EXPEDIA', 'AGODA', 'AIRBNB'];

          const jobs: any[] = [];
          for (const ch of channelsToSync) {
            try {
              const job = await this.channelManagerService.triggerSync(
                tenantId,
                propertyId,
                ch as any,
              );
              jobs.push(job);
            } catch {
              // Continue with remaining channels
            }
          }

          resultData = { jobsTriggered: jobs.length };
          summary = `Triggered full synchronization across ${jobs.length} channel(s). Inventory and rates are being pushed to OTAs.`;
          break;
        }

        // ================= HARDWARE DIAGNOSTICS =================
        case 'diagnose_hardware_issue': {
          const type = (params.hardwareType || 'PRINTER').toUpperCase();
          const symptom = params.symptom || '';

          let diagnosticSteps: string[] = [];
          if (type === 'PRINTER') {
            diagnosticSteps = [
              'Check thermal paper roll orientation (thermal side must face the print head).',
              'Open printer lid, check for paper dust or mechanical jam, and close securely until latch clicks.',
              'Verify Ethernet or USB cable connection. Ensure printer IP address matches POS Outlet settings.',
              'Perform hardware self-test: Power OFF -> Hold FEED -> Power ON -> Release after 3 seconds.',
            ];
          } else if (type === 'CASH_DRAWER') {
            diagnosticSteps = [
              'Verify RJ-11 kick cable is connected to printer DK port (not telephone jack).',
              'Check cylinder key lock position (must be in 12 o\'clock vertical position).',
              'Ensure bill tray is not physically jammed by folded banknotes.',
            ];
          } else {
            diagnosticSteps = [
              'Check LAN router and PoE switch link lights.',
              'Verify property internet connection speed and DNS resolution.',
              'Restart the local hotel network switch if packets are dropping.',
            ];
          }

          resultData = { hardwareType: type, symptom, recommendations: diagnosticSteps };
          summary = `Hardware Diagnostic for ${type}: 4 troubleshooting steps identified.`;
          break;
        }

        default:
          throw new BadRequestException(`Unrecognized operational tool: ${toolName}`);
      }
    } catch (err: any) {
      success = false;
      errorMsg = err?.message || 'Operation failed';
      summary = `Failed to execute ${toolName}: ${errorMsg}`;
    }

    const executionTimeMs = Date.now() - startTime;

    try {
      await ds.getRepository(AiToolAuditLog).save({
        tenantId,
        propertyId,
        userId: user.id,
        toolName,
        parameters: params,
        isWrite: false,
        confirmed: isConfirmed,
        status: success ? 'SUCCESS' : 'FAILED',
        resultSummary: summary,
        errorMessage: errorMsg,
        executionTimeMs,
      });
    } catch (auditErr: any) {
      console.warn('Could not record AI tool audit log:', auditErr?.message);
    }

    return {
      toolName,
      isWrite: false,
      success,
      data: resultData,
      summary,
      error: errorMsg,
    };
  }
}
