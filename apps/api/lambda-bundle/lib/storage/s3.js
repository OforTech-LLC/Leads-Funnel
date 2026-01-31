/**
 * S3 Storage Operations
 *
 * Centralises all S3 interactions (presigned URLs, uploads) that were
 * previously inline in handler files.
 *
 * Usage:
 *   import { getPresignedDownloadUrl } from '../lib/storage/s3.js';
 */
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '../clients.js';
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Generate a time-limited presigned URL for downloading an S3 object.
 *
 * @param bucket     S3 bucket name
 * @param key        Object key
 * @param expiresIn  Seconds until the URL expires (default: 3600 = 1 hour)
 * @returns          Presigned HTTPS URL
 */
export async function getPresignedDownloadUrl(bucket, key, expiresIn = 3600) {
    const s3 = getS3Client();
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    return getSignedUrl(s3, command, { expiresIn });
}
/**
 * Generate a time-limited presigned URL for uploading an S3 object.
 *
 * @param bucket      S3 bucket name
 * @param key         Object key
 * @param contentType MIME type for the uploaded object
 * @param expiresIn   Seconds until the URL expires (default: 900 = 15 minutes)
 * @returns           Presigned HTTPS URL for PUT upload
 */
export async function getPresignedUploadUrl(bucket, key, contentType, expiresIn = 900) {
    const s3 = getS3Client();
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
    });
    return getSignedUrl(s3, command, { expiresIn });
}
//# sourceMappingURL=s3.js.map