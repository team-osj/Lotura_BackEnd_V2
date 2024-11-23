import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Notice')
export class Notice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  contents: string;

  @Column({ type: 'datetime' })
  date: Date;
}
