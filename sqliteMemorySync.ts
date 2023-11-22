import type {
  QueryParameterSet,
  RowObject,
} from "https://deno.land/x/sqlite@v3.8/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";

export type QueryFn = <O extends RowObject = RowObject>(
  sql: string,
  values?: QueryParameterSet,
) => Promise<Array<O>>;

export interface DBWithHash {
  _db: DB | null;
  hash: string | null | undefined;
  query: QueryFn;
}

const strPrefix = (v: unknown) => `[s3lite] ${v}`;

export const sqliteMemorySync = (
  get_: () => Promise<ArrayBuffer | void>,
  set: (buffer: Uint8Array) => boolean | Promise<boolean>,
  gethash?: () => Promise<string | null | undefined>,
  verbose: "info" | "error" = "info",
): Promise<DBWithHash> => {
  let db0: DB;
  const get = async () => {
    const buffer = await get_().catch(() => null);
    if (db0) {
      if (/error|info/.test(verbose)) console.log(strPrefix("close"));
      db0.close();
    }
    db0 = new DB("", { memory: true });
    if (/error|info/.test(verbose)) console.log(strPrefix("open"));
    if (buffer) db0.deserialize(new Uint8Array(buffer));
    return db0;
  };

  let hash: string | null | undefined;
  let db: DB | null;

  let inTransaction = false;
  return Promise.resolve({
    get _db() {
      return db;
    },
    get hash() {
      return hash;
    },
    query: async <O extends RowObject>(query: string, values?: QueryParameterSet) => {
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
          if (query.match(/BEGIN/gi)) inTransaction = true;
          if (query.match(/ROLLBACK/gi) || query.match(/COMMIT/gi)) {
            inTransaction = false;
          }
          if (!inTransaction) {
            if (
              query.match(/DELETE|INSERT|UPDATE|CREATE|ALTER|COMMIT|DROP/gi)
            ) {
              if (/error|info/.test(verbose)) {
                console.log(strPrefix("saving..."));
              }
              if (db) await set(db.serialize());
            }
          }
          return res;
        })
        .catch((error) => {
          console.error(error);
          throw Error(strPrefix(JSON.stringify(error)));
        });
    },
  });
};

export default sqliteMemorySync;
