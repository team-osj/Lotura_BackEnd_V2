import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { ConfigService } from '@nestjs/config';

export async function downloadFirebaseToken(
  configService: ConfigService,
): Promise<void> {
  const tokenUrl = configService.get<string>('FIREBASE_TOKEN_URL');
  const tokenPath = path.join(process.cwd(), 'firebase_token.json');

  return new Promise((resolve, reject) => {
    https
      .get(tokenUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(
              `파이어베이스 토큰 다운로드 실패ㅠㅠ : ${response.statusCode}`,
            ),
          );
          return;
        }

        const fileStream = fs.createWriteStream(tokenPath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log('파이어베이스 토큰 다운로드 성공!');
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlink(tokenPath, () => {}); // 에러있으면 나가리
          reject(err);
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}
