import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushAlert } from '../entities/push-alert.entity';
import { Device } from '../entities/device.entity';
import { PushAlertService } from './push-alert.service';
import { PushService } from './push.service';
import { PushAlertController } from './push-alert.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PushAlert, Device])],
  controllers: [PushAlertController],
  providers: [PushAlertService, PushService],
  exports: [PushService],
})
export class PushModule {} 