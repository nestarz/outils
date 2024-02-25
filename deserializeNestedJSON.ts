export type AnyJson = boolean | number | string | null | JsonArray | JsonMap;
export interface JsonMap {
  [key: string]: AnyJson;
}
// deno-lint-ignore no-empty-interface
export interface JsonArray extends Array<AnyJson> {}

export const deserializeNestedJSON = <T extends AnyJson = AnyJson>(
  payload: T,
  regex = /\b(?:((?:\w*_)*)(json)((?:_\w*)*))\b/,
): T => {
  const tryParseJSON = (str: string): AnyJson => {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    } // prettier-ignore
  };
  const parseJSONKeys = <T extends AnyJson = AnyJson>(
    obj: AnyJson,
    test: (key: string) => boolean,
  ): T => {
    if (typeof obj === "number") return obj as T;
    if (typeof obj === "boolean") return obj as T;
    if (typeof obj === "string") return obj as T;
    if (obj === null) return obj as T;

    const result = (Array.isArray(obj) ? [] : {}) as JsonMap | JsonArray;
    const isArray = Array.isArray(result);

    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        const value = Array.isArray(obj)
          ? obj[key as any as number]
          : obj[key as string];
        if (typeof value === "object" && value !== null) {
          const newValue = parseJSONKeys<AnyJson>(value, test);
          if (isArray) result[key as any as number] = newValue;
          else result[key as string] = newValue;
        } else if (typeof value === "string" && test(key)) {
          if (isArray) {
            result[key as any as number] = tryParseJSON(value as string);
          } else result[key as string] = tryParseJSON(value as string);
        } else {
          if (isArray) {
            result[key as any as number] = value;
          } else result[key as string] = value;
        }
      }
    }
    return result as T;
  };

  return parseJSONKeys<T>(payload, (key) => regex.test(key));
};

export default deserializeNestedJSON;
