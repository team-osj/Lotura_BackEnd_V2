import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notice } from '../entities/notice.entity';
import { PushAlertService } from 'src/push/push-alert.service';

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(Notice)
    private noticeRepository: Repository<Notice>,
    private pushAlertService: PushAlertService,
  ) {}

  async getNotices() {
    return this.noticeRepository.find({
      order: {
        id: 'DESC',
      },
    });
  }

  async createNotice(title: string, contents: string) {
    const notice = await this.noticeRepository.save({
      title,
      contents,
      date: new Date(),
    });

    await this.pushAlertService.sendFcmToAll(title, contents);

    return notice;
  }
}
