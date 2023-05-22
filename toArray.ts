export default <T extends unknown>(value: Array<T> | T): Array<T> =>
  Array.isArray(value) ? value : value ? [value] : [];
