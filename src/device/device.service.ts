import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import * as moment from 'moment';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
  ) {}

  async updateStatus(id: number, state: number, type: number): Promise<void> {
    if (id === 0) return;

    const device = await this.deviceRepository.findOne({
      where: { id },
    });

    if (!device) {
      console.log(`Device not found: ${id}`);
      return;
    }

    await this.deviceRepository.update(id, {
      state,
      prev_state: state,
    });

    if (state === 0 && type === 1) {
      // 켜기
      await this.deviceRepository.update(id, {
        ON_time: moment().toDate(),
      });
    } else if (state === 1 && type === 1) {
      // 끄기
      await this.deviceRepository.update(id, {
        OFF_time: moment().toDate(),
      });

      const updatedDevice = await this.deviceRepository.findOne({
        where: { id },
      });

      if (updatedDevice.ON_time && updatedDevice.OFF_time) {
        const duration = moment(updatedDevice.OFF_time).diff(
          moment(updatedDevice.ON_time),
        );
        console.log(`[Device] Operation Duration: ${duration}ms`);
      }
    }
  }

  async getDeviceList(): Promise<Device[]> {
    // id, state, device_type중 선타ㅐㄱ해서 반환
    return this.deviceRepository.find({
      select: ['id', 'state', 'device_type'],
      order: {
        id: 'ASC',
      },
    });
  }
}
