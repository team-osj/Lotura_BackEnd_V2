import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceService } from '../device/device.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'client',
})
export class ClientGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ClientGateway.name);
  private connectedClients: Map<string, Socket> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly deviceService: DeviceService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('deviceStatus')
  async handleDeviceStatus(client: Socket, payload: any) {
    const { deviceId, status } = payload;
    await this.deviceService.updateStatus(deviceId, status);
    this.server.emit('deviceStatusUpdate', { deviceId, status });
  }
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'device',
})
export class DeviceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DeviceGateway.name);
  private connectedDevices: Map<string, Socket> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly deviceService: DeviceService,
  ) {}

  async handleConnection(client: Socket) {
    const auth = client.handshake.auth;
    if (!this.validateAuth(auth)) {
      client.disconnect();
      return;
    }

    this.logger.log(`Device connected: ${client.id}`);
    this.connectedDevices.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Device disconnected: ${client.id}`);
    this.connectedDevices.delete(client.id);
  }

  private validateAuth(auth: any): boolean {
    const username = this.configService.get('AUTH_USERNAME');
    const password = this.configService.get('AUTH_PASSWORD');
    return auth.username === username && auth.password === password;
  }

  @SubscribeMessage('status')
  async handleStatus(client: Socket, payload: any) {
    const { deviceId, status } = payload;
    await this.deviceService.updateStatus(deviceId, status);
    this.server.emit('statusUpdate', { deviceId, status });
  }
} 