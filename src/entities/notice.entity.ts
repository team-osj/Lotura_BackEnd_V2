import { IsOptional } from 'class-validator';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('Notice')
export class Notice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200, nullable: true })
  @IsOptional()
  title: string;

  @Column({ type: 'mediumtext', nullable: true })
  contents: string;

  @CreateDateColumn()
  date: Date;
}
