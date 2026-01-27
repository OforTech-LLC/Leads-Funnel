/**
 * S3 Storage Operations
 *
 * Centralises all S3 interactions (presigned URLs, uploads) that were
 * previously inline in handler files.
 *
 * Usage:
 *   import { getPresignedDownloadUrl } from '../lib/storage/s3.js';
 */

import { GetObjectCommand } from '@aws-sdk/client-s3';
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
export async function getPresignedDownloadUrl(
  bucket: string,
  key: string,
  expiresIn = 3600
): Promise<string> {
  const s3 = getS3Client();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}
