import { Request, Response, NextFunction } from 'express';
import { uploadsService } from './uploads.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../types/errors.js';

export class UploadsController {
  async getPresignedUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await uploadsService.generatePresignedUrl(req.body);
      return sendSuccess(res, result, 'Presigned URL generated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async uploadDirect(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded or invalid file type', 400, 'FILE_REQUIRED');
      }

      const folder = (req.body.folder as 'products' | 'bundles' | 'banners' | 'general') || 'products';
      const result = await uploadsService.uploadDirect(req.file, folder);
      return sendSuccess(res, result, 'File uploaded to Cloudflare R2 successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const key = (req.body.key || req.query.key) as string;
      if (!key) {
        throw new AppError('File key is required for deletion', 400, 'KEY_REQUIRED');
      }

      const result = await uploadsService.deleteFile(key);
      return sendSuccess(res, result, 'File deleted from Cloudflare R2 successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const uploadsController = new UploadsController();
