import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('device_log')
export class DeviceLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hwid: string;

  @Column({ name: 'device_id' })
  device_id: number;

  @Column({ name: 'start_time', type: 'timestamp' })
  start_time: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  end_time: Date;

  @Column({ name: 'log_data', type: 'text' })
  log_data: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
