import fs from 'fs';
import cloudinary from '../config/cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload a local file to Cloudinary, then delete the local temp file.
 * Returns the secure CDN URL and the public_id needed for future deletion.
 */
export async function uploadImage(
  filePath: string,
  folder = 'profile-photos',
): Promise<UploadResult> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
    });
    return { url: result.secure_url, publicId: result.public_id };
  } finally {
    // Always clean up the temp file regardless of upload success/failure
    fs.unlink(filePath, (err) => {
      if (err) console.warn(`[mediaService] Failed to delete temp file: ${filePath}`, err);
    });
  }
}

/**
 * Delete a Cloudinary asset by its public_id.
 * Logs but does not throw on failure — a failed delete should not block the caller.
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`[mediaService] Failed to delete Cloudinary asset: ${publicId}`, err);
  }
}
