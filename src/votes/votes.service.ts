import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVoteDto } from './dto/create-vote.dto';

@Injectable()
export class VotesService {
  constructor(private prisma: PrismaService) {}

  async voteOnPost(userId: string, postId: string, value: number) {
    // Validate value
    if (value !== 1 && value !== -1) {
      throw new BadRequestException('Vote value must be 1 or -1');
    }

    // Check if vote already exists
    const existingVote = await this.prisma.vote.findUnique({
      where: {
        userId_postId_commentId: {
          userId,
          postId,
          commentId: null,
        },
      },
    });

    if (existingVote) {
      // Update vote
      if (existingVote.value === value) {
        // Remove vote if same
        return this.prisma.vote.delete({
          where: { id: existingVote.id },
        });
      }

      // Update vote value
      const oldValue = existingVote.value;
      const newValue = value;

      await this.prisma.vote.update({
        where: { id: existingVote.id },
        data: { value },
      });

      // Update post stats
      if (oldValue === 1) {
        await this.prisma.post.update({
          where: { id: postId },
          data: { upvotes: { decrement: 1 } },
        });
      } else {
        await this.prisma.post.update({
          where: { id: postId },
          data: { downvotes: { decrement: 1 } },
        });
      }

      if (newValue === 1) {
        await this.prisma.post.update({
          where: { id: postId },
          data: { upvotes: { increment: 1 } },
        });
      } else {
        await this.prisma.post.update({
          where: { id: postId },
          data: { downvotes: { increment: 1 } },
        });
      }
    } else {
      // Create new vote
      await this.prisma.vote.create({
        data: {
          userId,
          postId,
          value,
        },
      });

      // Update post stats
      if (value === 1) {
        await this.prisma.post.update({
          where: { id: postId },
          data: { upvotes: { increment: 1 } },
        });
      } else {
        await this.prisma.post.update({
          where: { id: postId },
          data: { downvotes: { increment: 1 } },
        });
      }
    }

    return this.prisma.post.findUnique({
      where: { id: postId },
      select: { upvotes: true, downvotes: true },
    });
  }

  async voteOnComment(userId: string, commentId: string, value: number) {
    if (value !== 1 && value !== -1) {
      throw new BadRequestException('Vote value must be 1 or -1');
    }

    const existingVote = await this.prisma.vote.findUnique({
      where: {
        userId_postId_commentId: {
          userId,
          postId: null,
          commentId,
        },
      },
    });

    if (existingVote) {
      if (existingVote.value === value) {
        return this.prisma.vote.delete({
          where: { id: existingVote.id },
        });
      }

      const oldValue = existingVote.value;
      const newValue = value;

      await this.prisma.vote.update({
        where: { id: existingVote.id },
        data: { value },
      });

      if (oldValue === 1) {
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { upvotes: { decrement: 1 } },
        });
      } else {
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { downvotes: { decrement: 1 } },
        });
      }

      if (newValue === 1) {
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { upvotes: { increment: 1 } },
        });
      } else {
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { downvotes: { increment: 1 } },
        });
      }
    } else {
      await this.prisma.vote.create({
        data: {
          userId,
          commentId,
          value,
        },
      });

      if (value === 1) {
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { upvotes: { increment: 1 } },
        });
      } else {
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { downvotes: { increment: 1 } },
        });
      }
    }

    return this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { upvotes: true, downvotes: true },
    });
  }
}
