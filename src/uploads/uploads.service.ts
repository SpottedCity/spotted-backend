import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadsService {
  private supabaseUrl: string;
  private supabaseKey: string;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get('SUPABASE_URL');
    this.supabaseKey = this.configService.get('SUPABASE_KEY');
    this.bucket = this.configService.get('SUPABASE_BUCKET') || 'spotted-images';
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
    // This would integrate with Supabase Storage REST API
    // For now, returning a placeholder URL
    const timestamp = Date.now();
    const fileName = `${folder}/${timestamp}-${file.originalname}`;

    // TODO: Implement actual Supabase upload
    // const response = await fetch(`${this.supabaseUrl}/storage/v1/object/${this.bucket}/${fileName}`, {
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Bearer ${this.supabaseKey}`,
    //   },
    //   body: file.buffer,
    // });

    // For now, return a mock URL
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${fileName}`;
  }

  async deleteImage(fileUrl: string): Promise<void> {
    // TODO: Implement actual deletion
    console.log(`Would delete: ${fileUrl}`);
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<string[]> {
    const urls = await Promise.all(
      files.map((file) => this.uploadImage(file, folder)),
    );
    return urls;
  }
}
