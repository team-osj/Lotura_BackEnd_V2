import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { PushAlertService } from './push-alert.service';

@Controller('push-alerts')
export class PushAlertController {
  constructor(private readonly pushAlertService: PushAlertService) {}

  @Post('request')
  async requestPushAlert(
    @Body('token') token: string,
    @Body('deviceId') deviceId: string,
    @Body('expectState') expectState: number,
  ) {
    return this.pushAlertService.requestPushAlert(
      token,
      parseInt(deviceId),
      expectState,
    );
  }

  @Delete(':token/:deviceId')
  async cancelPushAlert(
    @Param('token') token: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.pushAlertService.cancelPushAlert(token, parseInt(deviceId));
  }

  @Get('list/:token')
  async getPushList(@Param('token') token: string) {
    return this.pushAlertService.getPushList(token);
  }
}
