import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('Notice')
export class Notice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'mediumtext' })
  contents: string;

  @CreateDateColumn()
  date: Date;
}
