import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FlagsService } from './flags.service';
import { CreateFlagDto } from './dto/create-flag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user.decorator';

@Controller('flags')
export class FlagsController {
  constructor(private flagsService: FlagsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createFlag(@Body() createFlagDto: CreateFlagDto, @UserId() userId: string) {
    return this.flagsService.createFlag(userId, createFlagDto);
  }

  @Get()
  async getFlags(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.flagsService.getFlags(
      status || 'pending',
      limit ? parseInt(limit) : 20,
      skip ? parseInt(skip) : 0,
    );
  }

  @Get('post/:postId')
  async getFlagsByPost(@Param('postId') postId: string) {
    return this.flagsService.getFlagsByPost(postId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async resolveFlag(
    @Param('id') id: string,
    @Body() body: { status: string },
    @UserId() userId: string,
  ) {
    return this.flagsService.resolveFlag(id, body.status, userId);
  }
}
