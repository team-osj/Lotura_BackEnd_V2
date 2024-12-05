import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, TextChannel, IntentsBitField, EmbedBuilder } from 'discord.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordService implements OnModuleInit {
  private client: Client;
  private channel: TextChannel;

  constructor(private configService: ConfigService) {
    // Discord 클라이언트 초기화
    this.client = new Client({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
      ],
    });
  }

  /**
   * 모듈 초기화 시 Discord 봇 연결
   */
  async onModuleInit() {
    // Discord 이벤트 핸들러 등록
    this.client.on('ready', () => {
      console.log(`${this.client.user.tag} is online.`);
      this.channel = this.client.channels.cache.get(
        this.configService.get('discord.channelId'),
      ) as TextChannel;
      this.channel.send('Bot is online');
    });

    // 디스코드 봇 로그인
    await this.client.login(this.configService.get('discord.token'));
  }

  /**
   * 일반 메시지를 전송합니다.
   */
  async sendMessage(message: string) {
    if (this.channel) {
      await this.channel.send(message);
    }
  }

  /**
   * 디바이스 상태 보고를 전송합니다.
   */
  async sendDeviceReport(deviceData: any) {
    if (!this.channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`고유번호 ${deviceData.hwid}번 기기 보고`)
      .setDescription(`FW_VER : ${deviceData.fw_ver}`)
      .addFields(
        {
          name: 'CH1',
          value: this.formatChannelInfo(deviceData, '1'),
          inline: true,
        },
        {
          name: 'CH2',
          value: this.formatChannelInfo(deviceData, '2'),
          inline: true,
        },
        { name: '\u200B', value: '\u200B' },
        {
          name: '네트워크',
          value: this.formatNetworkInfo(deviceData),
          inline: true,
        },
      )
      .setTimestamp();

    await this.channel.send({ embeds: [embed] });
  }

  /**
   * 채널 정보를 포맷팅합니다.
   */
  private formatChannelInfo(data: any, channel: string): string {
    return `장치번호 : ${data[`ch${channel}_deviceno`]}
모드 : ${data[`ch${channel}_mode`]}
동작상태 : ${data[`ch${channel}_status`]}
전류 : ${data[`ch${channel}_current`]}A
유량 : ${data[`ch${channel}_flow`]}
배수 : ${data[`ch${channel}_drain`]}

세탁기 동작조건
지연시간 : ${data[`CH${channel}_EndDelay_W`]}
전류 : ${data[`CH${channel}_Curr_W`]}A
유량 : ${data[`CH${channel}_Flow_W`]}

건조기 동작조건
지연시간 : ${data[`CH${channel}_EndDelay_D`]}
전류 : ${data[`CH${channel}_Curr_D`]}A`;
  }

  /**
   * 네트워크 정보를 포맷팅합니다.
   */
  private formatNetworkInfo(data: any): string {
    return `SSID : ${data.wifi_ssid}
Local IP : ${data.wifi_ip}
RSSI : ${data.wifi_rssi}
MAC : ${data.mac}`;
  }
}
