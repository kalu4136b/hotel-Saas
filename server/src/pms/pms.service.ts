import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { In } from 'typeorm';
import {
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
  AuditLog,
  Property,
} from '../entities';
import { EventsGateway } from '../events/events.gateway';
import { TenantConnectionManager } from '../database/tenant-connection-manager.service';

@Injectable()
export class PmsService {
  constructor(
    private readonly tenantConn: TenantConnectionManager,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // ==========================================
  // 1. ROOM TYPES
  // ==========================================
  async getRoomTypes(rawTenantId: string, rawPropertyId: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    return ds.getRepository(RoomType).find({
      where: { tenantId, propertyId, isActive: true },
      order: { basePricePerNight: 'ASC' },
    });
  }

  async createRoomType(
    rawTenantId: string,
    rawPropertyId: string,
    dto: {
      name: string;
      code?: string;
      basePricePerNight: number;
      maxOccupancy?: number;
      bedType?: string;
      amenities?: string;
      description?: string;
    },
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const repo = ds.getRepository(RoomType);
    const roomType = repo.create({
      tenantId,
      propertyId,
      name: dto.name.trim(),
      code: dto.code?.toUpperCase().trim() || dto.name.slice(0, 4).toUpperCase(),
      basePricePerNight: Number(dto.basePricePerNight) || 100,
      maxOccupancy: Number(dto.maxOccupancy) || 2,
      bedType: dto.bedType || 'King Bed',
      amenities: dto.amenities || 'WiFi, AC, TV, Mini-bar',
      description: dto.description || '',
    });
    return repo.save(roomType);
  }

  // ==========================================
  // 2. ROOMS
  // ==========================================
  async getRooms(rawTenantId: string, rawPropertyId: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    return ds.getRepository(Room).find({
      where: { tenantId, propertyId },
      relations: { roomType: true },
      order: { floor: 'ASC', roomNumber: 'ASC' },
    });
  }

  async createRoom(
    rawTenantId: string,
    rawPropertyId: string,
    dto: {
      roomTypeId: string;
      roomNumber: string;
      floor?: number;
      notes?: string;
    },
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const roomType = await ds.getRepository(RoomType).findOne({
      where: { id: dto.roomTypeId, tenantId, propertyId },
    });
    if (!roomType) {
      throw new NotFoundException('Selected room type not found on this property');
    }

    const roomRepo = ds.getRepository(Room);
    const existing = await roomRepo.findOne({
      where: { tenantId, propertyId, roomNumber: dto.roomNumber.trim() },
    });
    if (existing) {
      throw new ConflictException(`Room ${dto.roomNumber} already exists on this property`);
    }

    const room = roomRepo.create({
      tenantId,
      propertyId,
      roomTypeId: dto.roomTypeId,
      roomNumber: dto.roomNumber.trim(),
      floor: Number(dto.floor) || 1,
      status: RoomStatus.AVAILABLE,
      cleanlinessStatus: CleanlinessStatus.CLEAN,
      notes: dto.notes || undefined,
    });
    return roomRepo.save(room);
  }

  async updateCleanliness(
    rawTenantId: string,
    rawPropertyId: string,
    roomId: string,
    status: CleanlinessStatus,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const roomRepo = ds.getRepository(Room);
    const room = await roomRepo.findOne({ where: { id: roomId, tenantId, propertyId } });
    if (!room) throw new NotFoundException('Room not found');

    room.cleanlinessStatus = status;
    const saved = await roomRepo.save(room);
    try {
      this.eventsGateway.notifyRoomStatusUpdate(propertyId, saved);
    } catch (err) {
      console.error('Failed to emit room cleanliness update:', err);
    }
    return saved;
  }

  async bulkUpdateCleanliness(
    rawTenantId: string,
    rawPropertyId: string,
    roomIds: string[],
    status: CleanlinessStatus,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    if (!roomIds || roomIds.length === 0) return [];

    const roomRepo = ds.getRepository(Room);
    const rooms = await roomRepo.find({
      where: {
        id: In(roomIds),
        tenantId,
        propertyId,
      },
      relations: { roomType: true },
    });

    for (const room of rooms) {
      room.cleanlinessStatus = status;
      await roomRepo.save(room);
      try {
        this.eventsGateway.notifyRoomStatusUpdate(propertyId, room);
      } catch {
        // Continue
      }
    }
    return rooms;
  }

  async updateRoomNotes(
    rawTenantId: string,
    rawPropertyId: string,
    roomId: string,
    notes: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const roomRepo = ds.getRepository(Room);
    const room = await roomRepo.findOne({
      where: { id: roomId, tenantId, propertyId },
      relations: { roomType: true },
    });
    if (!room) throw new NotFoundException('Room not found');

    room.notes = notes;
    const saved = await roomRepo.save(room);
    try {
      this.eventsGateway.notifyRoomStatusUpdate(propertyId, saved);
    } catch (err) {
      console.error('Failed to emit room notes update:', err);
    }
    return saved;
  }

  async updateOccupancyStatus(
    rawTenantId: string,
    rawPropertyId: string,
    roomId: string,
    status: RoomStatus,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const roomRepo = ds.getRepository(Room);
    const room = await roomRepo.findOne({ where: { id: roomId, tenantId, propertyId } });
    if (!room) throw new NotFoundException('Room not found');

    room.status = status;
    const saved = await roomRepo.save(room);
    try {
      this.eventsGateway.notifyRoomStatusUpdate(propertyId, saved);
    } catch (err) {
      console.error('Failed to emit room occupancy update:', err);
    }
    return saved;
  }

  // ==========================================
  // 3. GUESTS
  // ==========================================
  async getGuests(rawTenantId: string, rawPropertyId: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    return ds.getRepository(Guest).find({
      where: { tenantId, propertyId },
      order: { fullName: 'ASC' },
      take: 100,
    });
  }

  async createGuest(
    rawTenantId: string,
    rawPropertyId: string,
    dto: {
      fullName: string;
      email?: string;
      phone?: string;
      passportOrId?: string;
      nationality?: string;
      vipLevel?: string;
      notes?: string;
    },
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const repo = ds.getRepository(Guest);
    const guest = repo.create({
      tenantId,
      propertyId,
      fullName: dto.fullName.trim(),
      email: dto.email?.trim() || undefined,
      phone: dto.phone?.trim() || undefined,
      passportOrId: dto.passportOrId?.trim() || undefined,
      nationality: dto.nationality?.trim() || undefined,
      vipLevel: dto.vipLevel || 'STANDARD',
      notes: dto.notes || undefined,
    });
    return repo.save(guest);
  }

  // ==========================================
  // 4. RESERVATIONS
  // ==========================================
  async getReservations(
    rawTenantId: string,
    rawPropertyId: string,
    status?: string,
    search?: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const qb = ds
      .getRepository(Reservation)
      .createQueryBuilder('res')
      .leftJoinAndSelect('res.guest', 'guest')
      .leftJoinAndSelect('res.roomType', 'roomType')
      .leftJoinAndSelect('res.room', 'room')
      .where('res.tenantId = :tenantId', { tenantId })
      .andWhere('res.propertyId = :propertyId', { propertyId });

    if (status) {
      qb.andWhere('res.status = :status', { status });
    }

    if (search) {
      qb.andWhere(
        '(res.reservationNumber LIKE :q OR guest.fullName LIKE :q OR guest.email LIKE :q OR room.roomNumber LIKE :q)',
        { q: `%${search}%` },
      );
    }

    qb.orderBy('res.createdAt', 'DESC');
    return qb.getMany();
  }

  async createReservation(
    rawTenantId: string,
    rawPropertyId: string,
    dto: {
      guestName: string;
      guestEmail?: string;
      guestPhone?: string;
      passportOrId?: string;
      nationality?: string;
      roomTypeId: string;
      roomId?: string;
      checkInDate: string;
      checkOutDate: string;
      adultsCount?: number;
      childrenCount?: number;
      depositPaid?: number;
      source?: string;
      specialRequests?: string;
    },
    userId: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Resolve or create Guest
      let guest = await queryRunner.manager.getRepository(Guest).findOne({
        where: {
          tenantId,
          propertyId,
          fullName: dto.guestName.trim(),
        },
      });

      if (!guest) {
        guest = queryRunner.manager.getRepository(Guest).create({
          tenantId,
          propertyId,
          fullName: dto.guestName.trim(),
          email: dto.guestEmail?.trim() || undefined,
          phone: dto.guestPhone?.trim() || undefined,
          passportOrId: dto.passportOrId?.trim() || undefined,
          nationality: dto.nationality?.trim() || undefined,
        });
        guest = await queryRunner.manager.getRepository(Guest).save(guest);
      }

      // 2. Resolve RoomType & Rates
      const roomType = await queryRunner.manager.getRepository(RoomType).findOne({
        where: { id: dto.roomTypeId, tenantId, propertyId },
      });
      if (!roomType) throw new NotFoundException('Selected room type not found');

      // Validate pre-assigned room belongs to this tenant/property
      if (dto.roomId) {
        const assignedRoom = await queryRunner.manager.getRepository(Room).findOne({
          where: { id: dto.roomId, tenantId, propertyId },
        });
        if (!assignedRoom) {
          throw new NotFoundException('Selected room not found on this property');
        }
      }

      // 3. Compute nights
      const start = new Date(dto.checkInDate);
      const end = new Date(dto.checkOutDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid check-in or check-out date format');
      }
      if (end.getTime() <= start.getTime()) {
        throw new BadRequestException('Check-out date must be strictly after check-in date');
      }
      const diffTime = end.getTime() - start.getTime();
      const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const nightlyRate = Number(roomType.basePricePerNight);
      const totalAmount = Number((nightsCount * nightlyRate).toFixed(2));

      // 4. Generate Reservation Number
      const count = await queryRunner.manager
        .getRepository(Reservation)
        .count({ where: { tenantId, propertyId } });
      const reservationNumber = `BK-${(9040 + count + 1).toString()}`;

      // 5. Create Reservation
      const reservation = queryRunner.manager.getRepository(Reservation).create({
        tenantId,
        propertyId,
        reservationNumber,
        guestId: guest.id,
        roomTypeId: roomType.id,
        roomId: dto.roomId || undefined,
        checkInDate: dto.checkInDate,
        checkOutDate: dto.checkOutDate,
        nightsCount,
        adultsCount: Number(dto.adultsCount) || 1,
        childrenCount: Number(dto.childrenCount) || 0,
        nightlyRate,
        totalAmount,
        depositPaid: Number(dto.depositPaid) || 0,
        status: ReservationStatus.CONFIRMED,
        source: dto.source || 'DIRECT',
        specialRequests: dto.specialRequests || undefined,
      });

      const savedReservation = await queryRunner.manager
        .getRepository(Reservation)
        .save(reservation);

      // If room was pre-assigned, mark it RESERVED
      if (dto.roomId) {
        await queryRunner.manager
          .getRepository(Room)
          .update({ id: dto.roomId, tenantId, propertyId }, { status: RoomStatus.RESERVED });
      }

      // Log Audit
      await queryRunner.manager.getRepository(AuditLog).save({
        tenantId,
        propertyId,
        userId,
        action: 'RESERVATION_CREATED',
        entity: 'Reservation',
        entityId: savedReservation.id,
        details: JSON.stringify({
          reservationNumber,
          guest: guest.fullName,
          totalAmount,
        }),
      });

      await queryRunner.commitTransaction();
      return savedReservation;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ==========================================
  // 5. CHECK-IN
  // ==========================================
  async checkIn(
    rawTenantId: string,
    rawPropertyId: string,
    reservationId: string,
    roomId: string,
    userId: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const resRepo = queryRunner.manager.getRepository(Reservation);
      const reservation = await resRepo.findOne({
        where: { id: reservationId, tenantId, propertyId },
        relations: { guest: true, roomType: true },
      });
      if (!reservation) throw new NotFoundException('Reservation not found');

      if (reservation.status === ReservationStatus.CHECKED_IN) {
        throw new BadRequestException('Guest is already checked in');
      }
      if (reservation.status === ReservationStatus.CHECKED_OUT) {
        throw new BadRequestException('Reservation has already been checked out');
      }
      if (reservation.status === ReservationStatus.CANCELLED) {
        throw new BadRequestException('Cannot check in a cancelled reservation');
      }

      // Validate Room
      const targetRoomId = roomId || reservation.roomId;
      if (!targetRoomId) throw new BadRequestException('A room must be assigned for check-in');

      const room = await queryRunner.manager.getRepository(Room).findOne({
        where: { id: targetRoomId, tenantId, propertyId },
      });
      if (!room) throw new NotFoundException('Assigned room not found');

      if (room.status === RoomStatus.OCCUPIED && reservation.roomId !== room.id) {
        throw new BadRequestException(
          `Room ${room.roomNumber} is currently occupied by another guest`,
        );
      }
      if (room.status === RoomStatus.MAINTENANCE) {
        throw new BadRequestException(
          `Room ${room.roomNumber} is under maintenance and cannot be checked in`,
        );
      }
      if (room.status === RoomStatus.OUT_OF_SERVICE) {
        throw new BadRequestException(`Room ${room.roomNumber} is out of service`);
      }
      if (
        room.cleanlinessStatus === CleanlinessStatus.DIRTY ||
        room.cleanlinessStatus === CleanlinessStatus.IN_CLEANING
      ) {
        throw new BadRequestException(
          `Room ${room.roomNumber} is currently ${room.cleanlinessStatus}. Please inspect and mark CLEAN before checking in.`,
        );
      }

      // Update Room to OCCUPIED
      room.status = RoomStatus.OCCUPIED;
      await queryRunner.manager.getRepository(Room).save(room);

      // Update Reservation
      reservation.status = ReservationStatus.CHECKED_IN;
      reservation.roomId = room.id;
      await resRepo.save(reservation);

      // Create or retrieve Guest Folio
      const folioRepo = queryRunner.manager.getRepository(GuestFolio);
      let folio = await folioRepo.findOne({
        where: { reservationId: reservation.id, tenantId, propertyId },
      });

      if (!folio) {
        // Lodging total + property tax
        const prop = await queryRunner.manager.getRepository(Property).findOne({
          where: { id: propertyId, tenantId },
        });
        const taxRate = Number(prop?.defaultTaxRate || 10) / 100;
        const lodgingAmount = Number(reservation.totalAmount);
        const taxAmount = Number((lodgingAmount * taxRate).toFixed(2));
        const totalCharges = Number((lodgingAmount + taxAmount).toFixed(2));
        const totalPayments = Number(reservation.depositPaid || 0);
        const balanceDue = Number((totalCharges - totalPayments).toFixed(2));

        folio = folioRepo.create({
          tenantId,
          propertyId,
          reservationId: reservation.id,
          guestId: reservation.guestId,
          roomId: room.id,
          totalCharges,
          totalPayments,
          balanceDue,
          status: FolioStatus.OPEN,
        });
        folio = await folioRepo.save(folio);

        // Add Lodging item
        await queryRunner.manager.getRepository(FolioItem).save({
          folioId: folio.id,
          chargeType: FolioChargeType.ROOM_CHARGE,
          description: `Lodging (${reservation.nightsCount} Nights @ $${reservation.nightlyRate}/night)`,
          amount: lodgingAmount,
          referenceId: reservation.reservationNumber,
        });

        // Add Tax item
        await queryRunner.manager.getRepository(FolioItem).save({
          folioId: folio.id,
          chargeType: FolioChargeType.TAX,
          description: `Lodging Tax & Surcharge (${(taxRate * 100).toFixed(0)}%)`,
          amount: taxAmount,
          referenceId: reservation.reservationNumber,
        });

        // If deposit was paid, add payment item
        if (totalPayments > 0) {
          await queryRunner.manager.getRepository(FolioPayment).save({
            folioId: folio.id,
            paymentMethod: 'DEPOSIT',
            amount: totalPayments,
            receiptNumber: `DEP-${reservation.reservationNumber}`,
          });
        }
      }

      // Log Audit
      await queryRunner.manager.getRepository(AuditLog).save({
        tenantId,
        propertyId,
        userId,
        action: 'GUEST_CHECKED_IN',
        entity: 'Reservation',
        entityId: reservation.id,
        details: JSON.stringify({
          reservationNumber: reservation.reservationNumber,
          room: room.roomNumber,
          guest: reservation.guest.fullName,
        }),
      });

      await queryRunner.commitTransaction();

      try {
        this.eventsGateway.notifyRoomStatusUpdate(propertyId, room);
        if (folio) {
          this.eventsGateway.notifyFolioUpdate(propertyId, folio);
        }
      } catch (err) {
        console.error('Failed to dispatch websocket events on check-in:', err);
      }

      return { reservation, folio };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ==========================================
  // 6. CHECK-OUT
  // ==========================================
  async checkOut(
    rawTenantId: string,
    rawPropertyId: string,
    reservationId: string,
    userId: string,
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const resRepo = queryRunner.manager.getRepository(Reservation);
      const reservation = await resRepo.findOne({
        where: { id: reservationId, tenantId, propertyId },
        relations: { room: true },
      });
      if (!reservation) throw new NotFoundException('Reservation not found');

      if (reservation.status !== ReservationStatus.CHECKED_IN) {
        throw new BadRequestException('Reservation is not in checked-in status');
      }

      // Check Folio Balance
      const folioRepo = queryRunner.manager.getRepository(GuestFolio);
      const folio = await folioRepo.findOne({
        where: { reservationId: reservation.id, tenantId, propertyId },
      });

      if (folio && Number(folio.balanceDue) > 0.05) {
        throw new BadRequestException(
          `Cannot check out with outstanding folio balance of $${Number(folio.balanceDue).toFixed(2)}. Please settle folio first.`,
        );
      }

      // Settle Folio
      if (folio) {
        folio.status = FolioStatus.SETTLED;
        await folioRepo.save(folio);
      }

      // Release Room & Set to DIRTY
      if (reservation.roomId) {
        await queryRunner.manager.getRepository(Room).update(
          { id: reservation.roomId, tenantId, propertyId },
          {
            status: RoomStatus.AVAILABLE,
            cleanlinessStatus: CleanlinessStatus.DIRTY,
          },
        );
      }

      // Update Reservation Status
      reservation.status = ReservationStatus.CHECKED_OUT;
      await resRepo.save(reservation);

      // Audit Log
      await queryRunner.manager.getRepository(AuditLog).save({
        tenantId,
        propertyId,
        userId,
        action: 'GUEST_CHECKED_OUT',
        entity: 'Reservation',
        entityId: reservation.id,
        details: JSON.stringify({
          reservationNumber: reservation.reservationNumber,
          room: reservation.room?.roomNumber,
        }),
      });

      await queryRunner.commitTransaction();

      try {
        if (reservation.roomId) {
          this.eventsGateway.notifyRoomStatusUpdate(propertyId, {
            id: reservation.roomId,
            status: RoomStatus.AVAILABLE,
            cleanlinessStatus: CleanlinessStatus.DIRTY,
          });
        }
        if (folio) {
          this.eventsGateway.notifyFolioUpdate(propertyId, folio);
        }
      } catch (err) {
        console.error('Failed to dispatch websocket events on check-out:', err);
      }

      return { success: true, reservation };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ==========================================
  // 7. GUEST FOLIOS
  // ==========================================
  async getFolio(rawTenantId: string, rawPropertyId: string, reservationId: string) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const folio = await ds.getRepository(GuestFolio).findOne({
      where: { reservationId, tenantId, propertyId },
      relations: {
        guest: true,
        room: true,
        reservation: true,
        items: true,
        payments: true,
      },
    });
    if (!folio) throw new NotFoundException('Folio not found for this reservation');
    return folio;
  }

  async postFolioCharge(
    rawTenantId: string,
    rawPropertyId: string,
    reservationId: string,
    dto: {
      chargeType: FolioChargeType;
      description: string;
      amount: number;
      referenceId?: string;
    },
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const folioRepo = ds.getRepository(GuestFolio);
    const folio = await folioRepo.findOne({
      where: { reservationId, tenantId, propertyId },
    });
    if (!folio) throw new NotFoundException('Guest folio not found');

    const amount = Number(dto.amount);
    await ds.getRepository(FolioItem).save({
      folioId: folio.id,
      chargeType: dto.chargeType || FolioChargeType.OTHER,
      description: dto.description.trim(),
      amount,
      referenceId: dto.referenceId || undefined,
    });

    folio.totalCharges = Number((Number(folio.totalCharges) + amount).toFixed(2));
    folio.balanceDue = Number(
      (Number(folio.totalCharges) - Number(folio.totalPayments)).toFixed(2),
    );
    if (folio.balanceDue > 0.05 && folio.status === FolioStatus.SETTLED) {
      folio.status = FolioStatus.OPEN;
    }
    const saved = await folioRepo.save(folio);
    try {
      this.eventsGateway.notifyFolioUpdate(propertyId, saved);
    } catch (err) {
      console.error('Failed to dispatch websocket event for folio charge:', err);
    }
    return saved;
  }

  async postFolioPayment(
    rawTenantId: string,
    rawPropertyId: string,
    reservationId: string,
    dto: {
      paymentMethod: string;
      amount: number;
      receiptNumber?: string;
    },
  ) {
    const { ds, tenantId, propertyId } = await this.tenantConn.resolveTenantScope(
      rawTenantId,
      rawPropertyId,
    );
    const folioRepo = ds.getRepository(GuestFolio);
    const folio = await folioRepo.findOne({
      where: { reservationId, tenantId, propertyId },
    });
    if (!folio) throw new NotFoundException('Guest folio not found');

    const amount = Number(dto.amount);
    const count = await ds
      .getRepository(FolioPayment)
      .createQueryBuilder('fp')
      .innerJoin('fp.folio', 'f')
      .where('f.tenantId = :tenantId', { tenantId })
      .getCount();
    const receiptNumber = dto.receiptNumber || `FOL-RCP-${(1000 + count + 1).toString()}`;

    await ds.getRepository(FolioPayment).save({
      folioId: folio.id,
      paymentMethod: dto.paymentMethod || 'CARD',
      amount,
      receiptNumber,
    });

    folio.totalPayments = Number((Number(folio.totalPayments) + amount).toFixed(2));
    folio.balanceDue = Number(
      (Number(folio.totalCharges) - Number(folio.totalPayments)).toFixed(2),
    );
    if (folio.balanceDue <= 0.05) {
      folio.status = FolioStatus.SETTLED;
    }
    const saved = await folioRepo.save(folio);
    try {
      this.eventsGateway.notifyFolioUpdate(propertyId, saved);
    } catch (err) {
      console.error('Failed to dispatch websocket event for folio payment:', err);
    }
    return saved;
  }
}
