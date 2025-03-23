import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import * as moment from 'moment';
import { LaundryRoomType } from '../common/enums/laundry-room.enum';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  async updateStatus(deviceId: number, state: number, type: number): Promise<void> {
    if (!deviceId) return;

    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      console.log(`Device not found: ${deviceId}`);
      return;
    }

    await this.deviceRepository.update(deviceId, {
      state,
      prev_state: state,
    });

    if (state === 0 && type === 1) {
      // 켜기
      await this.deviceRepository.update(deviceId, {
        ON_time: moment().format('YYYY-MM-DD HH:mm:ss'),
      });
    } else if (state === 1 && type === 1) {
      // 끄기
      await this.deviceRepository.update(deviceId, {
        OFF_time: moment().format('YYYY-MM-DD HH:mm:ss'),
      });

      const updatedDevice = await this.deviceRepository.findOne({
        where: { id: deviceId },
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
    return this.deviceRepository.find({
      select: ['id', 'state', 'device_type'],
      order: {
        id: 'ASC',
      },
    });
  }

  async getMensFirstDevices() {
    return this.deviceRepository.find({
      where: { room_type: LaundryRoomType.MENS_FIRST },
      select: ['id', 'view_id', 'state', 'device_type'],
    });
  }

  async getMensSecondDevices() {
    return this.deviceRepository.find({
      where: { room_type: LaundryRoomType.MENS_SECOND },
      select: ['id', 'view_id', 'state', 'device_type'],
    });
  }

  async getWomensDevices() {
    return this.deviceRepository.find({
      where: { room_type: LaundryRoomType.WOMENS },
      select: ['id', 'view_id', 'state', 'device_type'],
    });
  }

  async getAllDevices() {
    return this.deviceRepository.find({
      select: ['id', 'state', 'device_type'],
      order: {
        id: 'ASC',
      },
    });
  }

  async findAll(): Promise<Device[]> {
    return this.deviceRepository.find();
  }

  async findOne(deviceId: number): Promise<Device> {
    return this.deviceRepository.findOne({
      where: { id: deviceId },
    });
  }

  async findByHwid(hwid: string): Promise<Device> {
    return this.deviceRepository.findOne({
      where: { hwid },
    });
  }

  async create(deviceData: Partial<Device>): Promise<Device> {
    const device = this.deviceRepository.create(deviceData);
    return this.deviceRepository.save(device);
  }

  async update(deviceId: number, deviceData: Partial<Device>): Promise<Device> {
    await this.deviceRepository.update(deviceId, deviceData);
    return this.findOne(deviceId);
  }

  async remove(deviceId: number): Promise<void> {
    await this.deviceRepository.delete(deviceId);
  }
}
