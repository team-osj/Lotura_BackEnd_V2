import { Entity, Column, PrimaryColumn } from 'typeorm';
import { LaundryRoomType } from '../common/enums/laundry-room.enum';

@Entity('device')
export class Device {
  @PrimaryColumn()
  id: number;

  @Column()
  view_id: number;

  @Column()
  state: number;

  @Column({ length: 11 })
  device_type: string;

  @Column({ length: 32 })
  ON_time: string;

  @Column({ length: 32 })
  OFF_time: string;

  @Column()
  prev_state: number;

  @Column()
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

  @Column()
  dormitory: 'boy' | 'girl';

  @Column()
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated: Date;

  @Column({
    type: 'enum',
    enum: LaundryRoomType,
  })
  room_type: LaundryRoomType;
}
