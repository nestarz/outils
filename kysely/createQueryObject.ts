import type { PoolClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import type {
  CompiledQuery,
  InferResult,
} from "https://esm.sh/kysely@0.26.1?dts";

const createQueryObject =
  (db: Pick<PoolClient, "queryObject">) =>
  <T extends CompiledQuery>(query: T) =>
    db.queryObject<InferResult<T>[0]>(query.sql, query.parameters as unknown[]);

export default createQueryObject;
