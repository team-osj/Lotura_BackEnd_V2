import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class DeviceLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hwid: string;

  @Column()
  deviceId: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ type: 'text' })
  log: string;
}
