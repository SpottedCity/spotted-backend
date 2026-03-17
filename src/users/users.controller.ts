import { Controller, Get, Put, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }

  @Get(':id/reputation')
  async getUserReputation(@Param('id') id: string) {
    return this.usersService.getUserReputation(id);
  }

  @Get(':id/posts')
  async getUserPosts(
    @Param('id') id: string,
    @Body() query: { limit?: number; skip?: number },
  ) {
    return this.usersService.getUserPosts(id, query.limit, query.skip);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateUserProfile(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UserId() userId: string,
  ) {
    // Ensure user can only update their own profile
    if (userId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersService.updateUserProfile(id, updateUserDto);
  }
}
