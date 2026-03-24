import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async validateUserFromSupabase(payload: any) {
    if (payload.role !== 'authenticated') {
      throw new UnauthorizedException('Invalid role in JWT');
    }

    const { sub, email, user_metadata } = payload;
    if (!sub || !email) {
      throw new UnauthorizedException('Missing auth data in Supabase JWT');
    }

    const firstName = user_metadata?.given_name || user_metadata?.full_name?.split(' ')[0] || null;
    const lastName = user_metadata?.family_name || user_metadata?.full_name?.split(' ').slice(1).join(' ') || null;
    const avatar = user_metadata?.avatar_url || user_metadata?.picture || null;
    const emailVerified = user_metadata?.email_verified ?? false;

    try {
      // Find existing user by supabaseId or email (for legacy migration)
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { supabaseId: sub },
            { email: email }
          ]
        }
      });

      if (user) {
        // Update supabaseId if this is a legacy user logging in via Supabase for the first time
        if (!user.supabaseId || user.emailVerified !== emailVerified) {
           user = await this.prisma.user.update({
             where: { id: user.id },
             data: { supabaseId: sub, emailVerified }
           });
        }
        return user;
      }

      // If user doesn't exist, create them (JIT Provisioning)
      return await this.prisma.user.create({
        data: {
          supabaseId: sub,
          email,
          firstName,
          lastName,
          avatar,
          emailVerified,
          reputation: {
            create: {},
          },
        },
      });
    } catch (error: any) {
      // Handle Concurrent Race Condition (P2002) - if another request just created the user
      if (error.code === 'P2002') {
        return await this.prisma.user.findUnique({
          where: { email },
        });
      }
      throw error;
    }
  }
}