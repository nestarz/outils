import { Kysely, SqliteDialect } from "kysely";

import deserializeNestedJSON from "../../deserializeNestedJSON.ts";
import createQueryFunction, {
  type QueryFn,
  type QueryFunction,
} from "./createQueryFunction.ts";
import sqliteGenTypes from "./generateTypes.ts";
import type { Plugin } from "../../fresh/types.ts";

export type SqliteMiddlewareState<
  Schema,
  Namespace extends string = "default",
> = {
  db: { query: QueryFn };
  qb: Kysely<Schema>;
  clientQuery: Record<Namespace, QueryFunction<Schema>>;
};

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

export const createSqlitePlugin = <
  Schema,
  Namespace extends string = "default",
>({
  getDatabase,
  withDeserializeNestedJSON,
  afterHooks,
  namespace,
  disableWritingTypes,
}: SqliteMiddlewareConfig<Namespace>): Plugin<
  SqliteMiddlewareState<Schema, Namespace>
> => {
  const sqliteTypes = !disableWritingTypes && withWriteAccess
    ? sqliteGenTypes({ filename: `${namespace ?? "default"}.sqlite.d.ts` })
    : null;

  const databasePromise = getDatabase();
  return {
    name: "sqliteMiddlewarePlugin",
    middlewares: [
      {
        path: "/",
        middleware: {
          handler: async (_req, ctx) => {
            ctx.state.db = await databasePromise;
            const dbQuery = "queryEntries" in ctx.state.db
              ? (ctx.state.db.queryEntries as typeof ctx.state.db.query)
              : ctx.state.db.query;
            const qb = new Kysely<Schema>({
              dialect: new SqliteDialect(null!),
            });
            await sqliteTypes?.save((query) => dbQuery<any>(query) as any);
            const key = (namespace ?? "default") as Namespace;
            const value = createQueryFunction(dbQuery, qb, [
              ...(withDeserializeNestedJSON ? [deserializeNestedJSON] : []),
              ...(afterHooks ?? []),
            ]);
            ctx.state.clientQuery ??= {} as Record<
              Namespace,
              QueryFunction<Schema>
            >;
            ctx.state.clientQuery[key] = value;
            const resp = await ctx.next();
            return resp;
          },
        },
      },
    ],
  };
};

export default createSqlitePlugin;
