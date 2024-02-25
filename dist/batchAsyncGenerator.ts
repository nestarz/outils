export async function* batchAsyncGenerator<T>(
  asyncGen: AsyncGenerator<T, void, unknown>,
  batchSize: number
): AsyncGenerator<T[], void, unknown> {
  let batch: T[] = [];
  for await (const item of asyncGen)
    if (batch.push(item) === batchSize) {
      yield batch;
      batch = [];
    }
  if (batch.length > 0) yield batch;
}

export default batchAsyncGenerator;
