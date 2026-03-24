import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    const supabaseUrl = configService.get<string>('SUPABASE_URL');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: 'authenticated', // Security check requested by user
      algorithms: ['ES256', 'HS256'], // Allow asymmetric keys
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
    });
  }

  async validate(payload: any) {
    console.log('JWT Strategy odebrała token. Payload:', payload);
    try {
      const user = await this.authService.validateUserFromSupabase(payload);
      console.log('Użytkownik pomyślnie zautoryzowany/zsynchronizowany w Prismie:', user.email);
      return user;
    } catch (error) {
      console.error('Błąd autoryzacji / JIT Provisioning:', error);
      throw error;
    }
  }
}