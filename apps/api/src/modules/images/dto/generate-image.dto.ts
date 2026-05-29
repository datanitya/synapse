import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class GenerateImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  prompt: string;
}
