import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { ChannelManagerService } from './channel-manager.service';
import { ChannelCode, SyncJobType } from '../entities';
import { ICalAdapter } from './adapters/ical.adapter';
import { DataSource, In } from 'typeorm';
import { RoomType, Reservation, ReservationStatus } from '../entities';
import { TenantConnectionManager } from '../database/tenant-connection-manager.service';

@Controller('api/channel-manager')
export class ChannelManagerController {
  constructor(
    private readonly channelManagerService: ChannelManagerService,
    private readonly icalAdapter: ICalAdapter,
    private readonly tenantConn: TenantConnectionManager,
  ) {}

  private getPropId(req: any): string | undefined {
    return req.user?.propertyId || req.user?.property?.id;
  }

  /**
   * 1. Dashboard metrics
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    return this.channelManagerService.getDashboardOverview(
      req.user.tenantId,
      this.getPropId(req)!,
    );
  }

  /**
   * 2. Channel connections
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('connections')
  async getConnections(@Req() req: any) {
    const overview = await this.channelManagerService.getDashboardOverview(
      req.user.tenantId,
      this.getPropId(req)!,
    );
    return overview.channels;
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('connections/:channelCode')
  async getConnection(@Req() req: any, @Param('channelCode') channelCode: ChannelCode) {
    return this.channelManagerService.getConnection(
      req.user.tenantId,
      this.getPropId(req)!,
      channelCode,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Put('connections/:channelCode')
  async updateConnection(
    @Req() req: any,
    @Param('channelCode') channelCode: ChannelCode,
    @Body()
    body: {
      credentials: any;
      externalPropertyId?: string;
      autoSyncEnabled?: boolean;
    },
  ) {
    return this.channelManagerService.updateConnection(
      req.user.tenantId,
      this.getPropId(req)!,
      channelCode,
      body,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:channelCode/test')
  async testConnection(@Req() req: any, @Param('channelCode') channelCode: ChannelCode) {
    return this.channelManagerService.testConnection(
      req.user.tenantId,
      this.getPropId(req)!,
      channelCode,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:channelCode/disconnect')
  async disconnectChannel(@Req() req: any, @Param('channelCode') channelCode: ChannelCode) {
    return this.channelManagerService.disconnectChannel(
      req.user.tenantId,
      this.getPropId(req)!,
      channelCode,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:channelCode/reconnect')
  async reconnectChannel(@Req() req: any, @Param('channelCode') channelCode: ChannelCode) {
    return this.channelManagerService.reconnectChannel(
      req.user.tenantId,
      this.getPropId(req)!,
      channelCode,
    );
  }

  /**
   * 3. Room mappings
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('connections/:connectionId/room-mappings')
  async getRoomMappings(@Req() req: any, @Param('connectionId') connectionId: string) {
    return this.channelManagerService.getRoomMappings(
      req.user.tenantId,
      this.getPropId(req)!,
      connectionId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:connectionId/room-mappings')
  async saveRoomMapping(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Body() body: any,
  ) {
    return this.channelManagerService.saveRoomMapping(
      req.user.tenantId,
      this.getPropId(req)!,
      connectionId,
      body,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Delete('connections/:connectionId/room-mappings/:mappingId')
  async deleteRoomMapping(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Param('mappingId') mappingId: string,
  ) {
    return this.channelManagerService.deleteRoomMapping(
      req.user.tenantId,
      this.getPropId(req)!,
      connectionId,
      mappingId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('connections/:connectionId/auto-suggest-rooms')
  async autoSuggestRooms(@Req() req: any, @Param('connectionId') connectionId: string) {
    return this.channelManagerService.autoSuggestRoomMappings(
      req.user.tenantId,
      this.getPropId(req)!,
      connectionId,
    );
  }

  /**
   * 4. Rate plan mappings
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('connections/:connectionId/rate-plan-mappings')
  async getRatePlanMappings(@Req() req: any, @Param('connectionId') connectionId: string) {
    return this.channelManagerService.getRatePlanMappings(
      req.user.tenantId,
      this.getPropId(req)!,
      connectionId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:connectionId/rate-plan-mappings')
  async saveRatePlanMapping(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Body() body: any,
  ) {
    return this.channelManagerService.saveRatePlanMapping(
      req.user.tenantId,
      this.getPropId(req)!,
      connectionId,
      body,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Delete('connections/:connectionId/rate-plan-mappings/:mappingId')
  async deleteRatePlanMapping(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Param('mappingId') mappingId: string,
  ) {
    return this.channelManagerService.deleteRatePlanMapping(
      req.user.tenantId,
      this.getPropId(req)!,
      connectionId,
      mappingId,
    );
  }

  /**
   * 5. Pricing rules
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('connections/:connectionId/pricing-rules')
  async getPricingRules(@Req() req: any, @Param('connectionId') connectionId: string) {
    return this.channelManagerService.getPricingRules(
      req.user.tenantId,
      this.getPropId(req)!,
      connectionId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:connectionId/pricing-rules')
  async savePricingRule(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Body() body: any,
  ) {
    return this.channelManagerService.savePricingRule(
      req.user.tenantId,
      this.getPropId(req)!,
      connectionId,
      body,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Delete('connections/:connectionId/pricing-rules/:ruleId')
  async deletePricingRule(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.channelManagerService.deletePricingRule(
      req.user.tenantId,
      this.getPropId(req)!,
      connectionId,
      ruleId,
    );
  }

  /**
   * 6. Availability & restrictions calendar
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('availability-grid')
  async getAvailabilityGrid(@Req() req: any, @Query('days') days?: string) {
    return this.channelManagerService.getAvailabilityGrid(
      req.user.tenantId,
      this.getPropId(req)!,
      days ? parseInt(days, 10) : 14,
    );
  }

  /**
   * 7. Trigger sync
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:channelCode/sync')
  async triggerSync(
    @Req() req: any,
    @Param('channelCode') channelCode: ChannelCode,
    @Body('jobType') jobType?: SyncJobType,
  ) {
    return this.channelManagerService.triggerSync(
      req.user.tenantId,
      this.getPropId(req)!,
      channelCode,
      jobType || SyncJobType.FULL_SYNC,
    );
  }

  /**
   * 8. Channel reservations
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('reservations')
  async getReservations(
    @Req() req: any,
    @Query('channelCode') channelCode?: string,
    @Query('search') search?: string,
  ) {
    return this.channelManagerService.getChannelReservations(
      req.user.tenantId,
      this.getPropId(req)!,
      channelCode,
      search,
    );
  }

  /**
   * 9. Sync logs & retry
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('logs')
  async getSyncLogs(@Req() req: any, @Query('limit') limit?: string) {
    return this.channelManagerService.getSyncLogs(
      req.user.tenantId,
      this.getPropId(req)!,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('logs/:jobId/retry')
  async retryJob(@Req() req: any, @Param('jobId') jobId: string) {
    return this.channelManagerService.retryFailedJob(
      req.user.tenantId,
      this.getPropId(req)!,
      jobId,
    );
  }

  /**
   * 10. Public outbound iCal feed URL for external OTAs to poll calendar blocks
   */
  @Get('ical/export/:roomTypeId')
  async exportIcsFeed(@Param('roomTypeId') roomTypeId: string, @Res() res: Response) {
    const sources = await this.tenantConn.getAllActiveDataSources();
    let matchedDs: DataSource | null = null;
    let roomType: RoomType | null = null;

    for (const ds of sources) {
      const found = await ds.getRepository(RoomType).findOne({
        where: { id: roomTypeId },
        relations: { property: true },
      });
      if (found) {
        matchedDs = ds;
        roomType = found;
        break;
      }
    }

    if (!roomType || !matchedDs) {
      return res.status(404).send('Room type not found');
    }

    const reservations = await matchedDs.getRepository(Reservation).find({
      where: {
        tenantId: roomType.tenantId,
        propertyId: roomType.propertyId,
        roomTypeId,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]),
      },
    });

    const icsContent = this.icalAdapter.generateIcsFeed(
      roomType.property?.name || 'Hotel',
      roomType.name,
      reservations.map((r) => ({
        id: r.id,
        reservationNumber: r.reservationNumber,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        guestName: 'Reserved Stay',
      })),
    );

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="calendar-${roomType.code || 'feed'}.ics"`,
    );
    return res.send(icsContent);
  }
}
