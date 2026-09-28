import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('EventsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:property')
  handleJoinProperty(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { propertyId: string },
  ) {
    if (data?.propertyId) {
      const room = `property_${data.propertyId}`;
      client.join(room);
      this.logger.log(`Socket ${client.id} joined room ${room}`);
      return { event: 'joined', room };
    }
  }

  // Kitchen Order Ticket (KOT) Events
  notifyNewKot(propertyId: string, kot: any) {
    const room = `property_${propertyId}`;
    this.server.to(room).emit('events:kot:new', kot);
    // Also emit broadcast as fallback
    this.server.emit('events:kot:new', kot);
    this.logger.log(`Dispatched events:kot:new for property ${propertyId} (KOT #${kot.kotNumber})`);
  }

  notifyKotStatusUpdate(propertyId: string, kot: any) {
    const room = `property_${propertyId}`;
    this.server.to(room).emit('events:kot:updated', kot);
    this.server.emit('events:kot:updated', kot);
    this.logger.log(`Dispatched events:kot:updated for property ${propertyId} (KOT #${kot.kotNumber})`);
  }

  // Room & Housekeeping Events
  notifyRoomStatusUpdate(propertyId: string, roomData: any) {
    const room = `property_${propertyId}`;
    this.server.to(room).emit('events:room:updated', roomData);
    this.server.emit('events:room:updated', roomData);
    this.logger.log(`Dispatched events:room:updated for Room ${roomData.roomNumber}`);
  }

  // Guest Folio Events
  notifyFolioUpdate(propertyId: string, folioData: any) {
    const room = `property_${propertyId}`;
    this.server.to(room).emit('events:folio:updated', folioData);
    this.server.emit('events:folio:updated', folioData);
    this.logger.log(`Dispatched events:folio:updated for Folio #${folioData.id || ''}`);
  }
}
