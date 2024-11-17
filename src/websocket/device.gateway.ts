import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'ws';
import { Injectable } from '@nestjs/common';
import { ExtendedWebSocket } from './types/websocket.types';

interface ConnectedDevice {
  ws: ExtendedWebSocket;
  hwid: string;
  ch1: string;
  ch2: string;
  isAlive: boolean;
}

@WebSocketGateway({
  path: '/device',
})
@Injectable()
export class DeviceWebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedDevices: Map<string, ConnectedDevice> = new Map();

  async handleConnection(client: ExtendedWebSocket, request: any) {
    const hwid = request.headers['hwid'];
    const ch1 = request.headers['ch1'];
    const ch2 = request.headers['ch2'];

    console.log(`[Device][Connected] [${hwid},${ch1},${ch2}]`);

    client.isAlive = true;

    this.connectedDevices.set(hwid, {
      ws: client,
      hwid,
      ch1,
      ch2,
      isAlive: true,
    });

    client.on('pong', () => {
      const device = this.connectedDevices.get(hwid);
      if (device) {
        device.ws.isAlive = true;
      }
    });
  }

  async handleDisconnect(client: ExtendedWebSocket) {
    for (const [hwid, device] of this.connectedDevices.entries()) {
      if (device.ws === client) {
        console.log(
          `[Device][Disconnected] [${device.hwid},${device.ch1},${device.ch2}]`,
        );
        this.connectedDevices.delete(hwid);
        break;
      }
    }
  }
}
