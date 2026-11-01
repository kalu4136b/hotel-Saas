import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, In, QueryRunner } from 'typeorm';
import { Room, RoomType, Reservation, ReservationStatus, RoomStatus } from '../../entities';

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
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Calculate availability for a specific room type across a date range [startDate, endDate)
   */
  async getAvailabilityForRange(
    tenantId: string,
    propertyId: string,
    roomTypeId: string,
    startDateStr: string,
    endDateStr: string,
    queryRunner?: QueryRunner,
  ): Promise<{ minAvailable: number; dailyBreakdown: Record<string, number> }> {
    const manager = queryRunner ? queryRunner.manager : this.dataSource.manager;

    // 1. Total active rooms for this room type
    const totalRooms = await manager.getRepository(Room).count({
      where: {
        tenantId,
        propertyId,
        roomTypeId,
      },
    });

    // 2. Fetch all reservations overlapping the range
    // Overlap condition: res.checkInDate < endDateStr AND res.checkOutDate > startDateStr
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

    // 3. Generate daily counts
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const dailyBreakdown: Record<string, number> = {};
    let minAvailable = totalRooms;

    const current = new Date(start);
    while (current < end) {
      const dateKey = current.toISOString().split('T')[0];
      // Count reservations staying on this night
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
    tenantId: string,
    propertyId: string,
    daysAhead = 14,
    startDateStr?: string,
  ): Promise<DailyRoomAvailability[]> {
    const start = startDateStr ? new Date(startDateStr) : new Date();
    start.setHours(0, 0, 0, 0);

    const roomTypes = await this.dataSource.getRepository(RoomType).find({
      where: { tenantId, propertyId, isActive: true },
      order: { name: 'ASC' },
    });

    const result: DailyRoomAvailability[] = [];

    for (const rt of roomTypes) {
      const totalRooms = await this.dataSource.getRepository(Room).count({
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
    tenantId: string,
    propertyId: string,
    roomTypeId: string,
    checkInDate: string,
    checkOutDate: string,
    requiredCount = 1,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const { minAvailable } = await this.getAvailabilityForRange(
      tenantId,
      propertyId,
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
