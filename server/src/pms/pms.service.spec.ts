import { Test, TestingModule } from '@nestjs/testing';
import { PmsService } from './pms.service';
import { DataSource } from 'typeorm';
import { EventsGateway } from '../events/events.gateway';
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
  FolioChargeType,
} from '../entities';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('PmsService — Unit & Operational State Machine Tests', () => {
  let service: PmsService;
  let mockDataSource: any;
  let mockEventsGateway: any;
  let mockQueryRunner: any;

  const tenantId = 'tenant-123';
  const propertyId = 'prop-456';
  const userId = 'user-789';

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        getRepository: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    mockDataSource = {
      getRepository: jest.fn(),
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    mockEventsGateway = {
      notifyRoomStatusUpdate: jest.fn(),
      notifyFolioUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PmsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<PmsService>(PmsService);
  });

  describe('1. Room Management & Housekeeping State Machine', () => {
    it('should prevent creating a room with duplicate roomNumber on the same property', async () => {
      const mockRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'existing-room-id', roomNumber: '101' }),
      };
      mockDataSource.getRepository.mockReturnValue(mockRepo);

      await expect(
        service.createRoom(tenantId, propertyId, {
          roomTypeId: 'type-1',
          roomNumber: '101',
          floor: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should transition room cleanliness status and emit WebSocket update', async () => {
      const mockRoom = {
        id: 'room-1',
        tenantId,
        propertyId,
        roomNumber: '101',
        cleanlinessStatus: CleanlinessStatus.DIRTY,
      };
      const mockRepo = {
        findOne: jest.fn().mockResolvedValue(mockRoom),
        save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
      };
      mockDataSource.getRepository.mockReturnValue(mockRepo);

      const updated = await service.updateCleanliness(
        tenantId,
        propertyId,
        'room-1',
        CleanlinessStatus.INSPECTED,
      );

      expect(updated.cleanlinessStatus).toBe(CleanlinessStatus.INSPECTED);
      expect(mockEventsGateway.notifyRoomStatusUpdate).toHaveBeenCalledWith(
        propertyId,
        expect.objectContaining({ cleanlinessStatus: CleanlinessStatus.INSPECTED }),
      );
    });
  });

  describe('2. Reservation Creation & Date Validation', () => {
    it('should reject reservations where checkOutDate is on or before checkInDate', async () => {
      const guestRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'guest-1', fullName: 'John Doe' }),
      };
      const roomTypeRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'type-1', basePricePerNight: 200 }),
      };

      mockQueryRunner.manager.getRepository.mockImplementation((entity: any) => {
        if (entity === Guest) return guestRepo;
        if (entity === RoomType) return roomTypeRepo;
        return { count: jest.fn().mockResolvedValue(0) };
      });

      await expect(
        service.createReservation(
          tenantId,
          propertyId,
          {
            guestName: 'John Doe',
            roomTypeId: 'type-1',
            checkInDate: '2026-10-15',
            checkOutDate: '2026-10-10', // Invalid: Before check-in
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should calculate nights and total amount accurately for valid dates', async () => {
      const guest = { id: 'guest-1', fullName: 'John Doe' };
      const roomType = { id: 'type-1', basePricePerNight: 250 };

      const guestRepo = {
        findOne: jest.fn().mockResolvedValue(guest),
      };
      const roomTypeRepo = {
        findOne: jest.fn().mockResolvedValue(roomType),
      };
      const resRepo = {
        count: jest.fn().mockResolvedValue(5),
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation((r) => Promise.resolve({ ...r, id: 'res-new' })),
      };
      const auditRepo = {
        save: jest.fn().mockResolvedValue({}),
      };

      mockQueryRunner.manager.getRepository.mockImplementation((entity: any) => {
        if (entity === Guest) return guestRepo;
        if (entity === RoomType) return roomTypeRepo;
        if (entity === Reservation) return resRepo;
        return auditRepo;
      });

      const res = await service.createReservation(
        tenantId,
        propertyId,
        {
          guestName: 'John Doe',
          roomTypeId: 'type-1',
          checkInDate: '2026-10-10',
          checkOutDate: '2026-10-14', // 4 nights
        },
        userId,
      );

      expect(res.nightsCount).toBe(4);
      expect(res.nightlyRate).toBe(250);
      expect(res.totalAmount).toBe(1000); // 4 * 250
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('3. Check-In Lifecycle & Folio Generation', () => {
    it('should reject check-in if the room is marked DIRTY or IN_CLEANING', async () => {
      const reservation = {
        id: 'res-1',
        tenantId,
        propertyId,
        status: ReservationStatus.CONFIRMED,
        roomId: 'room-dirty',
        guest: { fullName: 'Alice' },
      };
      const room = {
        id: 'room-dirty',
        roomNumber: '104',
        status: RoomStatus.AVAILABLE,
        cleanlinessStatus: CleanlinessStatus.DIRTY,
      };

      const resRepo = {
        findOne: jest.fn().mockResolvedValue(reservation),
      };
      const roomRepo = {
        findOne: jest.fn().mockResolvedValue(room),
      };

      mockQueryRunner.manager.getRepository.mockImplementation((entity: any) => {
        if (entity === Reservation) return resRepo;
        if (entity === Room) return roomRepo;
        return {};
      });

      await expect(
        service.checkIn(tenantId, propertyId, 'res-1', 'room-dirty', userId),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should reject check-in if the room is already OCCUPIED by another guest', async () => {
      const reservation = {
        id: 'res-1',
        tenantId,
        propertyId,
        status: ReservationStatus.CONFIRMED,
        roomId: null,
      };
      const room = {
        id: 'room-occ',
        roomNumber: '105',
        status: RoomStatus.OCCUPIED,
        cleanlinessStatus: CleanlinessStatus.CLEAN,
      };

      const resRepo = {
        findOne: jest.fn().mockResolvedValue(reservation),
      };
      const roomRepo = {
        findOne: jest.fn().mockResolvedValue(room),
      };

      mockQueryRunner.manager.getRepository.mockImplementation((entity: any) => {
        if (entity === Reservation) return resRepo;
        if (entity === Room) return roomRepo;
        return {};
      });

      await expect(
        service.checkIn(tenantId, propertyId, 'res-1', 'room-occ', userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully check in a guest, mark room OCCUPIED, and open a folio with tax calculation', async () => {
      const reservation = {
        id: 'res-1',
        tenantId,
        propertyId,
        reservationNumber: 'BK-9050',
        guestId: 'guest-1',
        status: ReservationStatus.CONFIRMED,
        roomId: 'room-clean',
        nightsCount: 3,
        nightlyRate: 200,
        totalAmount: 600,
        depositPaid: 100,
        guest: { fullName: 'Bob Martin' },
      };
      const room = {
        id: 'room-clean',
        roomNumber: '202',
        status: RoomStatus.AVAILABLE,
        cleanlinessStatus: CleanlinessStatus.CLEAN,
      };
      const property = {
        id: propertyId,
        defaultTaxRate: 10, // 10%
      };

      const resRepo = {
        findOne: jest.fn().mockResolvedValue(reservation),
        save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
      };
      const roomRepo = {
        findOne: jest.fn().mockResolvedValue(room),
        save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
      };
      const folioRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((f) => ({ ...f, id: 'folio-1' })),
        save: jest.fn().mockImplementation((f) => Promise.resolve(f)),
      };
      const folioItemRepo = {
        save: jest.fn().mockResolvedValue({}),
      };
      const folioPaymentRepo = {
        save: jest.fn().mockResolvedValue({}),
      };
      const auditRepo = {
        save: jest.fn().mockResolvedValue({}),
      };
      const propRepo = {
        findOne: jest.fn().mockResolvedValue(property),
      };

      mockQueryRunner.manager.getRepository.mockImplementation((entity: any) => {
        if (entity === Reservation) return resRepo;
        if (entity === Room) return roomRepo;
        if (entity === GuestFolio) return folioRepo;
        if (entity === FolioItem) return folioItemRepo;
        if (entity === FolioPayment) return folioPaymentRepo;
        if (entity.name === 'Property') return propRepo;
        return auditRepo;
      });

      const result = await service.checkIn(tenantId, propertyId, 'res-1', 'room-clean', userId);

      expect(room.status).toBe(RoomStatus.OCCUPIED);
      expect(result.reservation.status).toBe(ReservationStatus.CHECKED_IN);
      expect(result.folio.totalCharges).toBe(660); // 600 + 10% ($60)
      expect(result.folio.totalPayments).toBe(100);
      expect(result.folio.balanceDue).toBe(560);
      expect(result.folio.status).toBe(FolioStatus.OPEN);
      expect(mockEventsGateway.notifyRoomStatusUpdate).toHaveBeenCalled();
    });
  });

  describe('4. Guest Folio Accounting & Dynamic Reopening', () => {
    it('should reopen a SETTLED folio to OPEN if a new charge creates an outstanding balance', async () => {
      const folio = {
        id: 'folio-1',
        tenantId,
        propertyId,
        reservationId: 'res-1',
        totalCharges: 500,
        totalPayments: 500,
        balanceDue: 0,
        status: FolioStatus.SETTLED,
      };

      const folioRepo = {
        findOne: jest.fn().mockResolvedValue(folio),
        save: jest.fn().mockImplementation((f) => Promise.resolve(f)),
      };
      const folioItemRepo = {
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.getRepository.mockImplementation((entity: any) => {
        if (entity === GuestFolio) return folioRepo;
        if (entity === FolioItem) return folioItemRepo;
        return {};
      });

      const updated = await service.postFolioCharge(tenantId, propertyId, 'res-1', {
        chargeType: FolioChargeType.RESTAURANT_POS,
        description: 'Room Service Dinner',
        amount: 85.5,
      });

      expect(updated.totalCharges).toBe(585.5);
      expect(updated.balanceDue).toBe(85.5);
      expect(updated.status).toBe(FolioStatus.OPEN); // Automatically reopened!
      expect(mockEventsGateway.notifyFolioUpdate).toHaveBeenCalled();
    });

    it('should mark folio as SETTLED when full payment is received', async () => {
      const folio = {
        id: 'folio-1',
        tenantId,
        propertyId,
        reservationId: 'res-1',
        totalCharges: 250,
        totalPayments: 100,
        balanceDue: 150,
        status: FolioStatus.OPEN,
      };

      const folioRepo = {
        findOne: jest.fn().mockResolvedValue(folio),
        save: jest.fn().mockImplementation((f) => Promise.resolve(f)),
      };
      const paymentRepo = {
        count: jest.fn().mockResolvedValue(12),
        save: jest.fn().mockResolvedValue({}),
      };

      mockDataSource.getRepository.mockImplementation((entity: any) => {
        if (entity === GuestFolio) return folioRepo;
        if (entity === FolioPayment) return paymentRepo;
        return {};
      });

      const updated = await service.postFolioPayment(tenantId, propertyId, 'res-1', {
        paymentMethod: 'CARD',
        amount: 150,
      });

      expect(updated.totalPayments).toBe(250);
      expect(updated.balanceDue).toBe(0);
      expect(updated.status).toBe(FolioStatus.SETTLED);
    });
  });

  describe('5. Check-Out Lifecycle & Housekeeping Turnaround', () => {
    it('should block check-out if folio has an unpaid balance', async () => {
      const reservation = {
        id: 'res-1',
        tenantId,
        propertyId,
        status: ReservationStatus.CHECKED_IN,
        roomId: 'room-1',
      };
      const folio = {
        reservationId: 'res-1',
        balanceDue: 45.0, // Unpaid balance
        status: FolioStatus.OPEN,
      };

      const resRepo = {
        findOne: jest.fn().mockResolvedValue(reservation),
      };
      const folioRepo = {
        findOne: jest.fn().mockResolvedValue(folio),
      };

      mockQueryRunner.manager.getRepository.mockImplementation((entity: any) => {
        if (entity === Reservation) return resRepo;
        if (entity === GuestFolio) return folioRepo;
        return {};
      });

      await expect(
        service.checkOut(tenantId, propertyId, 'res-1', userId),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should successfully check out guest, settle folio, and release room as AVAILABLE + DIRTY for housekeeping', async () => {
      const reservation = {
        id: 'res-1',
        tenantId,
        propertyId,
        status: ReservationStatus.CHECKED_IN,
        roomId: 'room-1',
        room: { roomNumber: '201' },
      };
      const folio = {
        reservationId: 'res-1',
        balanceDue: 0.0,
        status: FolioStatus.OPEN,
      };

      const resRepo = {
        findOne: jest.fn().mockResolvedValue(reservation),
        save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
      };
      const folioRepo = {
        findOne: jest.fn().mockResolvedValue(folio),
        save: jest.fn().mockImplementation((f) => Promise.resolve(f)),
      };
      const roomRepo = {
        update: jest.fn().mockResolvedValue({}),
      };
      const auditRepo = {
        save: jest.fn().mockResolvedValue({}),
      };

      mockQueryRunner.manager.getRepository.mockImplementation((entity: any) => {
        if (entity === Reservation) return resRepo;
        if (entity === GuestFolio) return folioRepo;
        if (entity === Room) return roomRepo;
        return auditRepo;
      });

      const result = await service.checkOut(tenantId, propertyId, 'res-1', userId);

      expect(result.success).toBe(true);
      expect(result.reservation.status).toBe(ReservationStatus.CHECKED_OUT);
      expect(folio.status).toBe(FolioStatus.SETTLED);
      expect(roomRepo.update).toHaveBeenCalledWith('room-1', {
        status: RoomStatus.AVAILABLE,
        cleanlinessStatus: CleanlinessStatus.DIRTY,
      });
      expect(mockEventsGateway.notifyRoomStatusUpdate).toHaveBeenCalledWith(
        propertyId,
        expect.objectContaining({
          status: RoomStatus.AVAILABLE,
          cleanlinessStatus: CleanlinessStatus.DIRTY,
        }),
      );
    });
  });
});
