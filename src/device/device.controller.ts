import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { DeviceLogService } from './device-log.service';

@Controller()
export class DeviceController {
  constructor(
    private readonly deviceLogService: DeviceLogService,
    private readonly deviceService: DeviceService,
  ) {}

  @Get('device_list')
  async getDeviceList() {
    return this.deviceService.getAllDevices();
  }

  @Get('device_list_boy1')
  async getMensFirstDevices() {
    return this.deviceService.getMensFirstDevices();
  }

  @Get('device_list_boy2')
  async getMensSecondDevices() {
    return this.deviceService.getMensSecondDevices();
  }

  @Get('device_list_girl')
  async getWomensDevices() {
    return this.deviceService.getWomensDevices();
  }

  @Patch('device/status')
  async updateStatus(@Body() updateStatusDto: UpdateStatusDto) {
    await this.deviceService.updateStatus(
      updateStatusDto.id,
      updateStatusDto.state,
      updateStatusDto.type,
    );
    return { success: true };
  }

  @Get('get_log')
  async getLog(@Query('no', ParseIntPipe) no: number) {
    return this.deviceLogService.getLog(no);
  }

  @Get('log_list')
  async getLogList() {
    return this.deviceLogService.getLogList();
  }
}
