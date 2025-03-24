import { Module } from '@nestjs/common';
import { DeviceWebsocketGateway } from './device.gateway';
import { ClientWebsocketGateway } from './client.gateway';
import { DeviceModule } from '../device/device.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [DeviceModule, PushModule],
  providers: [DeviceWebsocketGateway, ClientWebsocketGateway],
  exports: [DeviceWebsocketGateway, ClientWebsocketGateway],
})
export class WebsocketModule {}
