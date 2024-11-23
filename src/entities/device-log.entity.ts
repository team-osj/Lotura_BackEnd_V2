import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('DeviceLog')
export class DeviceLog {
  @PrimaryGeneratedColumn()
  No: number;

  // 디바이스의 하드웨어 id
  // 예: "device1", "device2" 등
  @Column()
  HWID: string;

  // 디바이스id (device 테이블의 id)
  // 실제 디바이스 번호
  @Column()
  ID: number;

  @Column({ type: 'datetime' })
  Start_Time: Date;

  @Column({ type: 'datetime' })
  End_Time: Date;

  // 디바이스의 작동 로그
  @Column('json')
  Log: object;
}
