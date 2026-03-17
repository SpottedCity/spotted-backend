import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user.decorator';

@Controller('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createComment(@Body() createCommentDto: CreateCommentDto, @UserId() userId: string) {
    return this.commentsService.createComment(userId, createCommentDto);
  }

  @Get('post/:postId')
  async getCommentsByPost(
    @Param('postId') postId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.commentsService.getCommentsByPost(
      postId,
      limit ? parseInt(limit) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Param('id') id: string,
    @Body() body: { content: string },
    @UserId() userId: string,
  ) {
    return this.commentsService.updateComment(id, userId, body.content);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('id') id: string, @UserId() userId: string) {
    return this.commentsService.deleteComment(id, userId);
  }
}
