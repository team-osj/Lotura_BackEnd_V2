import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { downloadFirebaseToken } from './utils/firebase-token';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // WebSocket 어댑터 설정
  app.useWebSocketAdapter(new WsAdapter(app));

  // CORS 설정
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Firebase 토큰 다운로드
  try {
    await downloadFirebaseToken(configService);
    logger.log('Firebase token downloaded successfully');
  } catch (error) {
    logger.error('Failed to download Firebase token:', error);
    process.exit(1);
  }

  // 서버 시작
  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);

  // 프로세스 예외 처리
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // 서버 재시작
    app.close().then(() => {
      logger.log('Restarting server...');
      process.exit(1); // 프로세스가 종료되면 PM2가 자동으로 재시작
    });
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // 서버 재시작
    app.close().then(() => {
      logger.log('Restarting server...');
      process.exit(1); // 프로세스가 종료되면 PM2가 자동으로 재시작
    });
  });

  // SIGTERM 시그널 처리
  process.on('SIGTERM', () => {
    logger.log('SIGTERM received. Performing graceful shutdown...');
    app.close().then(() => {
      process.exit(0);
    });
  });

  // SIGINT 시그널 처리
  process.on('SIGINT', () => {
    logger.log('SIGINT received. Performing graceful shutdown...');
    app.close().then(() => {
      process.exit(0);
    });
  });
}

// 애플리케이션 시작
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application:', error);
  process.exit(1); // 프로세스가 종료되면 PM2가 자동으로 재시작
});
