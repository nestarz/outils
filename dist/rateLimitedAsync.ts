type AsyncFunction<T extends (...args: any[]) => any> = T extends (
  ...args: infer A
) => Promise<infer R>
  ? (...args: A) => Promise<R>
  : never;

export function rateLimitedAsync<
  T extends (...args: any[]) => any,
  C = unknown
>(fn: T, n: number): AsyncFunction<T> {
  let pendingPromises: Array<Promise<any>> = [];

  return async function (this: C, ...args: Parameters<T>) {
    while (pendingPromises.length >= n) {
      await Promise.race(pendingPromises);
    }

    const p = fn.apply(this, args);
    pendingPromises.push(p);
    await p;
    pendingPromises = pendingPromises.filter((pending) => pending !== p);
    return p;
  } as AsyncFunction<T>;
}

export default rateLimitedAsync;
