import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { LaundryRoomType } from '../common/enums/laundry-room.enum';

@Entity('device')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;
  // 기기 고유 아이디

  // 화면에 표시되는 기기의 아이디
  @Column()
  view_id: number;

  // 기기 현재 상태
  // 0: 작동중
  // 1: 사용 가능
  // 2: 연결 끊김
  // 3: 고장나씀
  @Column()
  state: number;

  //디바이스의 직전 상태로 상태 변경 추적을 위해 저장해둔겁니다.
  @Column()
  prev_state: number;

  // 디바이스 종류
  // WASH: 세탁기
  // DRY: 건조기
  @Column()
  device_type: string;

  // 어느 세탁실?
  @Column({
    type: 'enum',
    enum: LaundryRoomType,
  })
  room_type: LaundryRoomType;

  // state가 0으로 변경된 시간 즉 켜진시간
  @Column({ type: 'datetime', nullable: true })
  ON_time: Date;

  // state가 1로 변경된 시간 즉 꺼진시간
  @Column({ type: 'datetime', nullable: true })
  OFF_time: Date;
}
