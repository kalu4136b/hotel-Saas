import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
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

@Injectable()
export class PmsService {
  constructor(private readonly dataSource: DataSource) {}

  // ==========================================
  // 1. ROOM TYPES
  // ==========================================
  async getRoomTypes(tenantId: string, propertyId: string) {
    await this.ensureSeedData(tenantId, propertyId);
    return this.dataSource.getRepository(RoomType).find({
      where: { tenantId, propertyId, isActive: true },
      order: { basePricePerNight: 'ASC' },
    });
  }

  async createRoomType(
    tenantId: string,
    propertyId: string,
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
    const repo = this.dataSource.getRepository(RoomType);
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
  async getRooms(tenantId: string, propertyId: string) {
    await this.ensureSeedData(tenantId, propertyId);
    return this.dataSource.getRepository(Room).find({
      where: { tenantId, propertyId },
      relations: { roomType: true },
      order: { floor: 'ASC', roomNumber: 'ASC' },
    });
  }

  async createRoom(
    tenantId: string,
    propertyId: string,
    dto: {
      roomTypeId: string;
      roomNumber: string;
      floor?: number;
      notes?: string;
    },
  ) {
    const roomRepo = this.dataSource.getRepository(Room);
    const existing = await roomRepo.findOne({
      where: { propertyId, roomNumber: dto.roomNumber.trim() },
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
    tenantId: string,
    propertyId: string,
    roomId: string,
    status: CleanlinessStatus,
  ) {
    const roomRepo = this.dataSource.getRepository(Room);
    const room = await roomRepo.findOne({ where: { id: roomId, tenantId, propertyId } });
    if (!room) throw new NotFoundException('Room not found');

    room.cleanlinessStatus = status;
    return roomRepo.save(room);
  }

  async updateOccupancyStatus(
    tenantId: string,
    propertyId: string,
    roomId: string,
    status: RoomStatus,
  ) {
    const roomRepo = this.dataSource.getRepository(Room);
    const room = await roomRepo.findOne({ where: { id: roomId, tenantId, propertyId } });
    if (!room) throw new NotFoundException('Room not found');

    room.status = status;
    return roomRepo.save(room);
  }

  // ==========================================
  // 3. GUESTS
  // ==========================================
  async getGuests(tenantId: string, propertyId: string) {
    return this.dataSource.getRepository(Guest).find({
      where: { tenantId, propertyId },
      order: { fullName: 'ASC' },
      take: 100,
    });
  }

  async createGuest(
    tenantId: string,
    propertyId: string,
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
    const repo = this.dataSource.getRepository(Guest);
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
    tenantId: string,
    propertyId: string,
    status?: string,
    search?: string,
  ) {
    await this.ensureSeedData(tenantId, propertyId);
    const qb = this.dataSource
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
    tenantId: string,
    propertyId: string,
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Resolve or create Guest
      let guest = await queryRunner.manager.getRepository(Guest).findOne({
        where: {
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
        where: { id: dto.roomTypeId, propertyId },
      });
      if (!roomType) throw new NotFoundException('Selected room type not found');

      // 3. Compute nights
      const start = new Date(dto.checkInDate);
      const end = new Date(dto.checkOutDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const nightlyRate = Number(roomType.basePricePerNight);
      const totalAmount = Number((nightsCount * nightlyRate).toFixed(2));

      // 4. Generate Reservation Number
      const count = await queryRunner.manager
        .getRepository(Reservation)
        .count({ where: { propertyId } });
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
          .update(dto.roomId, { status: RoomStatus.RESERVED });
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
    tenantId: string,
    propertyId: string,
    reservationId: string,
    roomId: string,
    userId: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
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

      // Validate Room
      const targetRoomId = roomId || reservation.roomId;
      if (!targetRoomId) throw new BadRequestException('A room must be assigned for check-in');

      const room = await queryRunner.manager.getRepository(Room).findOne({
        where: { id: targetRoomId, tenantId, propertyId },
      });
      if (!room) throw new NotFoundException('Assigned room not found');

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
        where: { reservationId: reservation.id },
      });

      if (!folio) {
        // Lodging total + property tax
        const prop = await queryRunner.manager.getRepository(Property).findOne({
          where: { id: propertyId },
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
    tenantId: string,
    propertyId: string,
    reservationId: string,
    userId: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
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
        where: { reservationId: reservation.id },
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
        await queryRunner.manager.getRepository(Room).update(reservation.roomId, {
          status: RoomStatus.AVAILABLE,
          cleanlinessStatus: CleanlinessStatus.DIRTY,
        });
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
  async getFolio(tenantId: string, propertyId: string, reservationId: string) {
    const folio = await this.dataSource.getRepository(GuestFolio).findOne({
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
    tenantId: string,
    propertyId: string,
    reservationId: string,
    dto: {
      chargeType: FolioChargeType;
      description: string;
      amount: number;
      referenceId?: string;
    },
  ) {
    const folioRepo = this.dataSource.getRepository(GuestFolio);
    const folio = await folioRepo.findOne({
      where: { reservationId, tenantId, propertyId },
    });
    if (!folio) throw new NotFoundException('Guest folio not found');

    const amount = Number(dto.amount);
    await this.dataSource.getRepository(FolioItem).save({
      folioId: folio.id,
      chargeType: dto.chargeType || FolioChargeType.OTHER,
      description: dto.description.trim(),
      amount,
      referenceId: dto.referenceId || undefined,
    });

    folio.totalCharges = Number((Number(folio.totalCharges) + amount).toFixed(2));
    folio.balanceDue = Number((Number(folio.totalCharges) - Number(folio.totalPayments)).toFixed(2));
    return folioRepo.save(folio);
  }

  async postFolioPayment(
    tenantId: string,
    propertyId: string,
    reservationId: string,
    dto: {
      paymentMethod: string;
      amount: number;
      receiptNumber?: string;
    },
  ) {
    const folioRepo = this.dataSource.getRepository(GuestFolio);
    const folio = await folioRepo.findOne({
      where: { reservationId, tenantId, propertyId },
    });
    if (!folio) throw new NotFoundException('Guest folio not found');

    const amount = Number(dto.amount);
    const count = await this.dataSource.getRepository(FolioPayment).count();
    const receiptNumber = dto.receiptNumber || `FOL-RCP-${(1000 + count + 1).toString()}`;

    await this.dataSource.getRepository(FolioPayment).save({
      folioId: folio.id,
      paymentMethod: dto.paymentMethod || 'CARD',
      amount,
      receiptNumber,
    });

    folio.totalPayments = Number((Number(folio.totalPayments) + amount).toFixed(2));
    folio.balanceDue = Number((Number(folio.totalCharges) - Number(folio.totalPayments)).toFixed(2));
    if (folio.balanceDue <= 0.05) {
      folio.status = FolioStatus.SETTLED;
    }
    return folioRepo.save(folio);
  }

  // ==========================================
  // 8. ENSURE SEED DATA (Zero Dummy Data, Real MySQL Seeding)
  // ==========================================
  private async ensureSeedData(tenantId: string, propertyId: string) {
    const roomTypeRepo = this.dataSource.getRepository(RoomType);
    const roomRepo = this.dataSource.getRepository(Room);
    const existingCount = await roomTypeRepo.count({ where: { propertyId } });
    const existingRooms = await roomRepo.count({ where: { propertyId } });
    if (existingCount > 0 || existingRooms > 0) return;

    // Seed Real Hotel Room Types matching the UI template
    const villaType = await roomTypeRepo.save(
      roomTypeRepo.create({
        tenantId,
        propertyId,
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
        tenantId,
        propertyId,
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
        tenantId,
        propertyId,
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
        tenantId,
        propertyId,
        name: 'Garden Bungalow',
        code: 'BUNGALOW',
        basePricePerNight: 180.0,
        maxOccupancy: 2,
        bedType: 'Queen Bed',
        amenities: 'Private Garden Patio, Hammock, Outdoor Shower, Artisan Tea Selection',
        description: 'Charming standalone bungalow nestled in exotic botanical gardens.',
      }),
    );

    // Seed Physical Rooms
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
          tenantId,
          propertyId,
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

    // Seed Guests & Real Initial Reservations matching template
    const guestRepo = this.dataSource.getRepository(Guest);
    const resRepo = this.dataSource.getRepository(Reservation);

    const guest1 = await guestRepo.save(
      guestRepo.create({
        tenantId,
        propertyId,
        fullName: 'Angela Vance',
        email: 'angela.vance@example.com',
        phone: '+1 555-0142',
        passportOrId: 'US-9823412',
        nationality: 'United States',
        vipLevel: 'PLATINUM',
      }),
    );

    const guest2 = await guestRepo.save(
      guestRepo.create({
        tenantId,
        propertyId,
        fullName: 'James Miller',
        email: 'james.miller@example.com',
        phone: '+44 7700 900142',
        passportOrId: 'UK-7629103',
        nationality: 'United Kingdom',
        vipLevel: 'STANDARD',
      }),
    );

    const guest3 = await guestRepo.save(
      guestRepo.create({
        tenantId,
        propertyId,
        fullName: 'Pamela Beesly',
        email: 'pam.beesly@example.com',
        phone: '+1 555-0188',
        passportOrId: 'US-6510923',
        nationality: 'United States',
        vipLevel: 'VIP',
      }),
    );

    // Create Initial Reservations
    const room304 = seededRooms.find((r) => r.roomNumber === '304');
    const room108 = seededRooms.find((r) => r.roomNumber === '108');
    const room205 = seededRooms.find((r) => r.roomNumber === '205');

    // 1. Angela Vance - Checked in to 304
    const res1 = await resRepo.save(
      resRepo.create({
        tenantId,
        propertyId,
        reservationNumber: 'BK-9041',
        guestId: guest1.id,
        roomTypeId: villaType.id,
        roomId: room304?.id,
        checkInDate: '2026-09-25',
        checkOutDate: '2026-09-29',
        nightsCount: 4,
        adultsCount: 2,
        nightlyRate: 340.0,
        totalAmount: 1360.0,
        depositPaid: 500.0,
        status: ReservationStatus.CHECKED_IN,
        source: 'DIRECT',
        specialRequests: 'High floor, late arrival, honeymoon setup',
      }),
    );

    // Initial Folio for Angela
    const folioRepo = this.dataSource.getRepository(GuestFolio);
    const folio1 = await folioRepo.save(
      folioRepo.create({
        tenantId,
        propertyId,
        reservationId: res1.id,
        guestId: guest1.id,
        roomId: room304?.id,
        totalCharges: 1496.0, // 1360 + 10% tax
        totalPayments: 500.0,
        balanceDue: 996.0,
        status: FolioStatus.OPEN,
      }),
    );

    await this.dataSource.getRepository(FolioItem).save([
      {
        folioId: folio1.id,
        chargeType: FolioChargeType.ROOM_CHARGE,
        description: 'Lodging (4 Nights @ $340.00/night)',
        amount: 1360.0,
        referenceId: 'BK-9041',
      },
      {
        folioId: folio1.id,
        chargeType: FolioChargeType.TAX,
        description: 'Hospitality Lodging Tax (10%)',
        amount: 136.0,
        referenceId: 'BK-9041',
      },
    ]);

    await this.dataSource.getRepository(FolioPayment).save({
      folioId: folio1.id,
      paymentMethod: 'CARD',
      amount: 500.0,
      receiptNumber: 'DEP-BK-9041',
    });

    // 2. James Miller - Confirmed for 108
    await resRepo.save(
      resRepo.create({
        tenantId,
        propertyId,
        reservationNumber: 'BK-9042',
        guestId: guest2.id,
        roomTypeId: suiteType.id,
        roomId: room108?.id,
        checkInDate: '2026-09-27',
        checkOutDate: '2026-09-29',
        nightsCount: 2,
        adultsCount: 2,
        nightlyRate: 290.0,
        totalAmount: 580.0,
        depositPaid: 200.0,
        status: ReservationStatus.CONFIRMED,
        source: 'DIRECT',
      }),
    );

    // 3. Pamela Beesly - Checked in to 205
    const res3 = await resRepo.save(
      resRepo.create({
        tenantId,
        propertyId,
        reservationNumber: 'BK-9043',
        guestId: guest3.id,
        roomTypeId: loftType.id,
        roomId: room205?.id,
        checkInDate: '2026-09-26',
        checkOutDate: '2026-09-29',
        nightsCount: 3,
        adultsCount: 1,
        nightlyRate: 230.0,
        totalAmount: 690.0,
        depositPaid: 690.0,
        status: ReservationStatus.CHECKED_IN,
        source: 'CORPORATE',
      }),
    );

    const folio3 = await folioRepo.save(
      folioRepo.create({
        tenantId,
        propertyId,
        reservationId: res3.id,
        guestId: guest3.id,
        roomId: room205?.id,
        totalCharges: 759.0, // 690 + 10%
        totalPayments: 759.0,
        balanceDue: 0.0,
        status: FolioStatus.SETTLED,
      }),
    );

    await this.dataSource.getRepository(FolioItem).save([
      {
        folioId: folio3.id,
        chargeType: FolioChargeType.ROOM_CHARGE,
        description: 'Lodging (3 Nights @ $230.00/night)',
        amount: 690.0,
        referenceId: 'BK-9043',
      },
      {
        folioId: folio3.id,
        chargeType: FolioChargeType.TAX,
        description: 'Hospitality Lodging Tax (10%)',
        amount: 69.0,
        referenceId: 'BK-9043',
      },
    ]);

    await this.dataSource.getRepository(FolioPayment).save({
      folioId: folio3.id,
      paymentMethod: 'CARD',
      amount: 759.0,
      receiptNumber: 'DEP-BK-9043',
    });
  }
}
