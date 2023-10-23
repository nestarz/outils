import type {
  CompiledQuery,
  InferResult,
  Kysely,
} from "https://esm.sh/kysely@0.26.3?dts";

const createQueryFunction = <V>(
  query: <P>(
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: P }> | { rows: P },
  qb: Kysely<V>,
  hooks?: (<X>(...v: any[]) => X)[],
) =>
<T extends CompiledQuery>(fn: (qb: Kysely<V>) => T) => {
  const { sql, parameters } = fn(qb);
  const value = Promise.resolve(
    query<InferResult<T>[0]>(
      sql,
      parameters as unknown[],
    ),
  );
  return (hooks ?? [])
    .filter((hook) => typeof hook === "function")
    .reduce((v, hook) => v.then((v) => hook<typeof v>(v)), value);
};

export default createQueryFunction;
