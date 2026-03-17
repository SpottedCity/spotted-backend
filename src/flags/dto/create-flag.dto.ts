import { IsString } from 'class-validator';

export class CreateFlagDto {
  @IsString()
  postId: string;

  @IsString()
  reason: string;

  @IsString()
  description?: string;
}
