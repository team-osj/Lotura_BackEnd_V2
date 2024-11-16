import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'ws';
import { Injectable } from '@nestjs/common';
import { ExtendedWebSocket } from './types/websocket.types';

@WebSocketGateway({
  path: '/client',
})
@Injectable()
export class ClientWebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients: Set<ExtendedWebSocket> = new Set();
  private heartbeatInterval: NodeJS.Timer;

  constructor() {
    this.setupHeartbeat();
  }

  private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.connectedClients.forEach((client) => {
        if (!client.isAlive) {
          client.terminate();
          this.connectedClients.delete(client);
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 50000);
  }

  async handleConnection(client: ExtendedWebSocket) {
    client.isAlive = true;
    client.on('pong', () => {
      client.isAlive = true;
    });

    this.connectedClients.add(client);
  }

  async handleDisconnect(client: ExtendedWebSocket) {
    this.connectedClients.delete(client);
  }

  broadcastToClients(data: any) {
    this.connectedClients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}
