import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    bucket: process.env.SUPABASE_BUCKET || 'spotted-images',
  },
}));
