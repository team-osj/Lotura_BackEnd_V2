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

  async findAll(): Promise<PushAlert[]> {
    return this.pushAlertRepository.find();
  }

  async findByDeviceId(deviceId: number): Promise<PushAlert[]> {
    return this.pushAlertRepository.find({
      where: { device_id: deviceId },
    });
  }

  async create(
    deviceId: number,
    token: string,
    expectStatus: number,
  ): Promise<PushAlert> {
    const pushAlert = this.pushAlertRepository.create({
      device_id: deviceId,
      token: token,
      expect_status: expectStatus,
    });
    return this.pushAlertRepository.save(pushAlert);
  }

  async updateToken(oldToken: string, newToken: string): Promise<void> {
    await this.pushAlertRepository.update(
      { token: oldToken },
      { token: newToken },
    );
  }

  async getUniqueTokens(): Promise<string[]> {
    const pushAlerts = await this.pushAlertRepository.find();
    const uniqueTokens = [...new Set(pushAlerts.map((alert) => alert.token))];
    return uniqueTokens;
  }

  async sendFcmToAll(title: string, body: string): Promise<void> {
    const tokens = await this.getUniqueTokens();
    if (tokens.length === 0) return;

    const message = {
      notification: {
        title,
        body,
      },
      tokens,
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log('FCM 전송 결과:', response);
    } catch (error) {
      console.error('FCM 전송 실패:', error);
    }
  }

  async findByToken(token: string): Promise<PushAlert[]> {
    return this.pushAlertRepository.find({
      where: { token: token },
    });
  }

  async updateDeviceId(token: string, deviceId: number): Promise<void> {
    await this.pushAlertRepository.update(
      { token: token },
      { device_id: deviceId },
    );
  }

  async createOrUpdate(
    deviceId: number,
    token: string,
    expectStatus: number,
  ): Promise<PushAlert> {
    const existingAlert = await this.pushAlertRepository.findOne({
      where: { token: token },
    });

    if (existingAlert) {
      return this.pushAlertRepository.save({
        ...existingAlert,
        device_id: deviceId,
        expect_status: expectStatus,
      });
    }

    const pushAlert = this.pushAlertRepository.create({
      device_id: deviceId,
      token: token,
      expect_status: expectStatus,
    });
    return this.pushAlertRepository.save(pushAlert);
  }

  async getTokensByDeviceId(deviceId: number): Promise<string[]> {
    const pushAlerts = await this.pushAlertRepository.find({
      where: { device_id: deviceId },
    });
    const uniqueTokens = [...new Set(pushAlerts.map((alert) => alert.token))];
    return uniqueTokens;
  }

  async requestPushAlert(
    token: string,
    deviceId: number,
    expectStatus: number,
  ) {
    const existing = await this.pushAlertRepository.findOne({
      where: {
        token: token,
        device_id: deviceId,
      },
    });

    if (existing) {
      throw new HttpException(
        '이미 알람을 신청한 기기입니다.',
        HttpStatus.NOT_MODIFIED,
      );
    }

    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new HttpException(
        '존재하지 않는 장치입니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    const pushAlert = this.pushAlertRepository.create({
      token: token,
      device_id: deviceId,
      expect_status: expectStatus,
    });

    await this.pushAlertRepository.save(pushAlert);
    return { message: '알림 신청 성공.' };
  }

  async getPushList(token: string) {
    return this.pushAlertRepository.find({
      where: { token: token },
      order: { device_id: 'ASC' },
      select: ['device_id'],
    });
  }

  async cancelPushAlert(token: string, deviceId: number) {
    await this.pushAlertRepository.delete({
      token: token,
      device_id: deviceId,
    });
    return this.getPushList(token);
  }
}
