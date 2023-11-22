import type { S3Client } from "https://deno.land/x/s3_lite_client@0.6.1/mod.ts";

export const createDatabaseFromS3 = (filename: string, s3Client: S3Client) =>
  sqliteMemorySync(
    () => s3Client.getObject(filename).then((r) => r.arrayBuffer()),
    (buffer) => s3Client.putObject(filename, buffer).then(() => true),
    () => s3Client.statObject(filename).then((r) => r.etag),
  );

export default createDatabaseFromS3;
