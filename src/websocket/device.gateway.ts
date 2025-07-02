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
import { Socket } from 'socket.io';

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
    // 하트비트 비활성화 (개발/테스트 환경용)
    // this.heartbeatInterval = setInterval(() => {
    //   this.connectedDevices.forEach((device, hwid) => {
    //     if (!device.ws.isAlive) {
    //       this.logger.log(`Heartbeat failed for device ${hwid}`);
    //       device.ws.terminate();
    //       this.connectedDevices.delete(hwid);
    //       return;
    //     }
    //     device.ws.isAlive = false;
    //     device.ws.ping();
    //   });
    // }, 300000); // 5분으로 변경 (60초 → 300초)

    this.logger.log('Heartbeat disabled for development/testing');
  }

  async handleConnection(client: ExtendedWebSocket, req: IncomingMessage) {
    try {
      const deviceId = this.getDeviceIdFromRequest(req);
      if (!deviceId) {
        client.close(1008, 'Device ID not provided');
        return;
      }

      const ch1 = req.headers['ch1'] as string;
      const ch2 = req.headers['ch2'] as string;

      // 연결된 디바이스 목록에 추가
      this.connectedDevices.set(deviceId, {
        ws: client,
        hwid: deviceId,
        ch1: ch1,
        ch2: ch2,
        isAlive: true,
        lastMessage: Date.now(),
        status: 1,
      });

      // pong 이벤트 핸들러 추가 (하트비트 응답)
      // client.on('pong', () => {
      //   const device = this.connectedDevices.get(deviceId);
      //   if (device) {
      //     device.isAlive = true;
      //     device.lastMessage = Date.now();
      //   }
      // });

      // 메시지 이벤트 핸들러 추가
      client.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleDeviceMessage(deviceId, message);

          // 메시지 수신 시 isAlive 업데이트
          const device = this.connectedDevices.get(deviceId);
          if (device) {
            device.isAlive = true;
            device.lastMessage = Date.now();
          }
        } catch (error) {
          this.logger.error(`[Device][Message Parse Error] ${error.message}`);
        }
      });

      // 하드웨어 연결 시 해당 하드웨어의 모든 채널 디바이스를 사용 가능 상태로 설정
      if (ch1) {
        await this.deviceService.updateConnectionStatus(parseInt(ch1), 1); // 연결됨, 사용 가능
      }
      if (ch2) {
        await this.deviceService.updateConnectionStatus(parseInt(ch2), 1); // 연결됨, 사용 가능
      }

      this.logger.log(
        `[Device][Connected] HWID: ${deviceId}, CH1: ${ch1}, CH2: ${ch2}`,
      );

      // 클라이언트에게 디바이스 상태 변경 알림
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

        // 하드웨어 연결 해제 시 해당 하드웨어의 모든 채널 디바이스를 연결 끊김 상태로 설정
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

        // 클라이언트에게 연결 해제 알림
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

    // 메시지 전체 내용 로깅 (디버깅용)
    this.logger.log(
      `[Device][Message Received] HWID: ${hwid}, Message: ${JSON.stringify(
        message,
      )}`,
    );

    // 상태 업데이트 메시지 처리
    if (message.title === 'Update') {
      this.logger.log(
        `[Device][Update] ID: ${message.id} Status: ${message.state}`,
      );

      const deviceId = parseInt(message.id, 10);

      // NaN 검사 추가
      if (isNaN(deviceId)) {
        this.logger.error(`[Device][Error] Invalid device ID: ${message.id}`);
        return;
      }

      // 현재 디바이스의 연결 상태 확인
      const currentDevice = await this.deviceService.findOne(deviceId);
      if (!currentDevice) {
        this.logger.error(`[Device][Error] Device not found: ${deviceId}`);
        return;
      }

      // 연결이 끊어진 상태(2)에서는 상태 업데이트 무시
      if (currentDevice.state === 2) {
        this.logger.warn(
          `[Device][Warning] Device ${deviceId} is disconnected, ignoring status update`,
        );
        return;
      }

      // boolean 상태를 숫자로 변환 (true -> 0: 작동중, false -> 1: 사용 가능)
      // 숫자도 지원: 0 -> 0(작동중), 1 -> 1(사용가능)
      let state: number;

      // 디버깅 로그 추가
      this.logger.log(
        `[Device][Debug] Original state: ${
          message.state
        }, Type: ${typeof message.state}`,
      );

      if (typeof message.state === 'boolean') {
        state = message.state === true ? 0 : 1;
        this.logger.log(
          `[Device][Debug] Boolean conversion: ${message.state} -> ${state}`,
        );
      } else if (typeof message.state === 'number') {
        state = message.state; // 0 또는 1 그대로 사용
        this.logger.log(
          `[Device][Debug] Number conversion: ${message.state} -> ${state}`,
        );
      } else {
        // 기본값: false -> 1(사용가능)
        state = 1;
        this.logger.log(
          `[Device][Debug] Default conversion: ${message.state} -> ${state}`,
        );
      }

      this.logger.log(`[Device][Debug] Final state value: ${state}`);

      // 디바이스 상태 업데이트 및 시간 기록
      await this.deviceService.updateStatus(deviceId, state);

      // 클라이언트가 요청한 상태로 변경되었을 때만 FCM 메시지 전송
      if (state === 1) {
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
  async handleDeviceDisconnect(client: Socket) {
    const deviceId = this.connectedDevices.get(client.id);
    if (deviceId) {
      this.logger.log(`[Device][Disconnected] [${deviceId}]`);
      this.connectedDevices.delete(client.id);
      // 연결이 끊어졌을 때 prev_state에 기존 state 저장, state를 2로 변경
      const device = await this.deviceService.findOne(Number(deviceId));
      if (device) {
        await this.deviceService.update(Number(deviceId), {
          prev_state: device.state,
        }); // prev_state 저장
        await this.deviceService.updateStatus(Number(deviceId), 2); // state를 2로 변경
        // 클라이언트에게 연결 해제 알림만 전송
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
      status: 1,
    });

    try {
      const device = await this.deviceService.findOne(Number(deviceId));
      if (device) {
        // state가 2라면 prev_state로 복원, 아니면 기존 state 사용
        const newState = device.state === 2 ? device.prev_state : device.state;
        await this.deviceService.updateStatus(Number(deviceId), newState);
        // 클라이언트에게 디바이스 상태 변경 알림
        this.server.emit('deviceStatusChanged', {
          deviceId: Number(deviceId),
          status: newState,
          timestamp: new Date().toISOString(),
        });
        // FCM 푸시 알림도 상태가 1(사용가능)로 바뀔 때만 전송
        if (newState === 1) {
          await this.pushService.sendPushNotification(
            {
              title: '세탁기 재연결',
              body: `세탁기 ${deviceId}번이 다시 연결되었습니다.`,
              deviceId: Number(deviceId),
              deviceType: 'WASH', // 기본값으로 세탁기 타입 설정
            },
            1, // expectState: 1 (온라인 상태)
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
