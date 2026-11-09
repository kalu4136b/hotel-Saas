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
import { JwtService } from '@nestjs/jwt';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.CORS_ORIGIN || 'http://localhost:3000',
    ],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('EventsGateway');

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const rawToken =
        client.handshake?.auth?.token ||
        (client.handshake?.headers?.authorization || '').replace(/^Bearer\s+/i, '');

      if (!rawToken) {
        this.logger.warn(`Rejected unauthenticated socket connection: ${client.id}`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(rawToken);
      client.data.user = payload;

      if (payload?.propertyId) {
        const room = `property_${payload.propertyId}`;
        client.join(room);
      }
      this.logger.log(`Authenticated socket connected: ${client.id} (user: ${payload?.username})`);
    } catch (err: any) {
      this.logger.warn(`Socket JWT verification failed (${client.id}): ${err?.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:property')
  handleJoinProperty(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { propertyId: string },
  ) {
    const user = client.data?.user;
    if (!user) {
      client.disconnect(true);
      return;
    }

    if (
      data?.propertyId &&
      (user.role === 'SUPER_ADMIN' || user.propertyId === data.propertyId)
    ) {
      const room = `property_${data.propertyId}`;
      client.join(room);
      this.logger.log(`Socket ${client.id} joined room ${room}`);
      return { event: 'joined', room };
    }
  }

  // Kitchen Order Ticket (KOT) Events — scoped strictly to the tenant property room
  notifyNewKot(propertyId: string, kot: any) {
    const room = `property_${propertyId}`;
    this.server.to(room).emit('events:kot:new', kot);
    this.logger.log(`Dispatched events:kot:new for property ${propertyId} (KOT #${kot.kotNumber})`);
  }

  notifyKotStatusUpdate(propertyId: string, kot: any) {
    const room = `property_${propertyId}`;
    this.server.to(room).emit('events:kot:updated', kot);
    this.logger.log(`Dispatched events:kot:updated for property ${propertyId} (KOT #${kot.kotNumber})`);
  }

  // Room & Housekeeping Events — scoped strictly to the tenant property room
  notifyRoomStatusUpdate(propertyId: string, roomData: any) {
    const room = `property_${propertyId}`;
    this.server.to(room).emit('events:room:updated', roomData);
    this.logger.log(`Dispatched events:room:updated for Room ${roomData.roomNumber}`);
  }

  // Guest Folio Events — scoped strictly to the tenant property room
  notifyFolioUpdate(propertyId: string, folioData: any) {
    const room = `property_${propertyId}`;
    this.server.to(room).emit('events:folio:updated', folioData);
    this.logger.log(`Dispatched events:folio:updated for Folio #${folioData.id || ''}`);
  }
}
