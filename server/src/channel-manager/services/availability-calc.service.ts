import { Injectable, BadRequestException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { Room, RoomType, Reservation, ReservationStatus } from '../../entities';
import { TenantConnectionManager } from '../../database/tenant-connection-manager.service';

export interface DailyRoomAvailability {
  date: string; // YYYY-MM-DD
  roomTypeId: string;
  roomTypeName: string;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  basePrice: number;
  stopSell: boolean;
  minStay: number;
  maxStay: number;
  closedToArrival: boolean;
  closedToDeparture: boolean;
}

@Injectable()
export class AvailabilityCalculationService {
  constructor(private readonly tenantConn: TenantConnectionManager) {}

  /**
   * Calculate availability for a specific room type across a date range [startDate, endDate)
   */
  async getAvailabilityForRange(
    rawTenantId: string,
    rawPropertyId: string,
    roomTypeId: string,
    startDateStr: string,
    endDateStr: string,
    queryRunner?: QueryRunner,
  ): Promise<{ minAvailable: number; dailyBreakdown: Record<string, number> }> {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const manager = queryRunner ? queryRunner.manager : ds.manager;

    const totalRooms = await manager.getRepository(Room).count({
      where: {
        tenantId,
        propertyId,
        roomTypeId,
      },
    });

    const reservations = await manager
      .getRepository(Reservation)
      .createQueryBuilder('res')
      .where('res.tenantId = :tenantId', { tenantId })
      .andWhere('res.propertyId = :propertyId', { propertyId })
      .andWhere('res.roomTypeId = :roomTypeId', { roomTypeId })
      .andWhere('res.status IN (:...statuses)', {
        statuses: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN],
      })
      .andWhere('res.checkInDate < :endDate', { endDate: endDateStr })
      .andWhere('res.checkOutDate > :startDate', { startDate: startDateStr })
      .getMany();

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const dailyBreakdown: Record<string, number> = {};
    let minAvailable = totalRooms;

    const current = new Date(start);
    while (current < end) {
      const dateKey = current.toISOString().split('T')[0];
      const occupied = reservations.filter((r) => {
        const rIn = new Date(r.checkInDate);
        const rOut = new Date(r.checkOutDate);
        return current >= rIn && current < rOut;
      }).length;

      const available = Math.max(0, totalRooms - occupied);
      dailyBreakdown[dateKey] = available;
      if (available < minAvailable) {
        minAvailable = available;
      }

      current.setDate(current.getDate() + 1);
    }

    return { minAvailable, dailyBreakdown };
  }

  /**
   * Get 14-day or 30-day availability & restriction grid for all room types
   */
  async getAvailabilityGrid(
    rawTenantId: string,
    rawPropertyId: string,
    daysAhead = 14,
    startDateStr?: string,
  ): Promise<DailyRoomAvailability[]> {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const start = startDateStr ? new Date(startDateStr) : new Date();
    start.setHours(0, 0, 0, 0);

    const roomTypes = await ds.getRepository(RoomType).find({
      where: { tenantId, propertyId, isActive: true },
      order: { name: 'ASC' },
    });

    const result: DailyRoomAvailability[] = [];

    for (const rt of roomTypes) {
      const totalRooms = await ds.getRepository(Room).count({
        where: { tenantId, propertyId, roomTypeId: rt.id },
      });

      const end = new Date(start);
      end.setDate(end.getDate() + daysAhead);

      const { dailyBreakdown } = await this.getAvailabilityForRange(
        tenantId,
        propertyId,
        rt.id,
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0],
      );

      for (let i = 0; i < daysAhead; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dateKey = d.toISOString().split('T')[0];
        const available = dailyBreakdown[dateKey] ?? totalRooms;
        const occupied = Math.max(0, totalRooms - available);

        result.push({
          date: dateKey,
          roomTypeId: rt.id,
          roomTypeName: rt.name,
          totalRooms,
          occupiedRooms: occupied,
          availableRooms: available,
          basePrice: Number(rt.basePricePerNight) || 0,
          stopSell: available <= 0,
          minStay: 1,
          maxStay: 30,
          closedToArrival: false,
          closedToDeparture: false,
        });
      }
    }

    return result;
  }

  /**
   * Validate that required inventory is available before confirming a booking
   */
  async assertInventoryAvailable(
    rawTenantId: string,
    rawPropertyId: string,
    roomTypeId: string,
    checkInDate: string,
    checkOutDate: string,
    requiredCount = 1,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const { minAvailable } = await this.getAvailabilityForRange(
      rawTenantId,
      rawPropertyId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      queryRunner,
    );

    if (minAvailable < requiredCount) {
      throw new BadRequestException(
        `Insufficient room inventory for the selected dates. Available: ${minAvailable}, Requested: ${requiredCount}`,
      );
    }
  }
}
