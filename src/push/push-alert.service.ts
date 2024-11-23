import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushAlert } from '../entities/push-alert.entity';
import { Device } from '../entities/device.entity';

@Injectable()
export class PushAlertService {
  constructor(
    @InjectRepository(PushAlert)
    private pushAlertRepository: Repository<PushAlert>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

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
}
