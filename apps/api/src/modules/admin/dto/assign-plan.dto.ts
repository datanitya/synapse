import { IsNotEmpty, IsString } from 'class-validator';

export class AssignPlanDto {
  @IsString()
  @IsNotEmpty()
  planId!: string;
}
