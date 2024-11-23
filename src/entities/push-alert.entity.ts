import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('PushAlert')
export class PushAlert {
  @PrimaryGeneratedColumn()
  id: number;

  // FCM 토큰
  @Column()
  Token: string;

  // 알림을 받고자 하는 기기 아이디
  @Column()
  device_id: number;

  // 기대하는 디바이스 상태 (알림을 받고 싶은 상태)
  // 예시: 1 (사용 가능 상태가 되었을 때 알림 받기)
  @Column()
  Expect_Status: number;

  @Column()
  device_type: string;

  // 현재 ㄱ기기 상태
  @Column({ nullable: true })
  state: number;
}
