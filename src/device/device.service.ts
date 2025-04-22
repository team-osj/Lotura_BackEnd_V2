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

  async updateStatus(
    deviceId: number,
    state: number,
  ): Promise<void> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      console.log(`Device not found: ${deviceId}`);
      return;
    }

    // 상태가 변경될 때만 ON_time과 OFF_time 업데이트
    if (device.state !== state) {
      if (state === 1) {
        device.ON_time = new Date();
      } else if (state === 0) {
        device.OFF_time = new Date();
      }
      device.prev_state = device.state;
    }

    // 상태 업데이트
    device.state = state;

    await this.deviceRepository.save(device);
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
      where: { room_type: LaundryRoomType.MALE_SCHOOL },
      select: ['id', 'view_id', 'state', 'device_type'],
    });
  }

  async getMensSecondDevices() {
    return this.deviceRepository.find({
      where: { room_type: LaundryRoomType.MALE_DORMITORY },
      select: ['id', 'view_id', 'state', 'device_type'],
    });
  }

  async getWomensDevices() {
    return this.deviceRepository.find({
      where: { room_type: LaundryRoomType.FEMALE },
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

  async getDeviceType(deviceId: number): Promise<string> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new Error(`Device with id ${deviceId} not found`);
    }

    return device.device_type;
  }
}
