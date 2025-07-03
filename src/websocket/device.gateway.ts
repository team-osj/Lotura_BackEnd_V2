import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'ws';
import { Injectable, Logger } from '@nestjs/common';
import { ExtendedWebSocket } from './types/websocket.types';
import { DeviceService } from '../device/device.service';
import { ClientWebsocketGateway } from './client.gateway';
import { PushService } from '../push/push.service';
import { DeviceLogService } from '../device/device-log.service';
import { IncomingMessage } from 'http';
import { Socket } from 'socket.io';
import * as moment from 'moment';

interface ConnectedDevice {
  ws: ExtendedWebSocket;
  hwid: string;
  ch1: string;
  ch2: string;
  isAlive: boolean;
  lastMessage?: number;
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

  constructor(
    private readonly deviceService: DeviceService,
    private readonly clientGateway: ClientWebsocketGateway,
    private readonly pushService: PushService,
    private readonly deviceLogService: DeviceLogService,
  ) {}

  async handleConnection(client: ExtendedWebSocket, req: IncomingMessage) {
    try {
      const deviceId = this.getDeviceIdFromRequest(req);
      if (!deviceId) {
        client.close(1008, 'Device ID not provided');
        return;
      }

      const ch1 = req.headers['ch1'] as string;
      const ch2 = req.headers['ch2'] as string;

      this.connectedDevices.set(deviceId, {
        ws: client,
        hwid: deviceId,
        ch1: ch1,
        ch2: ch2,
        isAlive: true,
        lastMessage: Date.now(),
      });

      client.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleDeviceMessage(deviceId, message);

          const device = this.connectedDevices.get(deviceId);
          if (device) {
            device.isAlive = true;
            device.lastMessage = Date.now();
          }
        } catch (error) {
          this.logger.error(`[Device][Message Parse Error] ${error.message}`);
        }
      });

      if (ch1) {
        await this.deviceService.updateConnectionStatus(parseInt(ch1), 1);
      }
      if (ch2) {
        await this.deviceService.updateConnectionStatus(parseInt(ch2), 1);
      }

      this.logger.log(
        `[Device][Connected] HWID: ${deviceId}, CH1: ${ch1}, CH2: ${ch2}`,
      );

      if (ch1) {
        this.server.emit('deviceStatusChanged', {
          deviceId: Number(ch1),
          status: 1,
          timestamp: new Date().toISOString(),
        });
      }
      if (ch2) {
        this.server.emit('deviceStatusChanged', {
          deviceId: Number(ch2),
          status: 1,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`[Device][Connection] Error: ${error.message}`);
      client.close(1011, 'Internal server error');
    }
  }

  async handleDisconnect(client: ExtendedWebSocket) {
    for (const [hwid, device] of this.connectedDevices.entries()) {
      if (device.ws === client) {
        this.logger.log(
          `[Device][Disconnected] HWID: ${device.hwid}, CH1: ${device.ch1}, CH2: ${device.ch2}`,
        );
        this.connectedDevices.delete(hwid);

        if (device.ch1) {
          await this.deviceService.updateConnectionStatus(
            parseInt(device.ch1),
            2,
          );
        }
        if (device.ch2) {
          await this.deviceService.updateConnectionStatus(
            parseInt(device.ch2),
            2,
          );
        }

        if (device.ch1) {
          this.server.emit('deviceStatusChanged', {
            deviceId: Number(device.ch1),
            status: 2,
            timestamp: new Date().toISOString(),
          });
        }
        if (device.ch2) {
          this.server.emit('deviceStatusChanged', {
            deviceId: Number(device.ch2),
            status: 2,
            timestamp: new Date().toISOString(),
          });
        }
        break;
      }
    }
  }

  private async handleDeviceMessage(hwid: string, message: any) {
    const device = this.connectedDevices.get(hwid);
    if (!device) return;

    if (message.title === 'Update') {
      const deviceId = parseInt(message.id, 10);

      if (isNaN(deviceId)) {
        this.logger.error(`[Device][Error] Invalid device ID: ${message.id}`);
        return;
      }

      const currentDevice = await this.deviceService.findOne(deviceId);
      if (!currentDevice) {
        this.logger.error(`[Device][Error] Device not found: ${deviceId}`);
        return;
      }

      if (currentDevice.state === 2) {
        this.logger.warn(
          `[Device][Warning] Device ${deviceId} is disconnected, ignoring status update`,
        );
        return;
      }

      let state: number;
      if (typeof message.state === 'boolean') {
        state = message.state === true ? 0 : 1;
      } else if (typeof message.state === 'number') {
        state = message.state;
      } else {
        state = 1;
      }

      await this.deviceService.updateStatus(deviceId, state);
      await this.deviceService.update(deviceId, {
        prev_state: state,
      });

      if (state === 1) {
        try {
          const device = await this.deviceService.findOne(deviceId);
          if (device) {
            const deviceType = await this.deviceService.getDeviceType(deviceId);
            const typeString = deviceType === 'WASH' ? '세탁기' : '건조기';

            const onTime = device.ON_time;
            const offTime = moment().format();
            const hourDiff = moment(offTime).diff(moment(onTime), 'hours');
            const minuteDiff =
              moment(offTime).diff(moment(onTime), 'minutes') - hourDiff * 60;
            const secondDiff =
              moment(offTime).diff(moment(onTime), 'seconds') -
              minuteDiff * 60 -
              hourDiff * 3600;

            await this.pushService.sendPushNotification(
              {
                title: `${typeString} 알림`,
                body: `${deviceId}번 ${typeString}의 동작이 완료되었습니다.\r\n동작시간 : ${hourDiff}시간 ${minuteDiff}분 ${secondDiff}초`,
                deviceId: deviceId,
                deviceType: deviceType,
              },
              state,
            );

            await this.pushService.deletePushAlert(deviceId, state);
          }
        } catch (error) {
          this.logger.error(
            `[Device][FCM Error] Failed to send push notification: ${error.message}`,
          );
        }
      }

      this.clientGateway.broadcastToClients({
        type: 'device_status_update',
        id: deviceId,
        state: state,
        device_type: await this.deviceService.getDeviceType(deviceId),
      });
    } else if (message.title === 'GetData') {
      message.ch1_current = parseFloat(message.ch1_current).toFixed(2);
      message.ch2_current = parseFloat(message.ch2_current).toFixed(2);
    } else if (message.title === 'Log') {
      const deviceId = Number(message.id);

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

  @SubscribeMessage('disconnect')
  async handleDeviceDisconnect(client: Socket) {
    const deviceId = this.connectedDevices.get(client.id);
    if (deviceId) {
      this.logger.log(`[Device][Disconnected] [${deviceId}]`);
      this.connectedDevices.delete(client.id);
      const device = await this.deviceService.findOne(Number(deviceId));
      if (device) {
        await this.deviceService.updateStatus(Number(deviceId), 2);
        this.server.emit('deviceStatus', {
          deviceId: Number(deviceId),
          status: 2,
          isOnline: false,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  @SubscribeMessage('connect')
  async handleDeviceConnection(@MessageBody() message: { id: string }) {
    const deviceId = message.id;
    if (!deviceId) {
      this.logger.error(`[Device][Connect] Invalid device ID: ${message.id}`);
      return;
    }

    this.logger.log(`[Device][Connect] Device ${deviceId} connected`);
    this.connectedDevices.set(deviceId, {
      ws: null,
      hwid: deviceId,
      ch1: '',
      ch2: '',
      isAlive: true,
      lastMessage: Date.now(),
    });

    try {
      const device = await this.deviceService.findOne(Number(deviceId));
      if (device) {
        const newState =
          device.state === 2 ? Number(device.prev_state) : device.state;

        await this.deviceService.restoreConnectionStatus(
          Number(deviceId),
          newState,
        );

        this.server.emit('deviceStatusChanged', {
          deviceId: Number(deviceId),
          status: newState,
          timestamp: new Date().toISOString(),
        });

        if (newState === 1) {
          await this.pushService.sendPushNotification(
            {
              title: '세탁기 재연결',
              body: `세탁기 ${deviceId}번이 다시 연결되었습니다.`,
              deviceId: Number(deviceId),
              deviceType: 'WASH',
            },
            1,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `[Device][Connect] Error updating device status: ${error.message}`,
      );
    }
  }

  private getDeviceIdFromRequest(req: IncomingMessage): string | null {
    const hwid = req.headers['hwid'];
    const ch1 = req.headers['ch1'];
    const ch2 = req.headers['ch2'];

    if (hwid && ch1 && ch2) {
      return Array.isArray(hwid) ? hwid[0] : hwid;
    }
    return null;
  }
}
