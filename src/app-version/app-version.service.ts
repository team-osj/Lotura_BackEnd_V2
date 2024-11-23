import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersion } from '../entities/app-version.entity';

@Injectable()
export class AppVersionService {
  constructor(
    @InjectRepository(AppVersion)
    private appVersionRepository: Repository<AppVersion>,
  ) {}

  async getAndroidVersion() {
    const version = await this.appVersionRepository.findOne({
      where: { os_system: 'android' },
    });

    if (!version) {
      throw new NotFoundException('Android - 버전을 찾을 수 없습니다.');
    }

    return version;
  }

  async getIosVersion() {
    const version = await this.appVersionRepository.findOne({
      where: { os_system: 'ios' },
    });

    if (!version) {
      throw new NotFoundException('iOS - 버전을 찾을 수 없습니다.');
    }

    return version;
  }

  async updateVersion(
    os_system: string,
    version: string,
    store_status: number,
  ) {
    await this.appVersionRepository.update(
      { os_system },
      { version, store_status },
    );
  }
}
