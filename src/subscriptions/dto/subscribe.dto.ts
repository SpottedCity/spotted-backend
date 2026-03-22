import { IsOptional, IsString } from 'class-validator';

export class SubscribeDto {
  @IsOptional()
  @IsString()
  postId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
