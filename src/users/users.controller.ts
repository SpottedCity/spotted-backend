import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
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
      @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
      @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
  ) {
    return this.usersService.getUserPosts(id, limit, skip);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateUserProfile(
      @Param('id') id: string,
      @Body() updateUserDto: UpdateUserDto,
      @UserId() userId: string,
  ) {
    if (userId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersService.updateUserProfile(id, updateUserDto);
  }
}