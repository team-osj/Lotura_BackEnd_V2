import { Body, Controller, Get, Post } from '@nestjs/common';
import { DeviceService } from './device.service';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller()
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

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

  @Post('device/status')
  async updateStatus(@Body() updateStatusDto: UpdateStatusDto) {
    await this.deviceService.updateStatus(
      updateStatusDto.id,
      updateStatusDto.state,
      updateStatusDto.type,
    );
    return { success: true };
  }
}
