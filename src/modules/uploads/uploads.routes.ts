import { Router } from 'express';
import multer from 'multer';
import { uploadsController } from './uploads.controller.js';
import { requireAdmin } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { requestPresignedUrlSchema, ALLOWED_IMAGE_TYPES } from './uploads.schemas.js';
import { AppError } from '../../types/errors.js';

// Multer in-memory storage for direct buffer upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max per image
  },
  fileFilter: (_req, file, cb) => {
    if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Invalid file type ${file.mimetype}. Only JPEG, PNG, WebP, and AVIF are allowed.`, 400, 'INVALID_FILE_TYPE'));
    }
  },
});

export const adminUploadRoutes = Router();

// All upload routes are protected for Admin
adminUploadRoutes.use(requireAdmin);

/**
 * POST /api/admin/uploads/presigned-url
 * Returns a presigned PUT URL for direct browser-to-R2 upload (Recommended)
 */
adminUploadRoutes.post(
  '/presigned-url',
  validateRequest({ body: requestPresignedUrlSchema }),
  uploadsController.getPresignedUrl
);

/**
 * POST /api/admin/uploads/direct
 * Uploads an image directly via multipart/form-data through server buffer to R2
 */
adminUploadRoutes.post(
  '/direct',
  upload.single('file'),
  uploadsController.uploadDirect
);

/**
 * DELETE /api/admin/uploads
 * Deletes an image from Cloudflare R2
 */
adminUploadRoutes.delete(
  '/',
  uploadsController.deleteFile
);
