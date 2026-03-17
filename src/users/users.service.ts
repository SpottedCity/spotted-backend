import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUserProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        selectedCityId: true,
        reputation: true,
        createdAt: true,
      },
    });
  }

  async updateUserProfile(userId: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        selectedCityId: true,
      },
    });
  }

  async getUserReputation(userId: string) {
    return this.prisma.userReputation.findUnique({
      where: { userId },
    });
  }

  async getUserPosts(userId: string, limit = 10, skip = 0) {
    return this.prisma.post.findMany({
      where: { authorId: userId },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        latitude: true,
        longitude: true,
        category: true,
        imageUrl: true,
        upvotes: true,
        downvotes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
