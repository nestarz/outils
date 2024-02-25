const join = (...args: string[]) => args.join("_");

const snakeToPascal = (input: string) =>
  input
    .split("_")
    .reduce(
      (previous, current) =>
        previous + current.charAt(0).toUpperCase() + current.slice(1),
      [] as unknown as string
    );

const postgresToTypescriptTypes = {
  ARRAY: "unknown[]",
  uuid: "string",
  jsonb: "JSONValue",
  date: "string",
  smallint: "number",
  "character varying": "string",
  text: "string",
  bytea: "Buffer",
  integer: "number",
  numeric: "number",
  "timestamp with time zone": "string",
  "double precision": "number",
};

type Column = { column_name: string; data_type: string; is_nullable: boolean };

const generateInterface = (name: string, columns: Column[]) =>
  `export interface ${snakeToPascal(name)} {\n${columns
    .map(
      ({ column_name, is_nullable, data_type }) =>
        `  ${column_name}${is_nullable ? "?" : ""}: ${data_type};`
    )
    .join("\n")}\n}`;

export const pgGenTypes = (
  schemas: {
    schema_name: string;
    tables: { table_name: string; columns: Column[] }[];
  }[]
) => {
  const tsFileContent = `type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;`;

  const tableInterfaces = schemas
    .flatMap(({ schema_name, tables }) =>
      tables.map((table) =>
        generateInterface(
          join(schema_name, table.table_name),
          table.columns.map(({ column_name, data_type, is_nullable }) => ({
            column_name,
            data_type: postgresToTypescriptTypes[data_type] ?? "unknown",
            is_nullable,
          }))
        )
      )
    )
    .join("\n");
  const schemaInterfaces = schemas
    .map((schema) =>
      generateInterface(
        schema.schema_name,
        schema.tables.map((table) => ({
          column_name: table.table_name,
          data_type: snakeToPascal(join(schema.schema_name, table.table_name)),
          is_nullable: false,
        }))
      )
    )
    .join("\n");
  const databaseInterface = generateInterface(
    "Database",
    schemas.map((schema) => ({
      column_name: schema.schema_name,
      data_type: snakeToPascal(schema.schema_name),
      is_nullable: false,
    }))
  );

  return [tsFileContent, tableInterfaces, schemaInterfaces, databaseInterface]
    .join("\n\n")
    .concat("\n");
};

export const postgresQuery = () => `
  WITH found_columns AS (
    SELECT
      table_schema,
      table_name,
      column_name,
      data_type,
      CASE
			  WHEN is_nullable = 'NO' THEN false
        ELSE true
      END AS is_nullable
    FROM
      information_schema.columns
    WHERE
      table_schema NOT IN('pg_catalog',
        'information_schema')
  ),
  column_info AS (
    SELECT
      table_schema,
      table_name,
      json_build_object(
        'column_name', column_name,
        'data_type', data_type, 
        'is_nullable', is_nullable
        ) AS column_data
    FROM
      found_columns
  ),
  grouped_columns AS (
    SELECT
      table_schema,
      table_name,
      json_agg(column_data) AS columns
    FROM
      column_info
    GROUP BY
      table_schema,
      table_name
  )
  SELECT
    table_schema AS schema_name,
    json_agg(json_build_object('table_name', table_name, 'columns', columns)) AS tables
  FROM
    grouped_columns
  GROUP BY
    table_schema;
`;

export const createPostgresTypes = () => {
  let fetchedTypes = false;
  const get = (fn: (query: string) => Promise<{ rows: any }>) =>
    fn(postgresQuery()).then(({ rows }) => pgGenTypes(rows as any));

  return {
    get,
    save: async (fn: Parameters<typeof get>[0]) => {
      const withWriteAccess = await Deno.permissions
        .query({ name: "write", path: Deno.cwd() })
        .then((d) => d.state === "granted");

      if (!fetchedTypes && withWriteAccess) {
        fetchedTypes = true;
        get(fn)
          .then(async (types) => {
            const cache = await Deno.readTextFile("types.pg.d.ts").catch(
              () => null
            );
            if (cache !== types)
              await Deno.writeTextFile("types.pg.d.ts", types);
          })
          .catch((err) => {
            fetchedTypes = false;
            console.error(err);
          });
      }
    },
  };
};

export default createPostgresTypes;
