import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../entities/device.entity';
import { DeviceLog } from '../entities/device-log.entity';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { DeviceLogService } from './device-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([Device, DeviceLog])],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceLogService],
  exports: [DeviceService],
})
export class DeviceModule {}
