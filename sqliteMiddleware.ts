import type { MiddlewareHandlerContext } from "https://deno.land/x/fresh@1.5.2/server.ts";
import type { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";

import { Kysely, SqliteDialect } from "https://esm.sh/kysely@0.26.3?dts";
import sqliteGenTypes from "https://deno.land/x/outils@0.0.87/database/generateSqliteTypes.ts";
import createQueryFunction from "https://deno.land/x/outils@0.0.87/database/createSqliteQueryFunction.ts";
import deserializeNestedJSON from "https://deno.land/x/outils@0.0.87/deserializeNestedJSON.ts";

export type SqliteMiddlewareState<Schema> = {
  db: DB;
  qb: Kysely<Schema>;
  clientQuery: ReturnType<typeof createQueryFunction<Schema>>;
};

export const createSqliteMiddleware = <Schema>({
  database,
  withDeserializeNestedJSON,
  afterHooks,
}: {
  database: DB;
  withDeserializeNestedJSON?: boolean;
  afterHooks?: Parameters<typeof createQueryFunction>[2];
}) => {
  const sqliteTypes = sqliteGenTypes();

  return {
    handler: async (
      _req: Request,
      ctx: MiddlewareHandlerContext<SqliteMiddlewareState<Schema>>
    ) => {
      ctx.state.db = database;
      const dbQuery =
        ctx.state.db.queryEntries ??
        ((ctx.state.db as unknown as { query: unknown })
          .query as unknown as typeof ctx.state.db.queryEntries);
      const qb = new Kysely<Schema>({
        dialect: new SqliteDialect(null!),
      });
      await sqliteTypes.save((query) => dbQuery<any>(query));
      ctx.state.clientQuery = createQueryFunction(dbQuery, qb, [
        ...(withDeserializeNestedJSON ? [deserializeNestedJSON] : []),
        ...(afterHooks ?? []),
      ]);
      const resp = await ctx.next();
      return resp;
    },
  };
};

export default createSqliteMiddleware;
