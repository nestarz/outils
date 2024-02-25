export type SelfReferencingPromise<T> = Promise<{
  done?: boolean;
  value: T;
  gen: AsyncGenerator<T>;
  promise: SelfReferencingPromise<T>;
}>;

export async function* interleaveAsyncGenerators<T>(
  iterable: AsyncGenerator<T>[]
): AsyncGenerator<T, void, unknown> {
  const generators = [...iterable];
  const next = (gen: AsyncGenerator<T>) => {
    const promise: SelfReferencingPromise<T> = gen
      .next()
      .then(({ done, value }) => ({ done, value, gen, promise }));
    return promise;
  };

  const promises = new Set<SelfReferencingPromise<T>>(generators.map(next));
  while (promises.size > 0) {
    const { done, value, gen, promise } = await Promise.race(promises);
    promises.delete(promise);

    if (!done) {
      promises.add(next(gen));
      yield value;
    }
  }
}

export async function* batchedInterleaveAsyncGenerators<T>(
  batches: AsyncGenerator<T, unknown, unknown>[],
  k = 10
) {
  for (let i = 0; i < batches.length; i += k)
    for await (const data of interleaveAsyncGenerators(batches.slice(i, i + k)))
      yield data;
}

export default interleaveAsyncGenerators;
