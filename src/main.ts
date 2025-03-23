import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { downloadFirebaseToken } from './utils/firebase-token';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors();

  // Firebase 토큰 다운로드
  const configService = app.get(ConfigService);
  try {
    await downloadFirebaseToken(configService);
  } catch (error) {
    logger.error('Failed to download Firebase token:', error);
    process.exit(1);
  }

  // HTTP 서버 (3001 포트)
  await app.listen(3001);

  logger.log('Server is running on:');
  logger.log('HTTP: http://localhost:3001');
  logger.log('WebSocket:');
  logger.log('  - Client: ws://localhost:3001/client');
  logger.log('  - Device: ws://localhost:3001/device');
}

bootstrap();
