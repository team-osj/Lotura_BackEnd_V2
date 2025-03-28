import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { LaundryRoomType } from '../common/enums/laundry-room.enum';

@Entity('device')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'view_id' })
  view_id: number;

  @Column({ name: 'device_type' })
  device_type: string;

  @Column()
  state: number;

  @Column({ name: 'prev_state' })
  prev_state: number;

  @Column({ name: 'ON_time', nullable: true })
  ON_time: Date;

  @Column({ name: 'OFF_time', nullable: true })
  OFF_time: Date;

  @Column({ length: 32 })
  hwid: string;

  @Column()
  name: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @Column({
    type: 'enum',
    enum: LaundryRoomType,
    default: LaundryRoomType.MALE_SCHOOL,
  })
  room_type: LaundryRoomType;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated: Date;
}
