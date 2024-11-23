import { Controller, Post, Body } from '@nestjs/common';
import { PushAlertService } from './push-alert.service';

class PushRequestDto {
  token: string;
  device_id: number;
  expect_state: number;
}

class PushTokenDto {
  token: string;
}

@Controller()
export class PushAlertController {
  constructor(private readonly pushAlertService: PushAlertService) {}

  @Post('push_request')
  async requestPush(
    @Body() { token, device_id, expect_state }: PushRequestDto,
  ) {
    return this.pushAlertService.requestPushAlert(
      token,
      device_id,
      expect_state,
    );
  }

  @Post('push_list')
  async getPushList(@Body() { token }: PushTokenDto) {
    return this.pushAlertService.getPushList(token);
  }
}
