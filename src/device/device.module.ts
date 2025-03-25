import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../entities/device.entity';
import { DeviceLog } from '../entities/device-log.entity';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { DeviceLogService } from './device-log.service';
import { DeviceWebsocketGateway } from '../websocket/device.gateway';
import { ClientWebsocketGateway } from '../websocket/client.gateway';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceLog]),
    PushModule
  ],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceLogService, DeviceWebsocketGateway, ClientWebsocketGateway],
  exports: [DeviceService, DeviceLogService, DeviceWebsocketGateway],
})
export class DeviceModule {}
