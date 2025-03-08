import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WebsocketModule } from './websocket/websocket.module';
import configuration from './config/configuration';
import { NoticeModule } from './notice/notice.module';
import { DeviceModule } from './device/device.module';
import { DiscordModule } from './discord/discord.module';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: true,
        timezone: '+09:00',
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    WebsocketModule,
    NoticeModule,
    DeviceModule,
    DiscordModule,
  ],
  providers: [AppService],
})
export class AppModule {}
