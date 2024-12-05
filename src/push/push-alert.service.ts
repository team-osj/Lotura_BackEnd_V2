import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushAlert } from '../entities/push-alert.entity';
import { Device } from '../entities/device.entity';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushAlertService {
  constructor(
    @InjectRepository(PushAlert)
    private pushAlertRepository: Repository<PushAlert>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private configService: ConfigService,
  ) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: configService.get('FIREBASE_PROJECT_ID'),
          clientEmail: configService.get('FIREBASE_CLIENT_EMAIL'),
          privateKey: configService
            .get('FIREBASE_PRIVATE_KEY')
            .replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async requestPushAlert(
    token: string,
    device_id: number,
    expect_state: number,
  ) {
    const existing = await this.pushAlertRepository.findOne({
      where: {
        Token: token,
        device_id: device_id,
        Expect_Status: expect_state,
      },
    });

    if (existing) {
      throw new HttpException(
        '이미 알람을 신청한 기기입니다.',
        HttpStatus.NOT_MODIFIED,
      );
    }

    const device = await this.deviceRepository.findOne({
      where: { id: device_id },
    });

    if (!device) {
      throw new HttpException(
        '존재하지 않는 장치입니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    const pushAlert = this.pushAlertRepository.create({
      Token: token,
      device_id: device_id,
      Expect_Status: expect_state,
      device_type: device.device_type,
      state: device.state,
    });

    await this.pushAlertRepository.save(pushAlert);
    return { message: '알림 신청 성공.' };
  }

  async getPushList(token: string) {
    return this.pushAlertRepository.find({
      where: { Token: token },
      order: { device_id: 'ASC' },
      select: ['device_id', 'device_type', 'state'],
    });
  }

  async cancelPushAlert(token: string, device_id: number) {
    await this.pushAlertRepository.delete({
      Token: token,
      device_id: device_id,
    });
    return this.getPushList(token);
  }

  async sendFcmToAll(title: string, body: string) {
    try {
      const pushAlerts = await this.pushAlertRepository.find();
      const uniqueTokens = [...new Set(pushAlerts.map((alert) => alert.Token))];

      const sendPromises = uniqueTokens.map((token) => {
        const message = {
          token,
          notification: {
            title,
            body,
          },
          android: {
            priority: 'high' as const,
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                alert: {
                  title,
                  body,
                },
                sound: 'default',
                badge: 1,
                contentAvailable: true,
              },
            },
          },
        };

        return admin.messaging().send(message);
      });

      await Promise.all(sendPromises);
      return { success: true, sentCount: uniqueTokens.length };
    } catch (error) {
      console.error('FCM 전송 에러:', error);
      throw new HttpException(
        'FCM 메시지 전송 실패',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
