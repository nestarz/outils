import sqliteMemorySync, {
  type Database,
  type DatabaseCreator,
  type DBWithHash,
} from "./memorySync.ts";

export interface UploadedObjectInfo {
  etag: string;
  versionId: string | null;
}
export interface S3Object {
  type: "Object";
  key: string;
  lastModified: Date;
  etag: string;
  size: number;
}
export interface ObjectStatus extends S3Object {
  // In addition to the data provided by "listObjects()", statObject() provides:
  versionId: string | null;
  metadata: Record<string, string>;
}
export interface S3Client {
  getObject(
    objectName: string,
    options?: {
      bucketName?: string;
      versionId?: string;
    },
  ): Promise<Response>;
  putObject(
    objectName: string,
    streamOrData: ReadableStream<Uint8Array> | Uint8Array | string,
    options?: {
      metadata?: Record<string, string>;
      size?: number;
      bucketName?: string;
      partSize?: number;
    },
  ): Promise<UploadedObjectInfo>;
  statObject(
    objectName: string,
    options?: { bucketName?: string; versionId?: string },
  ): Promise<ObjectStatus>;
}

const createId = (i = 0): () => number => () => i++; // prettier-ignore
const getObjectTimerId: () => number = createId();

export const createSqliteFromS3 = (
  createDatabase: DatabaseCreator<Database>,
  filename: string,
  s3Client: Pick<S3Client, "getObject" | "putObject" | "statObject">,
  createAcquireLock?: (
    filename: string,
  ) => (<T>(fn: () => T) => Promise<T>) | null,
  loose?: boolean,
): Promise<DBWithHash<Database>> =>
  sqliteMemorySync(
    createDatabase,
    () => {
      const id = `[s3lite:getObject:${getObjectTimerId()}]`;
      return (
        console.time(id),
          s3Client
            .getObject(filename)
            .then((r) => r.arrayBuffer())
            .catch((e) => loose ? null! : Promise.reject(e))
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
    },
    createAcquireLock?.(filename),
  );

export default createSqliteFromS3;
