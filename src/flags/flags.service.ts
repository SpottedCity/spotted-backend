import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlagDto } from './dto/create-flag.dto';

@Injectable()
export class FlagsService {
  constructor(private prisma: PrismaService) {}

  async createFlag(reporterId: string, createFlagDto: CreateFlagDto) {
    const existing = await this.prisma.flag.findFirst({
      where: {
        reporterId,
        postId: createFlagDto.postId,
        status: 'pending',
      },
    });

    if (existing) {
      throw new BadRequestException('Flag already exists for this post');
    }

    return this.prisma.flag.create({
      data: {
        ...createFlagDto,
        reporterId,
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            authorId: true,
          },
        },
        reporter: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getFlags(status = 'pending', limit = 20, skip = 0) {
    return this.prisma.flag.findMany({
      where: { status },
      skip,
      take: limit,
      include: {
        post: true,
        reporter: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveFlag(flagId: string, status: string, resolvedBy: string) {
    const flag = await this.prisma.flag.findUnique({
      where: { id: flagId },
    });

    if (!flag) {
      throw new NotFoundException('Flag not found');
    }

    // If status is 'resolved' or 'dismissed', disable the post
    if (status === 'resolved') {
      await this.prisma.post.update({
        where: { id: flag.postId },
        data: { isActive: false },
      });
    }

    return this.prisma.flag.update({
      where: { id: flagId },
      data: { status, resolvedBy },
    });
  }

  async getFlagsByPost(postId: string) {
    return this.prisma.flag.findMany({
      where: { postId },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
