import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { PmsService } from './pms.service';
import { CleanlinessStatus, RoomStatus, FolioChargeType } from '../entities';

@Controller('api/pms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('pms_hub', 'pms_rooms', 'pms_housekeeping', 'pms_reservations', 'pms_front_desk', 'pos')
export class PmsController {
  constructor(private readonly pmsService: PmsService) {}

  private getPropId(req: any): string | undefined {
    return req.user?.propertyId || req.user?.property?.id;
  }

  private getUserId(req: any): string {
    return req.user?.id || req.user?.userId;
  }

  // 1. Room Types
  @Get('room-types')
  getRoomTypes(@Request() req: any) {
    return this.pmsService.getRoomTypes(req.user.tenantId, this.getPropId(req)!);
  }

  @Post('room-types')
  createRoomType(
    @Request() req: any,
    @Body()
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
    return this.pmsService.createRoomType(req.user.tenantId, this.getPropId(req)!, dto);
  }

  // 2. Rooms & Cleanliness
  @Get('rooms')
  getRooms(@Request() req: any) {
    return this.pmsService.getRooms(req.user.tenantId, this.getPropId(req)!);
  }

  @Post('rooms')
  createRoom(
    @Request() req: any,
    @Body()
    dto: {
      roomTypeId: string;
      roomNumber: string;
      floor?: number;
      notes?: string;
    },
  ) {
    return this.pmsService.createRoom(req.user.tenantId, this.getPropId(req)!, dto);
  }

  @Patch('rooms/:id/cleanliness')
  updateCleanliness(
    @Request() req: any,
    @Param('id') roomId: string,
    @Body('status') status: CleanlinessStatus,
  ) {
    return this.pmsService.updateCleanliness(
      req.user.tenantId,
      this.getPropId(req)!,
      roomId,
      status,
    );
  }

  @Post('rooms/bulk-cleanliness')
  bulkUpdateCleanliness(
    @Request() req: any,
    @Body('roomIds') roomIds: string[],
    @Body('status') status: CleanlinessStatus,
  ) {
    return this.pmsService.bulkUpdateCleanliness(
      req.user.tenantId,
      this.getPropId(req)!,
      roomIds,
      status,
    );
  }

  @Patch('rooms/:id/notes')
  updateRoomNotes(
    @Request() req: any,
    @Param('id') roomId: string,
    @Body('notes') notes: string,
  ) {
    return this.pmsService.updateRoomNotes(
      req.user.tenantId,
      this.getPropId(req)!,
      roomId,
      notes,
    );
  }

  @Patch('rooms/:id/occupancy')
  updateOccupancy(
    @Request() req: any,
    @Param('id') roomId: string,
    @Body('status') status: RoomStatus,
  ) {
    return this.pmsService.updateOccupancyStatus(
      req.user.tenantId,
      this.getPropId(req)!,
      roomId,
      status,
    );
  }

  // 3. Guests
  @Get('guests')
  getGuests(@Request() req: any) {
    return this.pmsService.getGuests(req.user.tenantId, this.getPropId(req)!);
  }

  @Post('guests')
  createGuest(
    @Request() req: any,
    @Body()
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
    return this.pmsService.createGuest(req.user.tenantId, this.getPropId(req)!, dto);
  }

  // 4. Reservations
  @Get('reservations')
  getReservations(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.pmsService.getReservations(
      req.user.tenantId,
      this.getPropId(req)!,
      status,
      search,
    );
  }

  @Post('reservations')
  createReservation(
    @Request() req: any,
    @Body()
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
  ) {
    return this.pmsService.createReservation(
      req.user.tenantId,
      this.getPropId(req)!,
      dto,
      this.getUserId(req),
    );
  }

  // 5. Check-In & Check-Out
  @Post('reservations/:id/check-in')
  checkIn(
    @Request() req: any,
    @Param('id') reservationId: string,
    @Body('roomId') roomId: string,
  ) {
    return this.pmsService.checkIn(
      req.user.tenantId,
      this.getPropId(req)!,
      reservationId,
      roomId,
      this.getUserId(req),
    );
  }

  @Post('reservations/:id/check-out')
  checkOut(
    @Request() req: any,
    @Param('id') reservationId: string,
  ) {
    return this.pmsService.checkOut(
      req.user.tenantId,
      this.getPropId(req)!,
      reservationId,
      this.getUserId(req),
    );
  }

  // 6. Folios & In-Room Charges
  @Get('folios/:reservationId')
  getFolio(
    @Request() req: any,
    @Param('reservationId') reservationId: string,
  ) {
    return this.pmsService.getFolio(
      req.user.tenantId,
      this.getPropId(req)!,
      reservationId,
    );
  }

  @Post('folios/:reservationId/charges')
  postFolioCharge(
    @Request() req: any,
    @Param('reservationId') reservationId: string,
    @Body()
    dto: {
      chargeType: FolioChargeType;
      description: string;
      amount: number;
      referenceId?: string;
    },
  ) {
    return this.pmsService.postFolioCharge(
      req.user.tenantId,
      this.getPropId(req)!,
      reservationId,
      dto,
    );
  }

  @Post('folios/:reservationId/payments')
  postFolioPayment(
    @Request() req: any,
    @Param('reservationId') reservationId: string,
    @Body()
    dto: {
      paymentMethod: string;
      amount: number;
      receiptNumber?: string;
    },
  ) {
    return this.pmsService.postFolioPayment(
      req.user.tenantId,
      this.getPropId(req)!,
      reservationId,
      dto,
    );
  }
}
