import type { QueryFunction } from "./createQueryFunction.ts";
import { Kysely, SqliteDialect } from "kysely";
import deserializeNestedJSON from "../../deserializeNestedJSON.ts";
import createQueryFunction, { type QueryFn } from "./createQueryFunction.ts";
import sqliteGenTypes from "./generateTypes.ts";

export interface SqliteMiddlewareConfig<Namespace extends string = "default"> {
  getDatabase: () => Promise<{ query: QueryFn }>;
  withDeserializeNestedJSON?: boolean;
  afterHooks?: Parameters<typeof createQueryFunction>[2];
  namespace?: Namespace;
  disableWritingTypes?: boolean;
}

const withWriteAccess: boolean = await Deno.permissions
  .query({ name: "write", path: Deno.cwd() })
  .then((d) => d.state === "granted");

export const createQueryClient = async <Schema>(
  options: SqliteMiddlewareConfig,
): Promise<QueryFunction<Schema>> => {
  const sqliteTypes = !options.disableWritingTypes && withWriteAccess
    ? sqliteGenTypes({
      filename: `${options.namespace ?? "default"}.sqlite.d.ts`,
    })
    : null;

  let done = false;
  const dbPromise = options.getDatabase();
  const qb = new Kysely<Schema>({
    dialect: new SqliteDialect(null!),
  });

  return async (qbb) => {
    const db = await dbPromise;
    const dbQuery = "queryEntries" in db
      ? (db.queryEntries as typeof db.query)
      : db.query;
    if (!done) await sqliteTypes?.save((query) => dbQuery<any>(query) as any);
    done = true;
    return createQueryFunction(dbQuery, qb, [
      ...(options.withDeserializeNestedJSON ? [deserializeNestedJSON] : []),
      ...(options.afterHooks ?? []),
    ])(qbb);
  };
};

export default createQueryClient;
