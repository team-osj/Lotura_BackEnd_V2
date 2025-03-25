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
import { ClientWebsocketGateway } from './client.gateway';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';
import { PushService } from '../push/push.service';
import { DeviceLogService } from '../device/device-log.service';

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

  private readonly logger = new Logger(DeviceWebsocketGateway.name);
  private connectedDevices: Map<string, ConnectedDevice> = new Map();
  private deviceLog: Map<string, any> = new Map();
  private heartbeatInterval: NodeJS.Timer;

  constructor(
    private readonly deviceService: DeviceService,
    private readonly clientGateway: ClientWebsocketGateway,
    private readonly configService: ConfigService,
    private readonly pushService: PushService,
    private readonly deviceLogService: DeviceLogService,
  ) {
    this.setupHeartbeat();
  }

  private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.connectedDevices.forEach((device, hwid) => {
        if (!device.ws.isAlive) {
          this.logger.log(`Heartbeat failed for device ${hwid}`);
          device.ws.terminate();
          this.connectedDevices.delete(hwid);
          return;
        }
        device.ws.isAlive = false;
        device.ws.ping();
      });
    }, 15000);
  }

  async handleConnection(client: ExtendedWebSocket, request: any) {
    const hwid = request.headers['hwid'];
    const ch1 = request.headers['ch1'];
    const ch2 = request.headers['ch2'];

    this.logger.log(`[Device][Connected] [${hwid},${ch1},${ch2}]`);

    // 기존 연결된 기기가 있으면 연결 종료
    const prevDevice = this.connectedDevices.get(hwid);
    if (prevDevice) {
      prevDevice.ws.terminate();
      this.connectedDevices.delete(hwid);
      this.logger.log(`Previous connection for device ${hwid} was terminated`);
    }

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

    // 메시지 수신 이벤트 핸들러 설정
    client.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleDeviceMessage(hwid, message);
      } catch (error) {
        this.logger.error(`[Device][Message Error] ${error.message}`);
      }
    });
  }

  async handleDisconnect(client: ExtendedWebSocket) {
    for (const [hwid, device] of this.connectedDevices.entries()) {
      if (device.ws === client) {
        this.logger.log(
          `[Device][Disconnected] [${device.hwid},${device.ch1},${device.ch2}]`,
        );
        this.connectedDevices.delete(hwid);

        // 연결 해제 시 디바이스 상태 업데이트 (2: disconnected)
        await this.deviceService.updateStatus(parseInt(device.ch1), 2, 0);
        await this.deviceService.updateStatus(parseInt(device.ch2), 2, 0);
        break;
      }
    }
  }

  private async handleDeviceMessage(hwid: string, message: any) {
    const device = this.connectedDevices.get(hwid);
    if (!device) return;

    // 메시지 전체 내용 로깅 (디버깅용)
    this.logger.log(
      `[Device][Message Received] HWID: ${hwid}, Message: ${JSON.stringify(message)}`,
    );

    // 상태 업데이트 메시지 처리
    if (message.title === 'Update') {
      this.logger.log(
        `[Device][Update] ID: ${message.id} Status: ${message.state}`,
      );

      const type = message.type !== undefined ? message.type : 1;
      const deviceId = Number(message.id);

      // NaN 검사 추가
      if (isNaN(deviceId)) {
        this.logger.error(`[Device][Error] Invalid device ID: ${message.id}`);
        return;
      }

      // 디바이스 상태 업데이트
      await this.deviceService.updateStatus(deviceId, message.state, type);

      // 클라이언트에게 브로드캐스트
      this.clientGateway.broadcastToClients({
        type: 'device_status_update',
        id: deviceId,
        state: message.state,
        device_type: await this.deviceService.getDeviceType(deviceId),
      });
    }
    // 디바이스 데이터 요청 처리
    else if (message.title === 'GetData') {
      this.logger.log(`[Device][GetData] HWID: ${hwid}`);

      message.ch1_current = parseFloat(message.ch1_current).toFixed(2);
      message.ch2_current = parseFloat(message.ch2_current).toFixed(2);
    }
    // 로그 처리
    else if (message.title === 'Log') {
      const deviceId = Number(message.id);

      // NaN 검사 추가
      if (isNaN(deviceId)) {
        this.logger.error(
          `[Device][Error] Invalid device ID in log: ${message.id}`,
        );
        return;
      }

      try {
        const jsonLog = JSON.parse(message.log);

        if (jsonLog.START) {
          jsonLog.START.local_time = moment().format();
        }

        const logKey = `${hwid}_${deviceId}`;
        const existingLog = this.deviceLog.get(logKey);

        if (!existingLog) {
          this.deviceLog.set(logKey, jsonLog);
        } else {
          // 기존 로그와 병합
          const mergedLog = { ...existingLog, ...jsonLog };
          this.deviceLog.set(logKey, mergedLog);
        }

        const updatedLog = this.deviceLog.get(logKey);
        if (updatedLog && updatedLog.END) {
          updatedLog.END.local_time = moment().format();

          if (updatedLog.START) {
            await this.deviceLogService.saveLog(
              hwid,
              deviceId,
              updatedLog.START.local_time,
              updatedLog.END.local_time,
              JSON.stringify(updatedLog),
            );

            this.deviceLog.delete(logKey);
          }
        }
      } catch (error) {
        this.logger.error(
          `[Device][Log Error] Failed to parse log: ${error.message}`,
        );
      }
    }
  }

  sendToDevice(hwid: string, data: any) {
    const device = this.connectedDevices.get(hwid);
    if (device && device.ws.readyState === device.ws.OPEN) {
      device.ws.send(JSON.stringify(data));
    }
  }

  getAllConnectedDevices(): Array<{ hwid: string; ch1: string; ch2: string }> {
    try {
      const devices = [];
      this.connectedDevices.forEach((device) => {
        if (device && device.hwid && device.ch1 && device.ch2) {
          devices.push({
            hwid: device.hwid,
            ch1: device.ch1,
            ch2: device.ch2,
          });
        }
      });
      return devices;
    } catch (error) {
      this.logger.error(`Error getting connected devices: ${error.message}`);
      return [];
    }
  }
}
