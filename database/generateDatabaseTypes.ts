const join = (...args: string[]): string => args.join("_");

const snakeToPascal = (input: string): string =>
  input
    .split("_")
    .reduce(
      (previous, current) =>
        previous + current.charAt(0).toUpperCase() + current.slice(1),
      [] as unknown as string
    );

type Column = { column_name: string; data_type: string; is_nullable: boolean };

const generateInterface = (name: string, columns: Column[]): string =>
  `export interface ${snakeToPascal(name)} {\n${columns
    .map(
      ({ column_name, is_nullable, data_type }) =>
        `  ${column_name}${is_nullable ? "?" : ""}: ${data_type};`
    )
    .join("\n")}\n}`;

export interface Schema {
  schema_name: string;
  tables: { table_name: string; columns: Column[] }[];
}

export const genTypes = (
  dialectToTypescriptTypes: Record<string, string>,
  schemas: Schema[]
): string => {
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
            data_type: dialectToTypescriptTypes[data_type] ?? "unknown",
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

export interface GenerateDatabaseTypesConfig {
  filename: string;
  getRows: <T>(value: T) => Schema[] | undefined;
  getStructure: () => string;
  dialectToTypescriptTypes: Record<string, string>;
}

type Fn = (
  query: string
) => Schema[] | Promise<Schema[] | undefined> | undefined;

export type DatabaseType = {
  get: (fn: Fn) => Promise<string>;
  save: (fn: Fn) => Promise<void>;
};

export const generateDatabaseTypes = ({
  filename = "types.db.d.ts",
  getRows = (v) => v as ReturnType<GenerateDatabaseTypesConfig["getRows"]>,
  getStructure,
  dialectToTypescriptTypes,
}: GenerateDatabaseTypesConfig): DatabaseType => {
  let fetchedTypes = false;
  const get = (fn: Fn) =>
    Promise.resolve(fn(getStructure())).then((results) =>
      genTypes(dialectToTypescriptTypes, getRows(results) as any)
    );

  return {
    get,
    save: async (fn) => {
      const withWriteAccess = await Deno.permissions
        .query({ name: "write", path: Deno.cwd() })
        .then((d) => d.state === "granted");

      if (!fetchedTypes && withWriteAccess) {
        fetchedTypes = true;
        get(fn)
          .then(async (types) => {
            if (!filename) return console.warn("missing filename");
            const cache = await Deno.readTextFile(filename).catch(() => null);
            if (cache !== types) await Deno.writeTextFile(filename, types);
          })
          .catch((err) => {
            fetchedTypes = false;
            console.error(err);
          });
      }
    },
  };
};

export default generateDatabaseTypes;
