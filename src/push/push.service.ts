import { Injectable, Logger } from '@nestjs/common';
import { PushAlertService } from './push-alert.service';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { PushAlert } from '../entities/push-alert.entity';
import * as moment from 'moment';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly pushAlertService: PushAlertService,
    private readonly configService: ConfigService,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(PushAlert)
    private readonly pushAlertRepository: Repository<PushAlert>,
  ) {
    // Firebase Admin 초기화
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: this.configService.get('FIREBASE_PROJECT_ID'),
        clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
        privateKey: this.configService
          .get('FIREBASE_PRIVATE_KEY')
          .replace(/\\n/g, '\n'),
      }),
    });
  }

  async getDevicePushAlerts(deviceId: number) {
    const pushAlerts = await this.pushAlertService.findByDeviceId(deviceId);
    return pushAlerts;
  }

  async sendPushNotification(deviceId: string, message: string): Promise<void> {
    try {
      const pushAlerts = await this.pushAlertService.findByDeviceId(
        parseInt(deviceId),
      );

      if (!pushAlerts || pushAlerts.length === 0 || !pushAlerts[0].token) {
        this.logger.warn(
          `Device ${deviceId} not found or no FCM token available`,
        );
        return;
      }

      const payload = {
        notification: {
          title: 'Lotura',
          body: message,
        },
        data: {
          device_id: deviceId,
          timestamp: new Date().toISOString(),
        },
        token: pushAlerts[0].token,
        android: {
          priority: 'high' as const,
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().send(payload);
      this.logger.log(
        `Successfully sent message to device ${deviceId}: ${response}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to device ${deviceId}:`,
        error,
      );
      throw error;
    }
  }

  async sendMulticastPushNotification(
    tokens: string[],
    title: string,
    body: string,
  ): Promise<void> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        tokens,
        android: {
          priority: 'high' as const,
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
          }
        });
        this.logger.warn(`Failed to send to tokens: ${failedTokens}`);
      }
    } catch (error) {
      this.logger.error('Failed to send multicast push notification:', error);
      throw error;
    }
  }

  async handleDeviceStatusUpdate(
    deviceId: number,
    state: number,
    type: number,
  ): Promise<void> {
    if (deviceId === 0) return;

    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      this.logger.warn(`Device ${deviceId} not found`);
      return;
    }

    const typeString = device.device_type === 'WASH' ? '세탁기' : '건조기';

    // 디바이스 상태 업데이트
    await this.deviceRepository.update(deviceId, {
      state,
      prev_state: state,
    });

    // 푸시 알림 상태 업데이트
    await this.pushAlertRepository.update({ device_id: deviceId }, { state });

    if (state === 0 && type === 1) {
      // ON 상태일 때
      await this.deviceRepository.update(deviceId, {
        ON_time: moment().format(),
      });
    } else if (state === 1 && type === 1) {
      // OFF 상태일 때
      await this.deviceRepository.update(deviceId, {
        OFF_time: moment().format(),
      });

      const deviceWithTimes = await this.deviceRepository.findOne({
        where: { id: deviceId },
      });

      if (deviceWithTimes) {
        const hourDiff = moment(deviceWithTimes.OFF_time).diff(
          moment(deviceWithTimes.ON_time),
          'hours',
        );
        const minuteDiff =
          moment(deviceWithTimes.OFF_time).diff(
            moment(deviceWithTimes.ON_time),
            'minutes',
          ) -
          hourDiff * 60;
        const secondDiff =
          moment(deviceWithTimes.OFF_time).diff(
            moment(deviceWithTimes.ON_time),
            'seconds',
          ) -
          minuteDiff * 60 -
          hourDiff * 3600;

        // 알림 신청된 토큰 조회
        const pushAlerts = await this.pushAlertRepository.find({
          where: {
            device_id: deviceId,
            expect_status: state,
          },
        });

        if (pushAlerts.length > 0) {
          const tokens = pushAlerts.map((alert) => alert.token);
          const message = `${deviceId}번 ${typeString}의 동작이 완료되었습니다.\r\n동작시간 : ${hourDiff}시간 ${minuteDiff}분 ${secondDiff}초`;

          await this.sendMulticastPushNotification(
            tokens,
            `${typeString} 알림`,
            message,
          );

          // 알림 전송 후 해당 알림 삭제
          await this.pushAlertRepository.delete({
            device_id: deviceId,
            expect_status: state,
          });
        }
      }
    }
  }
}
