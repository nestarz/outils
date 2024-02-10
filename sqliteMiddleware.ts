import type { MiddlewareHandlerContext } from "https://deno.land/x/fresh@1.5.2/server.ts";
import type { QueryParameter, RowObject } from "https://deno.land/x/sqlite@v3.8/mod.ts";

import { Kysely, SqliteDialect } from "https://esm.sh/kysely@0.26.3?dts";
import sqliteGenTypes from "https://deno.land/x/outils@0.0.119/database/generateSqliteTypes.ts";
import deserializeNestedJSON from "https://deno.land/x/outils@0.0.119/deserializeNestedJSON.ts";
import createQueryFunction from "https://deno.land/x/outils@0.0.119/database/createSqliteQueryFunction.ts";

export type QueryFn = <O extends RowObject = RowObject>(
  sql: string,
  values?: QueryParameter[],
) => Promise<Array<O>>;

type SqliteMiddlewareState<Schema, Namespace extends string = "default"> = {
  db: { query: QueryFn };
  qb: Kysely<Schema>;
  clientQuery: Record<Namespace, ReturnType<typeof createQueryFunction<Schema>>>
};

export const createSqliteMiddleware = <Schema,>({
  database,
  withDeserializeNestedJSON,
  afterHooks,
  namespace,
}: {
  database: { query: QueryFn };
  withDeserializeNestedJSON?: boolean;
  afterHooks?: Parameters<typeof createQueryFunction>[2];
  namespace?: string;
}) => {
  const sqliteTypes = sqliteGenTypes();

  return {
    handler: async (
      _req: Request,
      ctx: MiddlewareHandlerContext<SqliteMiddlewareState<Schema>>,
    ) => {
      ctx.state.db = database;
      const dbQuery = "queryEntries" in ctx.state.db
        ? ctx.state.db.queryEntries as typeof ctx.state.db.query
        : ctx.state.db.query;
      const qb = new Kysely<Schema>({
        dialect: new SqliteDialect(null!),
      });
      await sqliteTypes.save((query) => dbQuery<any>(query));
      ctx.state.clientQuery ??= {};
      ctx.state.clientQuery[namespace ?? "default"] = createQueryFunction(dbQuery, qb, [
        ...(withDeserializeNestedJSON ? [deserializeNestedJSON] : []),
        ...(afterHooks ?? []),
      ]);
      const resp = await ctx.next();
      return resp;
    },
  };
};

export default createSqliteMiddleware;
