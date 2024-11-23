import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notice } from '../entities/notice.entity';

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(Notice)
    private noticeRepository: Repository<Notice>,
  ) {}

  async getNotices() {
    return this.noticeRepository.find({
      order: {
        id: 'DESC',
      },
    });
  }

  async createNotice(title: string, contents: string) {
    const notice = this.noticeRepository.create({
      title,
      contents,
      date: new Date(),
    });

    return this.noticeRepository.save(notice);
  }
}
