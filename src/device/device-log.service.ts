import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceLog } from '../entities/device-log.entity';

@Injectable()
export class DeviceLogService {
  constructor(
    @InjectRepository(DeviceLog)
    private deviceLogRepository: Repository<DeviceLog>,
  ) {}

  async getLog(no: number): Promise<any> {
    const log = await this.deviceLogRepository.findOne({
      where: { No: no },
    });

    if (!log) {
      throw new NotFoundException('로그? 그건 제 잔상입니다만?');
    }

    return log.Log;
  }

  async getLogList() {
    return this.deviceLogRepository.find({
      select: ['No', 'HWID', 'ID', 'Start_Time', 'End_Time'],
      order: {
        No: 'DESC',
      },
    });
  }

  async createLog(logData: {
    HWID: string;
    ID: number;
    Start_Time: Date;
    End_Time: Date;
    Log: any;
  }) {
    const newLog = this.deviceLogRepository.create(logData);
    return this.deviceLogRepository.save(newLog);
  }
}
