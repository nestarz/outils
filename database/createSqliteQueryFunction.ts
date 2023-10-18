import type { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";
import type {
  Kysely,
  CompiledQuery,
  InferResult,
} from "https://esm.sh/kysely@0.26.3?dts";

const createQueryFunction =
  <V>(
    query: DB["queryEntries"],
    qb: Kysely<V>,
    hooks?: (<X>(...v: any[]) => X)[]
  ) =>
  <T extends CompiledQuery>(fn: (qb: Kysely<V>) => T) => {
    const { sql, parameters } = fn(qb);
    const value = Promise.resolve(
      query<InferResult<T>[0]>(
        sql,
        parameters as Parameters<DB["queryEntries"]>[1]
      )
    );
    return (hooks ?? [])
      .filter((hook) => typeof hook === "function")
      .reduce((v, hook) => v.then((v) => hook<typeof v>(v)), value);
  };


export default createQueryFunction;
