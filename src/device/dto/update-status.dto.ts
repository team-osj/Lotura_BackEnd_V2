import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateStatusDto {
  @IsNotEmpty()
  @IsNumber()
  device_id: number;

  @IsNotEmpty()
  @IsNumber()
  state: number;

  @IsNumber()
  type: number;
}
