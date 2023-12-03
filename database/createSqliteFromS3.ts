import type { S3Client } from "https://deno.land/x/s3_lite_client@0.6.2/mod.ts";
import sqliteMemorySync from "../sqliteMemorySync.ts";

export const createSqliteFromS3 = (
  filename: string,
  s3Client: Pick<S3Client, "getObject" | "putObject" | "statObject">
) =>
  sqliteMemorySync(
    () => s3Client.getObject(filename).then((r) => r.arrayBuffer()),
    (buffer) => s3Client.putObject(filename, buffer).then(() => true),
    () => s3Client.statObject(filename).then((r) => r.etag)
  );

export default createSqliteFromS3;
