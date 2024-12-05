import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoticeController } from './notice.controller';
import { NoticeService } from './notice.service';
import { Notice } from '../entities/notice.entity';
import { PushAlertModule } from 'src/push/push-alert.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notice]), PushAlertModule],
  controllers: [NoticeController],
  providers: [NoticeService],
  exports: [NoticeService],
})
export class NoticeModule {}
