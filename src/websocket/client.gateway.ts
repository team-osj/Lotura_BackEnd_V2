import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'ws';
import { Injectable, Logger } from '@nestjs/common';
import { ExtendedWebSocket } from './types/websocket.types';
import { DeviceService } from '../device/device.service';

@WebSocketGateway({
  path: '/client',
})
@Injectable()
export class ClientWebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ClientWebsocketGateway.name);
  private connectedClients: Map<string, ExtendedWebSocket> = new Map();
  private heartbeatInterval: NodeJS.Timer;

  constructor(private readonly deviceService: DeviceService) {
    this.setupHeartbeat();
  }

  private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.connectedClients.forEach((client, id) => {
        if (!client.isAlive) {
          this.logger.log(`Heartbeat failed for client ${id}`);
          client.terminate();
          this.connectedClients.delete(id);
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 50000);
  }

  async handleConnection(client: ExtendedWebSocket, request: any) {
    const clientId =
      request.headers['sec-websocket-key'] ||
      Math.random().toString(36).substring(2, 15);
    this.logger.log(`Client connected: ${clientId}`);

    client.isAlive = true;
    this.connectedClients.set(clientId, client);

    client.on('pong', () => {
      client.isAlive = true;
    });

    // 클라이언트 연결 시 모든 디바이스 정보를 자동으로 전송
    try {
      const allDevices = await this.deviceService.getAllDevices();
      const deviceStatusMessage = {
        type: 'initial_device_status',
        devices: allDevices.map(device => ({
          id: device.id,
          state: device.state,
          device_type: device.device_type,
          view_id: device.view_id,
          room_type: device.room_type
        }))
      };

      client.send(JSON.stringify(deviceStatusMessage));
      this.logger.log(`Sent initial device status to client ${clientId}: ${allDevices.length} devices`);
    } catch (error) {
      this.logger.error(`Failed to send initial device status to client ${clientId}: ${error.message}`);
    }

    client.on('message', async (data: string) => {
      try {
        // 필요에 따라 클라이언트 메시지 처리 로직 추가
        this.logger.log(`Client message received: ${data}`);
      } catch (error) {
        this.logger.error(`Client message error: ${error.message}`);
      }
    });
  }

  async handleDisconnect(client: ExtendedWebSocket) {
    for (const [clientId, ws] of this.connectedClients.entries()) {
      if (ws === client) {
        this.logger.log(`Client disconnected: ${clientId}`);
        this.connectedClients.delete(clientId);
        break;
      }
    }
  }

  broadcastToClients(message: any) {
    const data = JSON.stringify(message);
    this.logger.log(`Broadcasting to clients: ${data}`);

    this.connectedClients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(data);
      }
    });
  }
}
