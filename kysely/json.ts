import type { Expression, RawBuilder, Simplify } from "https://esm.sh/kysely@0.26.1?dts";
import { sql } from "https://esm.sh/kysely@0.26.1?dts";

export const jsonObjectFrom = <O>(
  expr: Expression<O>
): RawBuilder<Simplify<O> | null> =>
  sql`(select to_json(obj) from ${expr} as obj)`;

export const jsonAggToJsonObjectFrom = <O>(
  expr: Expression<O>
): RawBuilder<Simplify<O[]> | null> =>
  sql`(select json_agg(to_json(obj)) from ${expr} as obj)`;
