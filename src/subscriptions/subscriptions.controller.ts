import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async subscribe(@Body() subscribeDto: SubscribeDto, @UserId() userId: string) {
    return this.subscriptionsService.subscribe(userId, subscribeDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserSubscriptions(@UserId() userId: string) {
    return this.subscriptionsService.getUserSubscriptions(userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async unsubscribe(@Param('id') id: string, @UserId() userId: string) {
    return this.subscriptionsService.unsubscribe(userId, id);
  }
}
