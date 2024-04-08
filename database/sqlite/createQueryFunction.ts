import type { CompiledQuery, InferResult, Kysely } from "kysely";

export type RowObject = { [x: string]: unknown };

// prettier-ignore
export type QueryParameter =
  | string
  | number
  | bigint
  | boolean
  | Date
  | Uint8Array
  | null
  | undefined;

export type QueryFn = <
  T extends CompiledQuery<unknown>,
>(
  sql: string,
  values?: QueryParameter[],
) => Promise<InferResult<T>>;

export type QueryFunction<V> = <T extends CompiledQuery<unknown>>(
  fn: (qb: Kysely<V>) => T,
) => Promise<InferResult<T>>;

export const createQueryFunction = <V>(
  query: QueryFn,
  qb: Kysely<V>,
  hooks?: (<X>(...v: any[]) => X)[],
): QueryFunction<V> =>
<T extends CompiledQuery<unknown>>(fn: (qb: Kysely<V>) => T) => {
  const { sql, parameters } = fn(qb);
  const value = Promise.resolve(
    query<T>(
      sql,
      parameters as unknown as Parameters<typeof query>[1],
    ),
  );
  return (hooks ?? [])
    .filter((hook) => typeof hook === "function")
    .reduce((v, hook) => v.then((v) => hook<typeof v>(v)), value);
};

export default createQueryFunction;
