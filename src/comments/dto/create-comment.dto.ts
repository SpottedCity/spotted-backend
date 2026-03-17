import { IsString, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  content: string;

  @IsString()
  postId: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
