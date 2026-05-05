import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { env } from "@/config/env";

export class UploadError extends Error {}

const s3Client = new S3Client({
  endpoint: env.IA_S3_ENDPOINT,
  credentials: {
    accessKeyId: env.IA_ACCESS_KEY,
    secretAccessKey: env.IA_SECRET_KEY,
  },
  region: "us-east-1",
});

export interface IAMetadata {
  volume: number;
  lesson_number: number;
  title_ar?: string;
}

/**
 * Generate filename for Internet Archive upload.
 * Format: `lesson-v{volume}-{lesson_number_padded}.mp3`
 * Example: lesson-v1-214.mp3 for volume=1, lesson_number=214
 */
export function generateIAFilename(
  volume: number,
  lesson_number: number,
): string {
  const paddedLessonNumber = String(lesson_number).padStart(3, "0");
  return `lesson-v${volume}-${paddedLessonNumber}.mp3`;
}

/**
 * Upload an audio file to Internet Archive.
 * @param fileStream - Readable stream of the audio file
 * @param volume - Lesson volume number
 * @param lesson_number - Lesson number within volume
 * @param contentType - MIME type of the file (e.g., 'audio/mpeg')
 * @param metadata - Optional metadata object
 * @returns Object containing archive_url, filename, and size_bytes
 * @throws UploadError if upload fails or times out
 */
export async function uploadToIA(
  fileStream: Readable,
  volume: number,
  lesson_number: number,
  contentType: string,
  metadata?: IAMetadata,
): Promise<{ archive_url: string; filename: string; size_bytes: number }> {
  const filename = generateIAFilename(volume, lesson_number);

  // Collect the stream to get size and convert to Buffer
  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of fileStream) {
    chunks.push(chunk);
    totalSize += (chunk as Buffer).length;
  }

  const fileBuffer = Buffer.concat(chunks, totalSize);

  try {
    const command = new PutObjectCommand({
      Bucket: env.IA_COLLECTION_IDENTIFIER,
      Key: filename,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: metadata
        ? {
            volume: String(metadata.volume),
            lesson_number: String(metadata.lesson_number),
            ...(metadata.title_ar && { title_ar: metadata.title_ar }),
          }
        : undefined,
    });

    // Create a promise with timeout
    const uploadPromise = s3Client.send(command);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new UploadError("Upload to Internet Archive timed out")),
        300000,
      ),
    );

    await Promise.race([uploadPromise, timeoutPromise]);

    const archive_url = `https://archive.org/download/${env.IA_COLLECTION_IDENTIFIER}/${filename}`;

    return {
      archive_url,
      filename,
      size_bytes: totalSize,
    };
  } catch (err) {
    if (err instanceof UploadError) {
      throw err;
    }

    const message =
      err instanceof Error ? err.message : "Unknown error during upload";
    throw new UploadError(`Failed to upload to Internet Archive: ${message}`);
  }
}
