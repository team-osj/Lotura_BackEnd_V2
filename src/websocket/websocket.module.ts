import { Module } from '@nestjs/common';
import { DeviceWebsocketGateway } from './device.gateway';
import { ClientWebsocketGateway } from './client.gateway';

@Module({
  providers: [DeviceWebsocketGateway, ClientWebsocketGateway],
  exports: [DeviceWebsocketGateway, ClientWebsocketGateway],
})
export class WebsocketModule {}
