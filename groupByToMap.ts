export function groupByToMap<T, K>(
  array: T[],
  callback: (arg: T) => K
): Map<K, T[]> {
  if (!Array.isArray(array))
    throw new TypeError(`Can’t call method on ${array}`);
  if (typeof callback !== "function")
    throw new TypeError(`${callback} is not a function`);

  const result = new Map<K, T[]>();
  array.forEach((value: T) => {
    const key: K = callback(value);
    const collection: T[] = result.get(key) || [];
    collection.push(value);
    result.set(key, collection);
  });

  return result;
}

const preferNative: typeof groupByToMap = (array, callback) => {
  // @ts-ignore: ponyfill Map.groupBy
  if (Map.prototype.groupBy !== undefined)
    // @ts-ignore: ponyfill Map.groupBy
    return Map.prototype.groupBy(array, callback);
  return groupByToMap(array, callback);
};

const groupByToArray = <T, K>(
  ...params: Parameters<typeof groupByToMap<T, K>>
) => [...groupByToMap(params[0], params[1]))];

export default preferNative;
