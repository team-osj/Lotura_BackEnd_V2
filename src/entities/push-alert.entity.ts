import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('PushAlert')
export class PushAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  Token: string;

  @Column()
  device_id: number;

  @Column()
  Expect_Status: number;

  @Column({ length: 11, nullable: true })
  device_type: string;

  @Column({ default: 0 })
  state: number;
}
