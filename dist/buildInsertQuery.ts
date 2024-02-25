import {
  Kysely,
  PostgresDialect,
  type PostgresDialectConfig,
  sql,
} from "https://esm.sh/kysely@0.26.1?dts";

type QueryData = {
  references: string;
  key: string;
  on_conflict?: {
    constraint: string | string[];
    update_columns: string[];
  };
  data:
    | Record<string, string | number | Date | QueryData | undefined>[]
    | Record<string, string | number | Date | QueryData | undefined>;
};

type OnConflict = {
  constraint: string | string[];
  update_columns: string[];
};

type TableData = Record<string, TableObj | string | number>;
type TableObj = {
  references: string;
  on_conflict?: OnConflict;
  key: string;
  data: TableData[];
};

const getHashSync = (str: string) =>
  String(
    str.split("").reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
  ).replace(/-/g, "");

const unique = (fn) => (a, i, arr) =>
  i === arr.findIndex((b) => fn(a) === fn(b));

const toArray = <T>(arr: T): T => (Array.isArray(arr) ? arr : [arr]);

const concat = (...args: string[]) => args.join("_");
const cte = (...str: string[]) => concat("cte", ...str);
function pick<T extends Record<string, unknown>>(
  obj: T,
  options: string[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj)
    if (options.includes(key) && Object.hasOwn(obj, key))
      result[key] = obj[key];
  return result;
}

const db = new Kysely<any>({
  dialect: new PostgresDialect({} as PostgresDialectConfig),
});

const extractReferences = (data: TableObj): TableObj[] => {
  const extracted: TableObj[] = [];
  let i = 0;
  const cache: Record<string, Map<string, number>> = {};

  function traverse(obj: TableData, extracted: TableObj[], id = null) {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === "object") {
        if (Object.hasOwn(obj[key], "references")) {
          const ref: TableObj = obj[key];
          const existing = extracted.find(
            (item) => item.table === ref.references
          );
          const data = toArray(ref.data).map((data: Record<string, TableObj>) =>
            Object.fromEntries(
              Object.entries(data).map(([k, v]) => {
                if (v?.references) {
                  const keyData = Array.isArray(v.on_conflict?.constraint)
                    ? pick(v.data, v.on_conflict.constraint)
                    : v.data;
                  const hash = getHashSync(JSON.stringify(keyData));
                  cache[v.references] ??= new Map();
                  const index =
                    cache[v.references].get(hash) ??
                    cache[v.references]
                      .set(
                        hash,
                        Math.max(-1, ...cache[v.references].values()) + 1
                      )
                      .get(hash);
                  return [
                    k,
                    db
                      .selectFrom(cte(v.references, "ids"))
                      .select(
                        (s) => sql`${s.ref("ids")}[${sql.raw(index + 1)}]`
                      ),
                  ];
                }
                return [k, v];
              })
            )
          );
          if (existing) existing.data.push(...data);
          else
            extracted.push({
              table: ref.references,
              key: ref.key,
              on_conflict: ref.on_conflict,
              data,
            });
          traverse(ref.data, extracted, i++);
        } else {
          traverse(obj[key], extracted, id);
        }
      }
    }
  }

  traverse({ references: "lol", data: [data] }, extracted);

  return extracted.reverse();
};

export const getQueryRaw = (query) =>
  query.sql.replace(/\$(\d+)/g, (_, $1) => {
    const a = query.parameters[parseInt($1) - 1];
    return Array.isArray(a)
      ? `ARRAY[${a.map((d) => `'${d}'`).join(",")}]`
      : a instanceof Date
      ? `'${new Date(a).toISOString()}'`
      : typeof a === "number" || !a
      ? a
      : typeof a === "string"
      ? `'${a.replace(/'/g, "''")}'`
      : a;
  });

const getRowId = (data, { on_conflict }) => {
  const keyData = Array.isArray(on_conflict?.constraint)
    ? pick(data, on_conflict.constraint)
    : data;
  const hash = getHashSync(JSON.stringify(keyData));
  return hash;
};

export const getColumnsFromTable = (table: string, schema = "public") =>
  db
    .selectFrom("information_schema.columns")
    .select("column_name")
    .where("table_schema", "=", schema)
    .where("table_name", "=", table)
    .compile();

export const buildInsertQuery = <T>(db: Kysely<T>, input: QueryData) => {
  const data = extractReferences(input);
  return (
    data.reduce((db, { table, key, data, on_conflict }) => {
      return db
        .with(cte(table), (db) => {
          const q = db
            .insertInto(table)
            .values(data.filter(unique((v) => getRowId(v, { on_conflict }))));
          return (
            !on_conflict
              ? q
              : q.onConflict((oc) => {
                  const oc2 = Array.isArray(on_conflict.constraint)
                    ? oc.columns(on_conflict.constraint)
                    : oc.constraint(on_conflict.constraint);
                  return oc2.doUpdateSet((eb) =>
                    on_conflict!.update_columns.reduce(
                      (prev, column) =>
                        Object.assign(prev, {
                          [column]: eb.ref("excluded.".concat(column)),
                        }),
                      {}
                    )
                  );
                })
          ).returningAll();
        })
        .with(cte(table, "ids"), (db) => {
          return db
            .selectFrom(cte(table))
            .select(({ fn }) => fn.agg("array_agg", [key]).as("ids"));
        });
    }, db) as Kysely<T>
  )
    .selectFrom(cte(data[data.length - 1].table))
    .selectAll();
};

export default buildInsertQuery;
