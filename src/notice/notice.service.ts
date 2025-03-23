import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notice } from '../entities/notice.entity';
import { PushAlertService } from 'src/push/push-alert.service';

@Injectable()
export class NoticeService {
  private readonly logger = new Logger(NoticeService.name);

  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
    private pushAlertService: PushAlertService,
  ) {}

  async findAll(): Promise<Notice[]> {
    try {
      return await this.noticeRepository.find({
        order: { date: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error getting notices: ${error.message}`);
      throw error;
    }
  }

  async findOne(noticeId: number): Promise<Notice> {
    try {
      const notice = await this.noticeRepository.findOne({
        where: { id: noticeId },
      });
      if (!notice) {
        throw new Error(`Notice ${noticeId} not found`);
      }
      return notice;
    } catch (error) {
      this.logger.error(`Error getting notice: ${error.message}`);
      throw error;
    }
  }

  async create(noticeData: Partial<Notice>): Promise<Notice> {
    try {
      const notice = this.noticeRepository.create({
        title: noticeData.title,
        contents: noticeData.contents,
        date: noticeData.date,
      });
      await this.noticeRepository.save(notice);
      this.logger.log(`Notice created: ${noticeData.title}`);
      const pushResult = await this.pushAlertService.sendFcmToAll(
        noticeData.title,
        noticeData.contents,
      );
      console.log('FCM 전송 시도:', pushResult);
      return notice;
    } catch (error) {
      this.logger.error(`Error creating notice: ${error.message}`);
      throw error;
    }
  }

  async update(noticeId: number, noticeData: Partial<Notice>): Promise<Notice> {
    try {
      await this.noticeRepository.update(noticeId, noticeData);
      return this.findOne(noticeId);
    } catch (error) {
      this.logger.error(`Error updating notice: ${error.message}`);
      throw error;
    }
  }

  async remove(noticeId: number): Promise<void> {
    try {
      await this.noticeRepository.delete(noticeId);
      this.logger.log(`Notice deleted: ${noticeId}`);
    } catch (error) {
      this.logger.error(`Error deleting notice: ${error.message}`);
      throw error;
    }
  }
}
