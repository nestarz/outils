type Mapping<T> = [string | number | null | undefined, T[]];
type MappedGroup<T> = Mapping<T>[];
type Group<T> = { [key: string | number]: T[] };

type Callback<T> = (value: T, index: number, array: T[]) => string | number;
type Ponyfill<T> = (
  array: T[],
  callback: Callback<T>
) => Map<MappedGroup<T>[0][0], MappedGroup<T>[0][1]>;

export const groupToMap: Ponyfill<any> = (array, callback) => {
  if (!Array.isArray(array)) {
    throw new TypeError(`Can’t call method on ${array}`);
  }
  if (typeof callback !== "function") {
    throw new TypeError(`${callback} is not a function`);
  }

  const result: Group<any> = {};
  const indices: { [key: string | number]: number } = {};
  let count = -1;

  array.forEach((value, index, array) => {
    const key = callback(value, index, array);
    if (indices[key] === undefined) indices[key] = ++count;
    if (result[key] === undefined) result[key] = [];
    result[key].push(value);
  });

  const mappedResult: MappedGroup<any> = [];
  for (const key in result) {
    if (Object.hasOwnProperty.call(result, key)) {
      const resolvedKey = key === "undefined" ? undefined : key;
      mappedResult[indices[key]] = [resolvedKey, result[key]];
    }
  }
  return new Map(mappedResult);
};

const preferNative: Ponyfill<any> = (array, callback) => {
  if (Array.prototype.groupToMap !== undefined) {
    // @ts-ignore
    return array.groupToMap(callback);
  }
  return groupToMap(array, callback);
};

export default preferNative;
