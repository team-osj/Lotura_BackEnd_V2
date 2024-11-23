import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushAlertController } from './push-alert.controller';
import { PushAlertService } from './push-alert.service';
import { PushAlert } from '../entities/push-alert.entity';
import { Device } from '../entities/device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PushAlert, Device])],
  controllers: [PushAlertController],
  providers: [PushAlertService],
  exports: [PushAlertService],
})
export class PushAlertModule {}
