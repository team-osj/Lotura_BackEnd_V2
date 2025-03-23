import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Patch,
  Query,
  Post,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { DeviceLogService } from './device-log.service';
import { Device } from '../entities/device.entity';

@Controller('devices')
export class DeviceController {
  constructor(
    private readonly deviceLogService: DeviceLogService,
    private readonly deviceService: DeviceService,
  ) {}

  @Get()
  async findAll(): Promise<Device[]> {
    return this.deviceService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Device> {
    return this.deviceService.findOne(id);
  }

  @Post()
  async create(@Body() deviceData: Partial<Device>): Promise<Device> {
    return this.deviceService.create(deviceData);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() deviceData: Partial<Device>,
  ): Promise<Device> {
    return this.deviceService.update(id, deviceData);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.deviceService.remove(id);
  }

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
      updateStatusDto.device_id,
      updateStatusDto.state,
      updateStatusDto.type,
    );
    return { success: true };
  }

  @Get('get_log')
  async getLog(@Query('no', ParseIntPipe) no: number) {
    return this.deviceLogService.getLog(no);
  }

  @Get('logs')
  async getLogs() {
    return this.deviceLogService.findAll();
  }
}
