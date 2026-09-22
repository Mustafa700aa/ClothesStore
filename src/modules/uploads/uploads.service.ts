import crypto from 'node:crypto';
import path from 'node:path';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client } from '../../config/storage.js';
import { env } from '../../config/environment.js';
import { RequestPresignedUrlInput } from './uploads.schemas.js';

export class UploadsService {
  /**
   * Generates a safe, collision-resistant object key for Cloudflare R2
   */
  private generateKey(folder: string, originalFileName: string): string {
    const ext = path.extname(originalFileName).toLowerCase() || '.jpg';
    const uniqueId = crypto.randomUUID();
    const timestamp = Date.now();
    return `${folder}/${timestamp}-${uniqueId}${ext}`;
  }

  /**
   * Builds the public CDN URL for an uploaded file
   */
  private buildPublicUrl(key: string): string {
    const baseUrl = env.R2_PUBLIC_URL.replace(/\/+$/, '');
    return `${baseUrl}/${key}`;
  }

  /**
   * Generates a presigned PUT URL for direct browser-to-R2 uploads.
   * This offloads file streaming entirely from the Node.js server to Cloudflare.
   */
  async generatePresignedUrl(input: RequestPresignedUrlInput) {
    const client = getR2Client();
    const key = this.generateKey(input.folder, input.fileName);

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ContentType: input.fileType,
    });

    // Signed URL expires in 5 minutes (300 seconds)
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    const publicUrl = this.buildPublicUrl(key);

    return {
      uploadUrl,
      publicUrl,
      key,
      expiresInSeconds: 300,
      instructions: 'Send a PUT request with the raw image binary to uploadUrl with header Content-Type: ' + input.fileType,
    };
  }

  /**
   * Direct file upload through server memory buffer into Cloudflare R2.
   * Useful as a fallback or for simple admin dashboard integration.
   */
  async uploadDirect(file: Express.Multer.File, folder: 'products' | 'bundles' | 'banners' | 'general' = 'products') {
    const client = getR2Client();
    const key = this.generateKey(folder, file.originalname);

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await client.send(command);
    const publicUrl = this.buildPublicUrl(key);

    return {
      publicUrl,
      key,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Deletes an image from Cloudflare R2 by key
   */
  async deleteFile(key: string) {
    const client = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
    return { success: true, key };
  }
}

export const uploadsService = new UploadsService();
