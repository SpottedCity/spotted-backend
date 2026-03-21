import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadsService {
  private supabaseUrl: string;
  private supabaseKey: string;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    this.supabaseKey = this.configService.get<string>('SUPABASE_KEY') || '';
    this.bucket = this.configService.get<string>('SUPABASE_BUCKET') || 'spotted-images';
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${folder}/${timestamp}-${file.originalname}`;

    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${fileName}`;
  }

  async deleteImage(fileUrl: string): Promise<void> {
    console.log(`Would delete: ${fileUrl}`);
  }

  async uploadMultiple(
      files: Express.Multer.File[],
      folder: string,
  ): Promise<string[]> {
    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }
}