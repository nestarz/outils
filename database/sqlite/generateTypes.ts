import generateDatabaseTypes, {
  type DatabaseType,
  type GenerateDatabaseTypesConfig,
} from "../generateDatabaseTypes.ts";

export const sqliteToTypescriptTypes = {
  TEXT: "string",
  INTEGER: "number",
  REAL: "number",
  BLOB: "ArrayBuffer",
};

export const sqliteQuery = (): string => `
SELECT
    'public' as schema_name, 
    json_group_array(
        json_object(
            'table_name', table_name,
            'columns', columns
        ) 
    ) as tables
FROM 
    (
        SELECT 
            m.name as table_name, 
            json_group_array(
                json_object(
                    'column_name', p.name,
                    'data_type', p.type, 
                    'is_nullable', CASE WHEN p."notnull" = 1 OR p."pk" = 1 THEN false ELSE true END
                )
            ) as columns
        FROM 
            sqlite_master as m
        JOIN 
            pragma_table_info((m.name)) as p
        WHERE 
            m.type = 'table'
        GROUP BY 
            m.name
    );
`;

export const generateSqliteTypes = (
  {
    filename = "types.sqlite.d.ts",
    ...props
  }: Partial<GenerateDatabaseTypesConfig> = {
    filename: "types.sqlite.d.ts",
  },
): DatabaseType =>
  generateDatabaseTypes({
    filename,
    ...props,
    getRows: props.getRows ??
      (((v: any) =>
        v.map((schema: any) => ({
          ...schema,
          tables: JSON.parse(schema.tables).map((table: any) => ({
            ...table,
            columns: JSON.parse(table.columns),
          })),
        }))) as any),
    getStructure: sqliteQuery,
    dialectToTypescriptTypes: sqliteToTypescriptTypes,
  });

export default generateSqliteTypes;
