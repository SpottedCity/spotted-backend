import { IsString } from 'class-validator';

export class SubscribeDto {
  @IsString()
  postId?: string;

  @IsString()
  categoryId?: string;
}
