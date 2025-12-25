import { Storage, Bucket } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../../shared/utils/logger";

let storage: Storage;
let bucket: Bucket;

function getBucketName(): string {
  const name = process.env.GCP_STORAGE_BUCKET;
  if (!name) {
    throw new Error("GCP_STORAGE_BUCKET environment variable is not set");
  }
  return name;
}

function getStorage(): Storage {
  if (!storage) {
    storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
    });
  }
  return storage;
}

function getBucket(): Bucket {
  if (!bucket) {
    bucket = getStorage().bucket(getBucketName());
  }
  return bucket;
}

/**
 * Upload a file buffer to GCS
 */
export async function uploadFile(
  fileBuffer: Buffer,
  originalName: string,
  userId: string,
): Promise<string> {
  const fileName = `uploads/${userId}/${uuidv4()}-${originalName}`;
  const file = getBucket().file(fileName);

  await file.save(fileBuffer, {
    contentType: "text/plain",
    metadata: {
      originalName,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
    },
  });

  const gcsUrl = `gs://${getBucketName()}/${fileName}`;
  logger.info(`File uploaded to GCS: ${gcsUrl}`);

  return gcsUrl;
}

/**
 * Upload multiple files to GCS
 */
export async function uploadFiles(
  files: { buffer: Buffer; originalname: string }[],
  userId: string,
): Promise<string[]> {
  const uploadPromises = files.map((file) =>
    uploadFile(file.buffer, file.originalname, userId),
  );

  return Promise.all(uploadPromises);
}

/**
 * Upload a profile picture to GCS
 */
export async function uploadProfilePicture(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  userId: string,
): Promise<string> {
  // Extract file extension
  const extension = originalName.split(".").pop() || "jpg";
  const fileName = `profile-pictures/${userId}/${uuidv4()}.${extension}`;
  const file = getBucket().file(fileName);

  await file.save(fileBuffer, {
    contentType: mimeType,
    metadata: {
      originalName,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      type: "profile-picture",
    },
  });

  const gcsUrl = `gs://${getBucketName()}/${fileName}`;
  logger.info(`Profile picture uploaded to GCS: ${gcsUrl}`);

  return gcsUrl;
}

/**
 * Generate a signed URL for a GCS file
 * @param gcsUrl - GCS URL in format gs://bucket-name/path
 * @param expiresInMinutes - URL expiration time in minutes (default: 1 year for profile pictures)
 * @returns Signed URL that provides temporary access to the file
 */
export async function getSignedUrl(
  gcsUrl: string,
  expiresInMinutes: number = 365 * 24 * 60, // 1 year for profile pictures
): Promise<string> {
  // Parse gs://bucket-name/path/to/file format
  const match = gcsUrl.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid GCS URL format: ${gcsUrl}`);
  }

  const [, bucketName, filePath] = match;
  const file = getStorage().bucket(bucketName).file(filePath);

  // Check if file exists
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`File not found: ${gcsUrl}`);
  }

  // Generate signed URL
  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });

  return signedUrl;
}

/**
 * Download file content from GCS URL
 */
export async function downloadFile(gcsUrl: string): Promise<string> {
  // Parse gs://bucket-name/path/to/file format
  const match = gcsUrl.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid GCS URL format: ${gcsUrl}`);
  }

  const [, bucketName, filePath] = match;
  const file = getStorage().bucket(bucketName).file(filePath);

  const [content] = await file.download();
  return content.toString("utf-8");
}

export const gcsService = {
  uploadFile,
  uploadFiles,
  uploadProfilePicture,
  downloadFile,
  getSignedUrl,
};
