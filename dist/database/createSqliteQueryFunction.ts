import type { QueryParameter, RowObject } from "https://deno.land/x/sqlite@v3.8/mod.ts";
import type {
  Kysely,
  CompiledQuery,
  InferResult,
} from "https://esm.sh/kysely@0.26.3?dts";

export type QueryFn = <O extends RowObject = RowObject>(
  sql: string,
  values?: QueryParameter[],
) => Promise<Array<O>>;

export const createQueryFunction = <V,>(
  query: QueryFn,
  qb: Kysely<V>,
  hooks?: (<X>(...v: any[]) => X)[],
) =>
<T extends CompiledQuery>(fn: (qb: Kysely<V>) => T) => {
  const { sql, parameters } = fn(qb);
  const value = Promise.resolve(
    query<InferResult<T>[0]>(
      sql,
      parameters as unknown as Parameters<typeof query>[1],
    ),
  );
  return (hooks ?? [])
    .filter((hook) => typeof hook === "function")
    .reduce((v, hook) => v.then((v) => hook<typeof v>(v)), value);
};

export default createQueryFunction;
