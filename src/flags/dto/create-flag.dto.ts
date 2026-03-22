import { IsOptional, IsString } from 'class-validator';

export class CreateFlagDto {
  @IsString()
  postId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;
}
