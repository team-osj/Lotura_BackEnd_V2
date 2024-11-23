import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from 'src/entities/device.entity';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { DeviceLog } from 'src/entities/device-log.entity';
import { DeviceLogService } from './device-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([Device, DeviceLog])],
  providers: [DeviceService, DeviceLogService],
  controllers: [DeviceController],
  exports: [DeviceService, DeviceLogService],
})
export class DeviceModule {}
