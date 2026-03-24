import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  
  // This endpoint leverages JwtAuthGuard to trigger JwtStrategy.
  // Because our JwtStrategy implements JIT provisioning, 
  // hitting this endpoint will either verify an existing user or create a new one,
  // returning the synced Prisma user object in req.user.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
