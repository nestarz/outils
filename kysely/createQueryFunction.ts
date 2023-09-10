import type { PoolClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import type {
  Kysely,
  CompiledQuery,
  InferResult,
} from "https://esm.sh/kysely@0.26.3?dts";

const createQueryFunction =
  <V>(db: Pick<PoolClient, "queryObject">, qb: Kysely<V>) =>
  <T extends CompiledQuery>(fn: (qb: Kysely<V>) => T) => {
    const { sql, parameters } = fn(qb);
    return db.queryObject<InferResult<T>[0]>(sql, parameters as unknown[]);
  };

export default createQueryFunction;
