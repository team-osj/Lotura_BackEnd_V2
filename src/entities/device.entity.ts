import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('boy_device')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  view_id: string;

  @Column()
  state: number;

  @Column()
  prev_state: number;

  @Column()
  device_type: string;

  @Column({ type: 'datetime', nullable: true })
  ON_time: Date;

  @Column({ type: 'datetime', nullable: true })
  OFF_time: Date;
}
