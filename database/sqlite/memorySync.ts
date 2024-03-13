type RowObject = { [x: string]: unknown };
// prettier-ignore
type QueryParameter =
  | string
  | number
  | bigint
  | boolean
  | Date
  | Uint8Array
  | null
  | undefined;
type QueryParameterSet = Record<string, QueryParameter> | QueryParameter[];

export type QueryFn = <O extends RowObject = RowObject>(
  sql: string,
  values?: QueryParameterSet,
) => Promise<Array<O>>;

export interface DBWithHash<T> {
  _db: T | null;
  hash: string | null | undefined;
  query: QueryFn;
}

const strPrefix = (v: unknown): string => `[s3lite] ${v}`;

export interface Database {
  close(): void;
  deserialize(arg: Uint8Array): any;
  serialize(): Uint8Array;
  queryEntries<O extends RowObject = RowObject>(
    sql: string,
    params?: QueryParameterSet,
  ): Array<O>;
}

export type DatabaseCreator<DB extends Database> = (
  path?: string,
  options?: {
    mode?: "read" | "write" | "create";
    memory?: boolean;
    uri?: boolean;
  },
) => DB;

export const sqliteMemorySync = async <DB extends Database>(
  createDatabase: DatabaseCreator<DB>,
  get_: () => Promise<ArrayBuffer | void>,
  set: (buffer: Uint8Array) => boolean | Promise<boolean>,
  gethash?: () => Promise<string | null | undefined>,
  acquireLock?: null | (<T>(fn: () => T) => Promise<T>),
  verbose: "info" | "error" = "info",
): Promise<DBWithHash<DB>> => {
  let db0: DB;
  const get = async () => {
    const buffer = await get_().catch(() => null);
    if (db0) {
      if (/error|info/.test(verbose)) console.log(strPrefix("close"));
      db0.close();
    }
    db0 = createDatabase("", { memory: true });
    if (/error|info/.test(verbose)) console.log(strPrefix("open"));
    if (buffer) db0.deserialize(new Uint8Array(buffer));
    return db0;
  };

  let hash: string | null | undefined;
  let db: DB | null;

  let inTransaction = false;
  return await Promise.resolve({
    get _db() {
      return db;
    },
    get hash() {
      return hash;
    },
    query: async <O extends RowObject>(
      query: string,
      values?: QueryParameterSet,
    ) => {
      let isMutation = false;
      if (query.match(/BEGIN/gi)) inTransaction = true;
      if (query.match(/ROLLBACK/gi) || query.match(/COMMIT/gi)) {
        inTransaction = false;
      }
      if (!inTransaction) {
        isMutation = !!query.match(
          /DELETE|INSERT|UPDATE|CREATE|ALTER|COMMIT|DROP/gi,
        );
      }

      const render = isMutation && typeof acquireLock === "function"
        ? acquireLock
        : <T>(fn: () => T): T => fn();
      return await render(async () => {
        if (/error|info/.test(verbose)) {
          console.log(strPrefix(query));
        }
        const newhash = await gethash?.().catch(() => null);
        if (newhash !== hash || !newhash) db = await get();
        hash = newhash;

        if (typeof db === "undefined" || db === null) throw Error("Missing DB");

        return Promise.resolve()
          .then(() => db?.queryEntries<O>(query, values) ?? [])
          .then(async (res) => {
            if (isMutation) {
              if (/error|info/.test(verbose)) {
                console.log(strPrefix("saving..."));
              }
              if (db) await set(db.serialize());
            }
            return res;
          })
          .catch((error) => {
            console.error(error);
            throw Error(strPrefix(JSON.stringify(error)));
          });
      });
    },
  });
};

export default sqliteMemorySync;
