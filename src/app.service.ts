import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';
import { DiscordService } from './discord/discord.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);
  private connection: mysql.Connection;

  constructor(
    private readonly configService: ConfigService,
    private readonly discordService: DiscordService,
  ) {}

  async onModuleInit() {
    await this.start();
  }

  async start() {
    this.connection = await mysql.createConnection({
      host: this.configService.get<string>('MYSQL_HOST'),
      user: this.configService.get<string>('MYSQL_USER'),
      password: this.configService.get<string>('MYSQL_PASSWORD'),
      database: this.configService.get<string>('MYSQL_DATABASE'),
      timezone: '+09:00',
    });
    this.discordService.start();
    this.setupDatabaseInterval();
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  private setupDatabaseInterval() {
    this.connection
      .query('SELECT 1 FROM device;')
      .then(() => {
        // this.logger.log('Database connection is alive.');
      })
      .catch((error) => {
        this.logger.error('Database connection error:', error);
      });
  }
}
