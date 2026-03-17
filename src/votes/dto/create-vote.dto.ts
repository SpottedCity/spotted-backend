import { IsInt, IsString, IsOptional } from 'class-validator';

export class CreateVoteDto {
  @IsInt()
  value: number; // 1 or -1

  @IsOptional()
  @IsString()
  postId?: string;

  @IsOptional()
  @IsString()
  commentId?: string;
}
