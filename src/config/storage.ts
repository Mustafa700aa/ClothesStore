import { S3Client } from '@aws-sdk/client-s3';
import { env } from './environment.js';

/**
 * Checks if Cloudflare R2 credentials are fully configured in the environment.
 */
export const isR2Configured = (): boolean => {
  return Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
};

let clientInstance: S3Client | null = null;

/**
 * Returns an S3Client instance configured for Cloudflare R2.
 * Throws an error if required R2 credentials are missing.
 */
export const getR2Client = (): S3Client => {
  if (!isR2Configured()) {
    throw new Error(
      'Cloudflare R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in your .env file.'
    );
  }

  if (!clientInstance) {
    clientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  return clientInstance;
};
