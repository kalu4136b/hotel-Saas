import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import {
  ChannelConnection,
  ChannelConnectionStatus,
  ChannelCode,
  ChannelWebhookEvent,
  WebhookEventStatus,
  ChannelSyncLog,
  SyncOperationType,
  SyncLogStatus,
} from '../../entities';
import { ChannelManagerService } from '../channel-manager.service';
import { SyncEngineService } from '../services/sync-engine.service';
import { ChannelEncryptionService } from '../services/encryption.service';

@Controller('api/channel-manager/webhooks')
export class ChannelWebhookController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly channelManagerService: ChannelManagerService,
    private readonly syncEngineService: SyncEngineService,
    private readonly encryptionService: ChannelEncryptionService,
  ) {}

  @Post(':channelCode/:connectionId')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('channelCode') channelCodeStr: string,
    @Param('connectionId') connectionId: string,
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    const channelCode = channelCodeStr.toUpperCase() as ChannelCode;
    const connRepo = this.dataSource.getRepository(ChannelConnection);
    const eventRepo = this.dataSource.getRepository(ChannelWebhookEvent);
    const logRepo = this.dataSource.getRepository(ChannelSyncLog);

    const connection = await connRepo.findOne({
      where: { id: connectionId, channelCode },
    });

    if (!connection) {
      throw new NotFoundException('Target channel connection not found');
    }

    if (connection.status === ChannelConnectionStatus.DISABLED) {
      throw new UnauthorizedException('Channel connection is currently disabled');
    }

    // Verify webhook secret if configured on the connection or environment
    const creds: any = connection.encryptedCredentials
      ? this.encryptionService.decryptObject(connection.encryptedCredentials) || {}
      : {};
    const expectedSecret = creds.webhookSecret || process.env.CHANNEL_WEBHOOK_SECRET;
    if (expectedSecret) {
      const providedSecret =
        headers['x-webhook-secret'] ||
        headers['x-channel-secret'] ||
        (headers['authorization'] || '').replace(/^Bearer\s+/i, '');

      const expectedBuf = Buffer.from(String(expectedSecret));
      const providedBuf = Buffer.from(String(providedSecret || ''));
      if (
        expectedBuf.length !== providedBuf.length ||
        !crypto.timingSafeEqual(expectedBuf, providedBuf)
      ) {
        throw new UnauthorizedException('Invalid or missing webhook signature secret');
      }
    }

    const adapter = this.syncEngineService.getAdapter(channelCode);
    if (!adapter || !adapter.processWebhook) {
      throw new BadRequestException(`Webhooks not supported for channel ${channelCode}`);
    }

    const startTime = Date.now();
    const result = await adapter.processWebhook(payload, headers);

    const eventId =
      result.externalReservationId ||
      headers['x-event-id'] ||
      `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 1. Idempotency Check
    const existingEvent = await eventRepo.findOne({
      where: { connectionId: connection.id, eventId },
    });

    if (existingEvent) {
      return { status: 'DUPLICATE_IGNORED', eventId };
    }

    // 2. Record Webhook Event
    const event = eventRepo.create({
      connectionId: connection.id,
      channelCode,
      eventId,
      eventType: result.eventType || 'NOTIFICATION',
      status: WebhookEventStatus.RECEIVED,
      payloadJson: JSON.stringify(payload),
    });
    await eventRepo.save(event);

    // 3. Process Reservation Action
    let processOutcome = 'PROCESSED';
    try {
      if (
        (result.actionRequired === 'CREATE_RESERVATION' ||
          result.actionRequired === 'CANCEL_RESERVATION') &&
        result.reservationData
      ) {
        await this.channelManagerService.ingestExternalReservation(
          connection.tenantId,
          connection.propertyId,
          connection.id,
          result.reservationData,
        );
      }

      event.status = WebhookEventStatus.PROCESSED;
      await eventRepo.save(event);

      await logRepo.save({
        tenantId: connection.tenantId,
        propertyId: connection.propertyId,
        connectionId: connection.id,
        channelCode,
        operation: SyncOperationType.WEBHOOK_RECEIVE,
        status: SyncLogStatus.SUCCESS,
        httpStatusCode: 200,
        durationMs: Date.now() - startTime,
        requestPayload: JSON.stringify(payload).slice(0, 5000),
        responsePayload: JSON.stringify({ status: 'ACKNOWLEDGED', eventId }),
        errorMessage: null,
      });

      return {
        acknowledged: true,
        eventId,
        message: result.message || 'Webhook successfully received and processed',
      };
    } catch (err: any) {
      event.status = WebhookEventStatus.FAILED;
      event.errorMessage = err.message;
      await eventRepo.save(event);

      await logRepo.save({
        tenantId: connection.tenantId,
        propertyId: connection.propertyId,
        connectionId: connection.id,
        channelCode,
        operation: SyncOperationType.WEBHOOK_RECEIVE,
        status: SyncLogStatus.FAILED,
        httpStatusCode: 500,
        durationMs: Date.now() - startTime,
        requestPayload: JSON.stringify(payload).slice(0, 5000),
        responsePayload: null,
        errorMessage: err.message,
      });

      throw err;
    }
  }
}
