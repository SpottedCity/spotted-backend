import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { VotesService } from './votes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user.decorator';

@Controller('votes')
export class VotesController {
  constructor(private votesService: VotesService) {}

  @Post('post/:postId')
  @UseGuards(JwtAuthGuard)
  async voteOnPost(
    @Param('postId') postId: string,
    @Body() body: { value: number },
    @UserId() userId: string,
  ) {
    return this.votesService.voteOnPost(userId, postId, body.value);
  }

  @Post('comment/:commentId')
  @UseGuards(JwtAuthGuard)
  async voteOnComment(
    @Param('commentId') commentId: string,
    @Body() body: { value: number },
    @UserId() userId: string,
  ) {
    return this.votesService.voteOnComment(userId, commentId, body.value);
  }
}
