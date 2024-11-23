import { Controller, Get } from '@nestjs/common';
import { AppVersionService } from './app-version.service';

@Controller()
export class AppVersionController {
  constructor(private readonly appVersionService: AppVersionService) {}

  @Get('app_ver_android')
  async getAndroidVersion() {
    return this.appVersionService.getAndroidVersion();
  }

  @Get('app_ver_ios')
  async getIosVersion() {
    return this.appVersionService.getIosVersion();
  }
}
