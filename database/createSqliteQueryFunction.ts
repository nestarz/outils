import type { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";
import type {
  Kysely,
  CompiledQuery,
  InferResult,
} from "https://esm.sh/kysely@0.26.3?dts";

const createQueryFunction =
  <V>(query: DB["queryEntries"], qb: Kysely<V>) =>
  <T extends CompiledQuery>(fn: (qb: Kysely<V>) => T) => {
    const { sql, parameters } = fn(qb);
    return query<InferResult<T>[0]>(
      sql,
      parameters as Parameters<DB["queryEntries"]>[1]
    );
  };

export default createQueryFunction;
