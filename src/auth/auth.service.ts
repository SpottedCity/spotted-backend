import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignUpDto, SignInDto, GoogleAuthDto } from './dto/auth.validation';

@Injectable()
export class AuthService {
  constructor(
      private prisma: PrismaService,
      private jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, password, firstName, lastName } = signUpDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        reputation: {
          create: {},
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user,
    };
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      },
    };
  }

  async googleAuth(googleAuthDto: GoogleAuthDto) {
    const { googleId, email, firstName, lastName, avatar } = googleAuthDto;

    let dbUser = await this.prisma.user.findUnique({
      where: { googleId },
    });

    if (!dbUser) {
      dbUser = await this.prisma.user.findUnique({
        where: { email },
      });
    }

    let user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
    };

    if (!dbUser) {
      user = await this.prisma.user.create({
        data: {
          email,
          googleId,
          firstName,
          lastName,
          avatar,
          reputation: {
            create: {},
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: dbUser.id },
        data: {
          googleId: googleId || dbUser.googleId,
          avatar: avatar || dbUser.avatar,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      });
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user,
    };
  }

  validateJwt(payload: any) {
    return payload;
  }
}