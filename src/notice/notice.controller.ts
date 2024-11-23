import { Body, Controller, Get, Post } from '@nestjs/common';
import { NoticeService } from './notice.service';
import { CreateNoticeDto } from './dto/create-notice.dto';

@Controller()
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get('notice')
  async getNotices() {
    return this.noticeService.getNotices();
  }

  @Post('notice')
  async createNotice(@Body() createNoticeDto: CreateNoticeDto) {
    return this.noticeService.createNotice(
      createNoticeDto.title,
      createNoticeDto.contents,
    );
  }
}
