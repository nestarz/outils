import type { S3Client } from "https://deno.land/x/s3_lite_client@0.6.2/mod.ts";
import sqliteMemorySync from "../sqliteMemorySync.ts";

const createId = ((i=0) => () => i++); // prettier-ignore
const getObjectTimerId = createId();
export const createSqliteFromS3 = (
  filename: string,
  s3Client: Pick<S3Client, "getObject" | "putObject" | "statObject">
) =>
  sqliteMemorySync(
    () => {
      const id = `[s3lite:getObject:${getObjectTimerId()}]`;
      return (
        console.time(id),
        s3Client
          .getObject(filename)
          .then((r) => r.arrayBuffer())
          .finally(() => console.timeEnd(id))
      );
    },
    (buffer) => {
      const id = `[s3lite:putObject:${getObjectTimerId()}]`;
      return (
        console.time(id),
        s3Client
          .putObject(filename, buffer)
          .then(() => true)
          .finally(() => console.timeEnd(id))
      );
    },
    () => {
      const id = `[s3lite:statObject:${getObjectTimerId()}]`;
      return (
        console.time(id),
        s3Client
          .statObject(filename)
          .then((r) => r.etag)
          .finally(() => console.timeEnd(id))
      );
    }
  );

export default createSqliteFromS3;
