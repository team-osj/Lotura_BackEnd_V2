import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DeviceModule } from './device/device.module';
import { PushModule } from './push/push.module';
import { WebsocketModule } from './websocket/websocket.module';
import { NoticeModule } from './notice/notice.module';
import { AppVersionModule } from './app-version/app-version.module';
import { Device } from './entities/device.entity';
import { DeviceLog } from './entities/device-log.entity';
import { PushAlert } from './entities/push-alert.entity';
import { Notice } from './entities/notice.entity';
import { AppVersion } from './entities/app-version.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('MYSQL_HOST'),
        port: configService.get('MYSQL_PORT'),
        username: configService.get('MYSQL_USER'),
        password: configService.get('MYSQL_PASSWORD'),
        database: configService.get('MYSQL_DATABASE'),
        entities: [Device, DeviceLog, PushAlert, Notice, AppVersion],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    DeviceModule,
    PushModule,
    WebsocketModule,
    NoticeModule,
    AppVersionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
