import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user.decorator';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPost(@Body() createPostDto: CreatePostDto, @UserId() userId: string) {
    return this.postsService.createPost(userId, createPostDto);
  }

  @Get('city/:cityId')
  async getPostsByCity(
      @Param('cityId') cityId: string,
      @Query('limit') limit?: string,
      @Query('skip') skip?: string,
      @Query('categoryId') categoryId?: string,
  ) {
    return this.postsService.getPostsByCity(
        cityId,
        limit ? parseInt(limit) : 20,
        skip ? parseInt(skip) : 0,
        categoryId,
    );
  }

  @Get('nearby')
  async getNearbyPosts(
      @Query('latitude') latitude?: string,
      @Query('longitude') longitude?: string,
      @Query('radius') radius?: string,
      @Query('limit') limit?: string,
  ) {
    return this.postsService.getNearbyPosts(
        latitude ? parseFloat(latitude) : 0,
        longitude ? parseFloat(longitude) : 0,
        radius ? parseFloat(radius) : 5,
        limit ? parseInt(limit) : 20,
    );
  }

  @Get(':id')
  async getPostById(@Param('id') id: string) {
    return this.postsService.getPostById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @UserId() userId: string,
  ) {
    return this.postsService.updatePost(id, userId, updatePostDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param('id') id: string, @UserId() userId: string) {
    return this.postsService.deletePost(id, userId);
  }
}
