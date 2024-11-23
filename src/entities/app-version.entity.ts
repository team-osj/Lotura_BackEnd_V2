import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('app_version')
export class AppVersion {
  // os_system을 PrimaryKey로 사용 (android or ios)
  @PrimaryColumn()
  os_system: string;

  @Column()
  version: string;

  // 스토어 등록 상태 (0: 미등록, 1: 등록)
  @Column()
  store_status: number;
}
