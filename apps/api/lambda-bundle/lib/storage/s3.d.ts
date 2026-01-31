/**
 * S3 Storage Operations
 *
 * Centralises all S3 interactions (presigned URLs, uploads) that were
 * previously inline in handler files.
 *
 * Usage:
 *   import { getPresignedDownloadUrl } from '../lib/storage/s3.js';
 */
/**
 * Generate a time-limited presigned URL for downloading an S3 object.
 *
 * @param bucket     S3 bucket name
 * @param key        Object key
 * @param expiresIn  Seconds until the URL expires (default: 3600 = 1 hour)
 * @returns          Presigned HTTPS URL
 */
export declare function getPresignedDownloadUrl(bucket: string, key: string, expiresIn?: number): Promise<string>;
/**
 * Generate a time-limited presigned URL for uploading an S3 object.
 *
 * @param bucket      S3 bucket name
 * @param key         Object key
 * @param contentType MIME type for the uploaded object
 * @param expiresIn   Seconds until the URL expires (default: 900 = 15 minutes)
 * @returns           Presigned HTTPS URL for PUT upload
 */
export declare function getPresignedUploadUrl(bucket: string, key: string, contentType: string, expiresIn?: number): Promise<string>;
