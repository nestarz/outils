export const unique =
  <T>(fn: (item: T) => unknown): ((a: T, i: number, arr: T[]) => boolean) =>
  (a, i, arr) =>
    i === arr.findIndex((b) => fn(a) === fn(b));

export default unique;
