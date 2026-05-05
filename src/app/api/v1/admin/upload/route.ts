import { NextRequest } from "next/server";
import formidable from "formidable";
import fs from "fs";
import { env } from "@/config/env";
import { uploadToIA } from "@/lib/internet-archive";
import { buildError, buildSuccess } from "@/utils/response";
import { uploadRateLimit } from "@/lib/rate-limit";
import { Readable } from "stream";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Apply upload rate limit
  try {
    if (typeof uploadRateLimit === "function") {
      await (uploadRateLimit as any)();
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify(buildError("TOO_MANY_REQUESTS", "Rate limit exceeded")),
      { status: 429 },
    );
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return new Response(
      JSON.stringify(
        buildError("INVALID_CONTENT_TYPE", "Expected multipart/form-data"),
      ),
      { status: 400 },
    );
  }

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 500 * 1024 * 1024,
  }); // 500MB

  // Read raw body buffer
  const bodyBuffer = Buffer.from(await req.arrayBuffer());

  try {
    const parsed = await new Promise<{ fields: any; files: any }>(
      (resolve, reject) => {
        form.parse(bodyBuffer as any, (err: any, fields: any, files: any) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      },
    );

    const { fields, files } = parsed;

    const file = (files.file as any) || (files.audio as any) || undefined;
    if (!file) {
      return new Response(
        JSON.stringify(buildError("MISSING_FILE", "No file uploaded")),
        { status: 400 },
      );
    }

    const volumeRaw = Array.isArray(fields.volume)
      ? fields.volume[0]
      : fields.volume;
    const lessonNumberRaw = Array.isArray(fields.lesson_number)
      ? fields.lesson_number[0]
      : fields.lesson_number;

    if (!volumeRaw || !["1", "2", "3", "4"].includes(String(volumeRaw))) {
      return new Response(
        JSON.stringify(buildError("INVALID_VOLUME", "Volume must be 1-4")),
        { status: 422 },
      );
    }
    if (!lessonNumberRaw || !/^[1-9][0-9]*$/.test(String(lessonNumberRaw))) {
      return new Response(
        JSON.stringify(
          buildError("INVALID_LESSON_NUMBER", "lesson_number is invalid"),
        ),
        { status: 422 },
      );
    }

    const volume = Number(volumeRaw);
    const lesson_number = Number(lessonNumberRaw);

    const filepath = (file as any).filepath || (file as any).path;
    const stat = fs.statSync(filepath);
    const size = Number(stat.size);

    const stream = fs.createReadStream(filepath);

    try {
      const res = await uploadToIA(
        stream as unknown as Readable,
        volume,
        lesson_number,
        (file as any).mimetype || "application/octet-stream",
        { volume, lesson_number },
      );

      try {
        fs.unlinkSync(filepath);
      } catch (e) {}

      return new Response(
        JSON.stringify(
          buildSuccess({
            archive_url: res.archive_url,
            filename: res.filename,
            size_bytes: res.size_bytes,
          }),
        ),
        { status: 200 },
      );
    } catch (err: any) {
      try {
        fs.unlinkSync(filepath);
      } catch (e) {}
      return new Response(
        JSON.stringify(
          buildError("UPLOAD_FAILED", "Failed to upload to Internet Archive"),
        ),
        { status: 502 },
      );
    }
  } catch (err: any) {
    if (err && err.message && err.message.includes("maxFileSize")) {
      return new Response(
        JSON.stringify(
          buildError("FILE_TOO_LARGE", "File exceeds allowed size"),
        ),
        { status: 413 },
      );
    }
    return new Response(
      JSON.stringify(
        buildError("INVALID_REQUEST", "Unable to parse multipart data"),
      ),
      { status: 400 },
    );
  }
}
