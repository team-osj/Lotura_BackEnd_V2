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
  NotFoundException,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { DeviceLogService } from './device-log.service';
import { Device } from '../entities/device.entity';
import { DeviceWebsocketGateway } from '../websocket/device.gateway';

@Controller('device')
export class DeviceController {
  constructor(
    private readonly deviceLogService: DeviceLogService,
    private readonly deviceService: DeviceService,
    private readonly deviceWebsocketGateway: DeviceWebsocketGateway,
  ) {}

  @Get('connected')
  async getConnectedDevices() {
    return this.deviceWebsocketGateway.getAllConnectedDevices();
  }

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

  @Get('list')
  async getDeviceList() {
    return this.deviceService.getAllDevices();
  }

  @Get('male_school')
  async getMensFirstDevices() {
    return this.deviceService.getMensFirstDevices();
  }

  @Get('male_domitory')
  async getMensSecondDevices() {
    return this.deviceService.getMensSecondDevices();
  }

  @Get('female')
  async getWomensDevices() {
    return this.deviceService.getWomensDevices();
  }

  @Patch('status')
  async updateStatus(@Body() updateStatusDto: UpdateStatusDto) {
    await this.deviceService.updateStatus(
      updateStatusDto.device_id,
      updateStatusDto.state,
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

  @Get('room/:roomType')
  async getDevicesByRoomType(@Param('roomType') roomType: string) {
    switch (roomType) {
      case 'mens_first':
        return this.deviceService.getMensFirstDevices();
      case 'mens_second':
        return this.deviceService.getMensSecondDevices();
      case 'womens':
        return this.deviceService.getWomensDevices();
      default:
        throw new NotFoundException(`Room type ${roomType} not found`);
    }
  }
}
