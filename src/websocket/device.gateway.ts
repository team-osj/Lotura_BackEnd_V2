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
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';
import { PushService } from '../push/push.service';
import { DeviceLogService } from '../device/device-log.service';
import { IncomingMessage } from 'http';

interface ConnectedDevice {
  ws: ExtendedWebSocket;
  hwid: string;
  ch1: string;
  ch2: string;
  isAlive: boolean;
  lastMessage?: number;
  status?: number;
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

  async handleConnection(client: ExtendedWebSocket, req: IncomingMessage) {
    try {
      const deviceId = this.getDeviceIdFromRequest(req);
      if (!deviceId) {
        client.close(1008, 'Device ID not provided');
        return;
      }

      // 디바이스 상태를 온라인(1)으로 업데이트
      await this.deviceService.updateStatus(Number(deviceId), 1, 0);
      
      // 연결된 디바이스 목록에 추가
      this.connectedDevices.set(deviceId, {
        ws: client,
        hwid: deviceId,
        ch1: req.headers['ch1'] as string,
        ch2: req.headers['ch2'] as string,
        isAlive: true,
        lastMessage: Date.now(),
        status: 1
      });

      this.logger.log(`[Device][Connected] [${Array.from(this.connectedDevices.keys()).join(',')}]`);

      // 클라이언트에게 디바이스 상태 변경 알림
      this.server.emit('deviceStatusChanged', {
        deviceId: Number(deviceId),
        status: 1,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error(`[Device][Connection] Error: ${error.message}`);
      client.close(1011, 'Internal server error');
    }
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
      const deviceId = parseInt(message.id, 10);

      // NaN 검사 추가
      if (isNaN(deviceId)) {
        this.logger.error(`[Device][Error] Invalid device ID: ${message.id}`);
        return;
      }

      // boolean 상태를 숫자로 변환 (true -> 1, false -> 0)
      const state = message.state === true ? 1 : 0;

      // 디바이스 상태 업데이트 및 시간 기록
      await this.deviceService.updateStatus(deviceId, state, type);

      // 클라이언트가 요청한 상태로 변경되었을 때만 FCM 메시지 전송
      if (state === 1 && type === 1) {
        try {
          const device = await this.deviceService.findOne(deviceId);
          if (device) {
            const deviceType = await this.deviceService.getDeviceType(deviceId);
            const typeString = deviceType === 'WASH' ? '세탁기' : '건조기';

            // 사용 시간 계산
            const onTime = device.ON_time;
            const offTime = moment().format();
            const hourDiff = moment(offTime).diff(moment(onTime), 'hours');
            const minuteDiff =
              moment(offTime).diff(moment(onTime), 'minutes') - hourDiff * 60;
            const secondDiff =
              moment(offTime).diff(moment(onTime), 'seconds') -
              minuteDiff * 60 -
              hourDiff * 3600;

            // FCM 메시지 전송
            await this.pushService.sendPushNotification(
              {
                title: `${typeString} 알림`,
                body: `${deviceId}번 ${typeString}의 동작이 완료되었습니다.\r\n동작시간 : ${hourDiff}시간 ${minuteDiff}분 ${secondDiff}초`,
                deviceId: deviceId,
                deviceType: deviceType,
              },
              state, // expect_state
            );

            // 알림 신청 삭제
            await this.pushService.deletePushAlert(deviceId, state);
          }
        } catch (error) {
          this.logger.error(
            `[Device][FCM Error] Failed to send push notification: ${error.message}`,
          );
        }
      }

      // 클라이언트에게 브로드캐스트
      this.clientGateway.broadcastToClients({
        type: 'device_status_update',
        id: deviceId,
        state: state,
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

  @SubscribeMessage('disconnect')
  async handleDeviceDisconnect(@MessageBody() message: { id: string }) {
    const deviceId = message.id;
    if (!deviceId) {
      this.logger.error(`[Device][Disconnect] Invalid device ID: ${message.id}`);
      return;
    }

    this.logger.log(`[Device][Disconnect] Device ${deviceId} disconnected`);
    this.connectedDevices.delete(deviceId);

    try {
      // 디바이스 상태를 오프라인(2)으로 업데이트
      await this.deviceService.updateStatus(Number(deviceId), 2, 0);
      
      // 클라이언트에게 디바이스 상태 변경 알림
      this.server.emit('deviceStatusChanged', {
        deviceId: Number(deviceId),
        status: 2,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error(`[Device][Disconnect] Error updating device status: ${error.message}`);
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
      status: 1
    });

    try {
      // 디바이스 상태를 온라인(1)으로 업데이트
      await this.deviceService.updateStatus(Number(deviceId), 1, 0);
      
      // 클라이언트에게 디바이스 상태 변경 알림
      this.server.emit('deviceStatusChanged', {
        deviceId: Number(deviceId),
        status: 1,
        timestamp: new Date().toISOString()
      });

      // FCM 푸시 알림 전송
      await this.pushService.sendPushNotification({
        title: '세탁기 재연결',
        body: `세탁기 ${deviceId}번이 다시 연결되었습니다.`,
        deviceId: Number(deviceId),
        deviceType: 'WASH' // 기본값으로 세탁기 타입 설정
      }, 1); // expectState: 1 (온라인 상태)
    } catch (error) {
      this.logger.error(`[Device][Connect] Error updating device status: ${error.message}`);
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
