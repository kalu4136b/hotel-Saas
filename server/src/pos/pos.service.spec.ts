import { Test, TestingModule } from '@nestjs/testing';
import { PosService } from './pos.service';
import { DataSource } from 'typeorm';
import { EventsGateway } from '../events/events.gateway';
import {
  Order,
  OrderStatus,
  OrderType,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Bill,
  BillStatus,
  DiningTable,
  TableStatus,
  Reservation,
  ReservationStatus,
  GuestFolio,
  FolioStatus,
  FolioItem,
  FolioChargeType,
} from '../entities';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PosService — POS & Room Folio Cross-Module Settlement Tests', () => {
  let service: PosService;
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
        count: jest.fn().mockResolvedValue(10),
      },
    };

    mockDataSource = {
      getRepository: jest.fn(),
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    mockEventsGateway = {
      notifyTableUpdate: jest.fn(),
      notifyOrderUpdate: jest.fn(),
      notifyFolioUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<PosService>(PosService);
  });

  describe('settlePayment with ROOM_CHARGE', () => {
    const mockOrder: any = {
      id: 'order-1',
      tenantId,
      propertyId,
      orderNumber: 'ORD-1001',
      totalAmount: 75.0,
      tableNumber: 'T-02',
      tableId: 'table-2',
      orderType: OrderType.DINE_IN,
      status: OrderStatus.SERVED,
    };

    const mockBill: any = {
      id: 'bill-1',
      orderId: 'order-1',
      totalAmount: 75.0,
      status: BillStatus.PENDING,
    };

    it('should reject room charge settlement if roomId is not provided', async () => {
      mockQueryRunner.manager.findOne.mockImplementation((entity: any) => {
        if (entity === Order) return Promise.resolve(mockOrder);
        if (entity === Bill) return Promise.resolve(mockBill);
        return Promise.resolve(null);
      });

      await expect(
        service.settlePayment(
          tenantId,
          propertyId,
          'order-1',
          {
            paymentMethod: PaymentMethod.ROOM_CHARGE,
            amountPaid: 75.0,
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject room charge settlement if no checked-in guest is found in the room', async () => {
      mockQueryRunner.manager.findOne.mockImplementation((entity: any) => {
        if (entity === Order) return Promise.resolve(mockOrder);
        if (entity === Bill) return Promise.resolve(mockBill);
        if (entity === Reservation) return Promise.resolve(null); // No reservation
        return Promise.resolve(null);
      });

      await expect(
        service.settlePayment(
          tenantId,
          propertyId,
          'order-1',
          {
            paymentMethod: PaymentMethod.ROOM_CHARGE,
            amountPaid: 75.0,
            roomId: 'empty-room',
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully post restaurant charge to guest folio and reopen settled folio', async () => {
      const activeReservation = {
        id: 'res-active',
        roomId: 'room-304',
        status: ReservationStatus.CHECKED_IN,
        guest: { fullName: 'Angela Vance' },
        room: { roomNumber: '304' },
      };

      const existingFolio: any = {
        id: 'folio-angela',
        reservationId: 'res-active',
        totalCharges: 500.0,
        totalPayments: 500.0,
        balanceDue: 0.0,
        status: FolioStatus.SETTLED, // Was settled
      };

      const mockTable: any = {
        id: 'table-2',
        status: TableStatus.OCCUPIED,
      };

      mockQueryRunner.manager.findOne.mockImplementation((entity: any) => {
        if (entity === Order) return Promise.resolve({ ...mockOrder });
        if (entity === Bill) return Promise.resolve({ ...mockBill });
        if (entity === Reservation) return Promise.resolve(activeReservation);
        if (entity === GuestFolio) return Promise.resolve(existingFolio);
        if (entity === DiningTable) return Promise.resolve(mockTable);
        return Promise.resolve(null);
      });

      mockQueryRunner.manager.create.mockImplementation((entity: any, dto: any) => dto);
      mockQueryRunner.manager.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await service.settlePayment(
        tenantId,
        propertyId,
        'order-1',
        {
          paymentMethod: PaymentMethod.ROOM_CHARGE,
          amountPaid: 75.0,
          roomId: 'room-304',
        },
        userId,
      );

      expect(existingFolio.totalCharges).toBe(575.0); // 500 + 75
      expect(existingFolio.balanceDue).toBe(75.0);
      expect(existingFolio.status).toBe(FolioStatus.OPEN); // Reopened from SETTLED!
      expect(result.order.status).toBe(OrderStatus.PAID);
      expect(result.payment.paymentMethod).toBe(PaymentMethod.ROOM_CHARGE);
      expect(mockEventsGateway.notifyFolioUpdate).toHaveBeenCalledWith(
        propertyId,
        expect.objectContaining({ id: 'folio-angela' }),
      );
    });
  });
});
