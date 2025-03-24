import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceLog } from '../entities/device-log.entity';

@Injectable()
export class DeviceLogService {
  private readonly logger = new Logger(DeviceLogService.name);

  constructor(
    @InjectRepository(DeviceLog)
    private deviceLogRepository: Repository<DeviceLog>,
  ) {}

  async saveLog(
    hwid: string,
    deviceId: string | number,
    startTime: string,
    endTime: string,
    logData: string,
  ): Promise<DeviceLog> {
    try {
      const log = this.deviceLogRepository.create({
        hwid,
        device_id: typeof deviceId === 'string' ? parseInt(deviceId) : deviceId,
        start_time: new Date(startTime),
        end_time: new Date(endTime),
        log_data: logData,
      });

      return await this.deviceLogRepository.save(log);
    } catch (error) {
      this.logger.error(`Failed to save device log: ${error.message}`);
      throw error;
    }
  }

  async findByHwid(hwid: string): Promise<DeviceLog[]> {
    return this.deviceLogRepository.find({
      where: { hwid },
      order: { created_at: 'DESC' },
    });
  }

  async findByDeviceId(deviceId: number): Promise<DeviceLog[]> {
    return this.deviceLogRepository.find({
      where: { device_id: deviceId },
      order: { created_at: 'DESC' },
    });
  }

  async findAll(): Promise<DeviceLog[]> {
    return this.deviceLogRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<DeviceLog> {
    return this.deviceLogRepository.findOne({
      where: { id },
    });
  }

  async getLog(id: number): Promise<string> {
    const log = await this.findOne(id);
    return log.log_data;
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
