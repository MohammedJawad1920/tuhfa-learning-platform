import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
 * Generate a presigned URL for uploading audio to Internet Archive.
 * The client uses this URL to upload directly to IA via PUT request.
 * @param volume - Lesson volume number
 * @param lesson_number - Lesson number within volume
 * @param contentType - MIME type of the file (e.g., 'audio/mpeg')
 * @param expiresIn - Presign expiry in seconds (default 900 = 15 minutes)
 * @returns Object containing presigned_url, archive_url, filename, method, required_headers
 * @throws UploadError if presign fails
 */
export async function generatePresignedUrl(
  volume: number,
  lesson_number: number,
  contentType: string,
  expiresIn: number = 900,
): Promise<{
  presigned_url: string;
  archive_url: string;
  filename: string;
  expires_in: number;
  method: "PUT";
  required_headers: { "Content-Type": string };
}> {
  const filename = generateIAFilename(volume, lesson_number);

  try {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const command = new PutObjectCommand({
      Bucket: env.IA_COLLECTION_IDENTIFIER,
      Key: filename,
      ContentType: contentType,
      Metadata: {
        volume: String(volume),
        lesson_number: String(lesson_number),
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new UploadError("Presign request timed out")),
        5000,
      );
    });

    try {
      const presigned_url = await Promise.race([
        getSignedUrl(s3Client, command, {
          expiresIn,
          signingDate: new Date(),
        }),
        timeoutPromise,
      ]);

      const archive_url = `https://archive.org/download/${env.IA_COLLECTION_IDENTIFIER}/${filename}`;

      return {
        presigned_url,
        archive_url,
        filename,
        expires_in: expiresIn,
        method: "PUT" as const,
        required_headers: { "Content-Type": contentType },
      };
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during presign";
    throw new UploadError(
      `Failed to generate presigned URL from Internet Archive: ${message}`,
    );
  }
}
