export const toArray = <T extends unknown>(value: Array<T> | T): Array<T> =>
  Array.isArray(value) ? value : value ? [value] : [];

export default toArray;
