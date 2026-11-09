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
  Headers,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { ChannelManagerService } from './channel-manager.service';
import { ChannelCode, SyncJobType } from '../entities';
import { ICalAdapter } from './adapters/ical.adapter';
import { DataSource, In } from 'typeorm';
import { RoomType, Reservation, ReservationStatus, Property } from '../entities';

@Controller('api/channel-manager')
export class ChannelManagerController {
  constructor(
    private readonly channelManagerService: ChannelManagerService,
    private readonly icalAdapter: ICalAdapter,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 1. Dashboard metrics
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.getDashboardOverview(tenantId, propertyId);
  }

  /**
   * 2. Channel connections
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('connections')
  async getConnections(@Req() req: any) {
    const { tenantId, propertyId } = req.user;
    const overview = await this.channelManagerService.getDashboardOverview(tenantId, propertyId);
    return overview.channels;
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('connections/:channelCode')
  async getConnection(@Req() req: any, @Param('channelCode') channelCode: ChannelCode) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.getConnection(tenantId, propertyId, channelCode);
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
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.updateConnection(
      tenantId,
      propertyId,
      channelCode,
      body,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:channelCode/test')
  async testConnection(@Req() req: any, @Param('channelCode') channelCode: ChannelCode) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.testConnection(tenantId, propertyId, channelCode);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:channelCode/disconnect')
  async disconnectChannel(@Req() req: any, @Param('channelCode') channelCode: ChannelCode) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.disconnectChannel(tenantId, propertyId, channelCode);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:channelCode/reconnect')
  async reconnectChannel(@Req() req: any, @Param('channelCode') channelCode: ChannelCode) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.reconnectChannel(tenantId, propertyId, channelCode);
  }

  /**
   * 3. Room mappings
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('connections/:connectionId/room-mappings')
  async getRoomMappings(@Req() req: any, @Param('connectionId') connectionId: string) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.getRoomMappings(tenantId, propertyId, connectionId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:connectionId/room-mappings')
  async saveRoomMapping(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Body() body: any,
  ) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.saveRoomMapping(tenantId, propertyId, connectionId, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Delete('connections/:connectionId/room-mappings/:mappingId')
  async deleteRoomMapping(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Param('mappingId') mappingId: string,
  ) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.deleteRoomMapping(tenantId, propertyId, connectionId, mappingId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('connections/:connectionId/auto-suggest-rooms')
  async autoSuggestRooms(@Req() req: any, @Param('connectionId') connectionId: string) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.autoSuggestRoomMappings(
      tenantId,
      propertyId,
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
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.getRatePlanMappings(tenantId, propertyId, connectionId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:connectionId/rate-plan-mappings')
  async saveRatePlanMapping(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Body() body: any,
  ) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.saveRatePlanMapping(tenantId, propertyId, connectionId, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Delete('connections/:connectionId/rate-plan-mappings/:mappingId')
  async deleteRatePlanMapping(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Param('mappingId') mappingId: string,
  ) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.deleteRatePlanMapping(tenantId, propertyId, connectionId, mappingId);
  }

  /**
   * 5. Pricing rules
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('connections/:connectionId/pricing-rules')
  async getPricingRules(@Req() req: any, @Param('connectionId') connectionId: string) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.getPricingRules(tenantId, propertyId, connectionId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('connections/:connectionId/pricing-rules')
  async savePricingRule(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Body() body: any,
  ) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.savePricingRule(tenantId, propertyId, connectionId, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Delete('connections/:connectionId/pricing-rules/:ruleId')
  async deletePricingRule(
    @Req() req: any,
    @Param('connectionId') connectionId: string,
    @Param('ruleId') ruleId: string,
  ) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.deletePricingRule(tenantId, propertyId, connectionId, ruleId);
  }

  /**
   * 6. Availability & restrictions calendar
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Get('availability-grid')
  async getAvailabilityGrid(@Req() req: any, @Query('days') days?: string) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.getAvailabilityGrid(
      tenantId,
      propertyId,
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
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.triggerSync(
      tenantId,
      propertyId,
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
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.getChannelReservations(
      tenantId,
      propertyId,
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
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.getSyncLogs(
      tenantId,
      propertyId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('channel_manager')
  @Post('logs/:jobId/retry')
  async retryJob(@Req() req: any, @Param('jobId') jobId: string) {
    const { tenantId, propertyId } = req.user;
    return this.channelManagerService.retryFailedJob(tenantId, propertyId, jobId);
  }

  /**
   * 10. Public outbound iCal feed URL for external OTAs to poll calendar blocks
   */
  @Get('ical/export/:roomTypeId')
  async exportIcsFeed(@Param('roomTypeId') roomTypeId: string, @Res() res: Response) {
    const roomType = await this.dataSource.getRepository(RoomType).findOne({
      where: { id: roomTypeId },
      relations: { property: true },
    });
    if (!roomType) {
      return res.status(404).send('Room type not found');
    }

    const reservations = await this.dataSource.getRepository(Reservation).find({
      where: {
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
        // Mask guest PII on public iCal calendar feeds
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
