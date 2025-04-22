import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushAlertController } from './push-alert.controller';
import { PushAlertService } from './push-alert.service';
import { PushAlert } from '../entities/push-alert.entity';
import { Device } from '../entities/device.entity';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [TypeOrmModule.forFeature([PushAlert, Device]), FirebaseModule],
  controllers: [PushAlertController],
  providers: [PushAlertService],
  exports: [PushAlertService],
})
export class PushAlertModule {}
