import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Notice')
export class Notice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'mediumtext' })
  contents: string;

  @Column({ length: 50 })
  date: string;
}
