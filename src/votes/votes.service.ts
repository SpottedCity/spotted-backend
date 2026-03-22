import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VotesService {
  constructor(private prisma: PrismaService) {}

  async voteOnPost(userId: string, postId: string, value: number) {
    if (value !== 1 && value !== -1) {
      throw new BadRequestException('Vote value must be 1 or -1');
    }

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // NIE findUnique z nullami, tylko findFirst
    const existingVote = await this.prisma.vote.findFirst({
      where: {
        userId,
        postId,
        commentId: null,
      },
    });

    // toggle off - ten sam głos kliknięty drugi raz usuwa głos i cofa licznik
    if (existingVote && existingVote.value === value) {
      await this.prisma.$transaction([
        this.prisma.vote.delete({
          where: { id: existingVote.id },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data:
              value === 1
                  ? { upvotes: { decrement: 1 } }
                  : { downvotes: { decrement: 1 } },
        }),
      ]);

      return this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          author: true,
          category: true,
          comments: true,
        },
      });
    }

    // zmiana głosu z 1 -> -1 albo -1 -> 1
    if (existingVote) {
      await this.prisma.$transaction([
        this.prisma.vote.update({
          where: { id: existingVote.id },
          data: { value },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data:
              existingVote.value === 1 && value === -1
                  ? {
                    upvotes: { decrement: 1 },
                    downvotes: { increment: 1 },
                  }
                  : {
                    upvotes: { increment: 1 },
                    downvotes: { decrement: 1 },
                  },
        }),
      ]);

      return this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          author: true,
          category: true,
          comments: true,
        },
      });
    }

    // nowy głos
    await this.prisma.$transaction([
      this.prisma.vote.create({
        data: {
          userId,
          postId,
          commentId: null,
          value,
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data:
            value === 1
                ? { upvotes: { increment: 1 } }
                : { downvotes: { increment: 1 } },
      }),
    ]);

    return this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true,
        category: true,
        comments: true,
      },
    });
  }

  async voteOnComment(userId: string, commentId: string, value: number) {
    if (value !== 1 && value !== -1) {
      throw new BadRequestException('Vote value must be 1 or -1');
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // NIE findUnique z nullami, tylko findFirst
    const existingVote = await this.prisma.vote.findFirst({
      where: {
        userId,
        postId: null,
        commentId,
      },
    });

    // toggle off
    if (existingVote && existingVote.value === value) {
      await this.prisma.$transaction([
        this.prisma.vote.delete({
          where: { id: existingVote.id },
        }),
        this.prisma.comment.update({
          where: { id: commentId },
          data:
              value === 1
                  ? { upvotes: { decrement: 1 } }
                  : { downvotes: { decrement: 1 } },
        }),
      ]);

      return this.prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          author: true,
          replies: {
            include: {
              author: true,
            },
          },
        },
      });
    }

    // zmiana głosu
    if (existingVote) {
      await this.prisma.$transaction([
        this.prisma.vote.update({
          where: { id: existingVote.id },
          data: { value },
        }),
        this.prisma.comment.update({
          where: { id: commentId },
          data:
              existingVote.value === 1 && value === -1
                  ? {
                    upvotes: { decrement: 1 },
                    downvotes: { increment: 1 },
                  }
                  : {
                    upvotes: { increment: 1 },
                    downvotes: { decrement: 1 },
                  },
        }),
      ]);

      return this.prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          author: true,
          replies: {
            include: {
              author: true,
            },
          },
        },
      });
    }

    // nowy głos
    await this.prisma.$transaction([
      this.prisma.vote.create({
        data: {
          userId,
          postId: null,
          commentId,
          value,
        },
      }),
      this.prisma.comment.update({
        where: { id: commentId },
        data:
            value === 1
                ? { upvotes: { increment: 1 } }
                : { downvotes: { increment: 1 } },
      }),
    ]);

    return this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: true,
        replies: {
          include: {
            author: true,
          },
        },
      },
    });
  }
}