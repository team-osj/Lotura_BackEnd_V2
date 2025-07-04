import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { NoticeService } from './notice.service';
import { Notice } from '../entities/notice.entity';

@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get()
  async findAll(): Promise<Notice[]> {
    return this.noticeService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Notice> {
    return this.noticeService.findOne(id);
  }

  @Post()
  async create(@Body() noticeData: Partial<Notice>): Promise<Notice> {
    return this.noticeService.create(noticeData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.noticeService.remove(parseInt(id));
  }
}
