import multer from 'multer';
import path from 'path';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// Limits file uploads to 5MB and ensures valid image MIME types
const upload = multer({
  dest: path.join(process.cwd(), 'temp-uploads'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'));
    }
  },
});

export default upload;

