export const deserializeNestedJSON = <T>(
  payload: T,
  regex = /\b(?:((?:\w*_)*)(json)((?:_\w*)*))\b/
) => {
  const tryParseJSON = (str: string): unknown => {
    try { return JSON.parse(str); } catch { return str; } // prettier-ignore
  };
  const parseJSONKeys = <T>(
    obj: JSON | undefined,
    test: (key: string) => boolean
  ): T => {
    const result = (Array.isArray(obj) ? [] : {}) as JSON;
    for (const key in obj)
      if (Object.hasOwn(obj, key))
        if (typeof obj[key] === "object" && obj[key] !== null)
          result[key] = parseJSONKeys<JSON>(obj[key] as JSON, test);
        else if (typeof obj[key] === "string" && test(key))
          result[key] = tryParseJSON(obj[key] as string);
        else result[key] = obj[key];
    return result as T;
  };

  return parseJSONKeys<T>(payload, (key) => regex.test(key));
};

export default deserializeNestedJSON;
