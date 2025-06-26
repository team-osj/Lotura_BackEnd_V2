import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('app_version')
export class AppVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  os_system: string;

  @Column({ length: 200 })
  version: string;

  @Column({ length: 2 })
  store_status: string;
}
