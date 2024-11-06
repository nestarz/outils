import {
  dateRegex,
  type Deserializer,
  skipTransform,
} from "kysely-plugin-serialize";

export const nestedJsonDeserializer: Deserializer = (parameter) => {
  if (skipTransform(parameter)) {
    return parameter;
  }

  if (typeof parameter === "string") {
    if (parameter === "true") {
      return true;
    } else if (parameter === "false") {
      return false;
    } else if (dateRegex.test(parameter)) {
      return new Date(parameter);
    } else if (
      (parameter.startsWith("{") && parameter.endsWith("}")) ||
      (parameter.startsWith("[") && parameter.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(parameter);
        return deserializeNestedJson(parsed);
      } catch {
        // If parsing fails, return the original string
        return parameter;
      }
    }
  }

  return parameter;
};

function deserializeNestedJson(value: any): any {
  if (Array.isArray(value)) {
    return value.map((item) => deserializeNestedJson(item));
  } else if (typeof value === "object" && value !== null) {
    const result: { [key: string]: any } = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = deserializeNestedJson(nestedValue);
    }
    return result;
  } else if (typeof value === "string") {
    return nestedJsonDeserializer(value);
  }
  return value;
}
