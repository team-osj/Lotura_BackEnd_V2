import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordService implements OnModuleInit {
  private readonly logger = new Logger(DiscordService.name);
  private client: Client;
  private channel: TextChannel | null = null;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
      ],
    });

    this.client.once('ready', async () => {
      this.logger.log('✅ Discord bot is online!');

      // DISCORD_CHANNEL_ID 확인
      const channelId = this.configService.get<string>('DISCORD_CHANNEL_ID');
      if (!channelId) {
        this.logger.error('❌ DISCORD_CHANNEL_ID is missing in .env!');
        return;
      }

      try {
        const channel = await this.client.channels.fetch(channelId);
        if (!channel) {
          this.logger.error(
            `❌ Channel fetch returned null for ID: ${channelId}`,
          );
          return;
        }

        if (channel.isTextBased()) {
          this.logger.log(`✅ Successfully fetched channel: ${channel.id}`);
          this.channel = channel as TextChannel;
          this.channel.send('Bot is online');
        } else {
          this.logger.error(
            `❌ Fetched channel is not a text channel: ${channelId}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `❌ Failed to fetch channel (${channelId}): ${error.message}`,
        );
      }
    });

    this.client.on('error', (error) => {
      this.logger.error(`❌ Discord client error: ${error.message}`);
    });
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

  sendMessage(message: string) {
    if (this.channel) {
      this.logger.log(`📩 Sending message to channel: ${this.channel.id}`);
      this.channel.send(message);
    } else {
      this.logger.warn('⚠️ Channel is not initialized. Cannot send message.');
    }
  }
}
