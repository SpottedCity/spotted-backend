import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.SUPABASE_JWT_SECRET,
}));
