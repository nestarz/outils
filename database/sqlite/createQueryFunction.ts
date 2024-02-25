import type { Kysely, CompiledQuery, InferResult } from "kysely";

export type RowObject = { [x: string]: unknown };

// prettier-ignore
export type QueryParameter = string | number | bigint | boolean | Date | Uint8Array | null | undefined;

export type QueryFn = <O extends RowObject = RowObject>(
  sql: string,
  values?: QueryParameter[]
) => Promise<Array<O>>;

export type QueryFunction<V> = <T extends CompiledQuery<unknown>>(
  fn: (qb: Kysely<V>) => T
) => Promise<InferResult<T>[0][]>;

export const createQueryFunction =
  <V>(
    query: QueryFn,
    qb: Kysely<V>,
    hooks?: (<X>(...v: any[]) => X)[]
  ): QueryFunction<V> =>
  <T extends CompiledQuery<unknown>>(fn: (qb: Kysely<V>) => T) => {
    const { sql, parameters } = fn(qb);
    const value = Promise.resolve(
      query<InferResult<T>[0]>(
        sql,
        parameters as unknown as Parameters<typeof query>[1]
      )
    );
    return (hooks ?? [])
      .filter((hook) => typeof hook === "function")
      .reduce((v, hook) => v.then((v) => hook<typeof v>(v)), value);
  };

export default createQueryFunction;
