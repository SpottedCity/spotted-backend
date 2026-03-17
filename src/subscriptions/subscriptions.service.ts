import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async subscribe(userId: string, subscribeDto: SubscribeDto) {
    const { postId, categoryId } = subscribeDto;

    if (!postId && !categoryId) {
      throw new BadRequestException('Either postId or categoryId must be provided');
    }

    // Check if already subscribed
    const existing = await this.prisma.subscription.findFirst({
      where: {
        userId,
        postId: postId || undefined,
        categoryId: categoryId || undefined,
      },
    });

    if (existing) {
      throw new BadRequestException('Already subscribed');
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        postId,
        categoryId,
      },
    });
  }

  async unsubscribe(userId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription || subscription.userId !== userId) {
      throw new BadRequestException('Invalid subscription');
    }

    return this.prisma.subscription.delete({
      where: { id: subscriptionId },
    });
  }

  async getUserSubscriptions(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: {
        post: {
          select: {
            id: true,
            title: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
