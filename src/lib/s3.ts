import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getS3Client() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS credentials/region environment variables");
  }

  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

function dataUriToBuffer(dataUri: string): { buffer: Buffer; mime: string } {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid photo data URI");
  }
  const [, mime, base64] = match;
  return { buffer: Buffer.from(base64, "base64"), mime };
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadPhotoToS3(
  dataUri: string,
  filename: string,
  folder: string = "daily-reports"
): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error("Missing AWS_S3_BUCKET_NAME environment variable");
  }

  const { buffer, mime } = dataUriToBuffer(dataUri);
  const key = `${folder}/${randomUUID()}-${sanitizeFilename(filename)}`;

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mime,
    })
  );

  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
