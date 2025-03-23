import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceLog } from '../entities/device-log.entity';

@Injectable()
export class DeviceLogService {
  constructor(
    @InjectRepository(DeviceLog)
    private deviceLogRepository: Repository<DeviceLog>,
  ) {}

  async findOne(id: number): Promise<DeviceLog> {
    return this.deviceLogRepository.findOne({
      where: { id },
    });
  }

  async getLog(id: number): Promise<string> {
    const log = await this.findOne(id);
    return log.log;
  }

  async findAll(): Promise<DeviceLog[]> {
    return this.deviceLogRepository.find({
      select: ['id', 'hwid', 'deviceId', 'startTime', 'endTime'],
      order: {
        id: 'DESC',
      },
    });
  }

  async create(logData: {
    hwid: string;
    deviceId: number;
    startTime: Date;
    endTime: Date;
    log: string;
  }): Promise<DeviceLog> {
    const newLog = this.deviceLogRepository.create(logData);
    return this.deviceLogRepository.save(newLog);
  }
}
