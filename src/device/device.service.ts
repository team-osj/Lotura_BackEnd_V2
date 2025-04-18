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
    
    // 새로운 상태가 현재 상태와 다를 때만 prev_state 업데이트
    if (device.state !== state) {
      // 상태 변경 시 시간 기록
      if (state === 1) { // ON 상태
        device.ON_time = new Date();
        device.OFF_time = null;
      } else if (state === 0) { // OFF 상태
        device.OFF_time = new Date();
      }

      await this.deviceRepository.update(deviceId, {
        state,
        prev_state: device.state, // 현재 상태를 prev_state에 저장
        ON_time: device.ON_time,
        OFF_time: device.OFF_time
      });
    } else {
      // 상태가 같다면 state만 업데이트(중복 업데이트 방지)
      await this.deviceRepository.update(deviceId, { state });
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
