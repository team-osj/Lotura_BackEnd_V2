import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('push_alert')
export class PushAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  token: string;

  @Column({ name: 'device_id' })
  device_id: number;

  @Column({ name: 'expect_status' })
  expect_status: number;

  @Column({ name: 'device_type' })
  device_type: string;

  @Column()
  state: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
