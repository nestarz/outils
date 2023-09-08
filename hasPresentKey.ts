export function hasPresentKey<K extends string | number | symbol>(k: K) {
  return function <T, V>(
    a: T & { [k in K]?: V | null }
  ): a is T & { [k in K]: V } {
    return a[k] !== undefined && a[k] !== null;
  };
}

export default hasPresentKey;
