import { Module } from '@nestjs/common';
import { DeviceModule } from '../device/device.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [DeviceModule, PushModule],
})
export class WebsocketModule {}
