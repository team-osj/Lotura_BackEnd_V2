import { Injectable } from '@nestjs/common';
import { PushAlertService } from './push-alert.service';

@Injectable()
export class PushService {
  constructor(private readonly pushAlertService: PushAlertService) {}

  async getDevicePushAlerts(deviceId: number) {
    const pushAlerts = await this.pushAlertService.findByDeviceId(deviceId);
    return pushAlerts;
  }

  async sendPushNotification(deviceId: string, message: string): Promise<void> {
    const pushAlerts = await this.pushAlertService.findByDeviceId(parseInt(deviceId));
    // TODO: Implement actual push notification sending logic
    console.log(`Sending push notification to device ${deviceId}: ${message}`);
  }
} 