import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, Intents, TextChannel } from 'discord.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordService implements OnModuleInit {
  private readonly logger = new Logger(DiscordService.name);
  private client: Client;
  private channel: TextChannel | null = null;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
      ],
    });

    this.client.on('ready', () => {
      this.logger.log(`Discord bot logged in as ${this.client.user.tag}`);
    });

    this.client.login(this.configService.get('DISCORD_TOKEN'));
  }

  async onModuleInit() {
    await this.start();
  }

  async start() {
    const token = this.configService.get<string>('DISCORD_BOT_TOKEN');
    if (!token) {
      this.logger.error('❌ Discord bot token is missing in .env!');
      return;
    }

    this.logger.log('🔄 Logging in to Discord...');
    await this.client.login(token);
    this.logger.log('✅ Successfully logged in to Discord.');
  }

  async sendMessage(channelId: string, message: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel instanceof TextChannel) {
        await channel.send(message);
      }
    } catch (error) {
      this.logger.error(`Failed to send Discord message: ${error.message}`);
    }
  }
}
