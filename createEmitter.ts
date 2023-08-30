type EmitFn<T> = (value: T) => void;
type ThrowFn = (error: Error) => void;
type Resolver = (() => void) | null;
type AsyncIterable<T> = {
  next: () => Promise<{ value: T; done: boolean }>;
  throw: ThrowFn;
};

type Emitter<T> = {
  emit: EmitFn<T>;
  throw: ThrowFn;
  [Symbol.asyncIterator]: () => AsyncIterable<T>;
};

export function createEmitter<T>(): Emitter<T> {
  const queue: Array<Promise<T>> = [];
  let resolve: Resolver = null;

  const push: EmitFn<Promise<T>> = (promise) => {
    queue.push(promise);
    if (resolve) {
      resolve();
      resolve = null;
    }
  };

  const emitError: ThrowFn = (e) => push(Promise.reject(e));

  return {
    emit: (v: T) => push(Promise.resolve(v)),
    throw: emitError,

    [Symbol.asyncIterator]: (): AsyncIterable<T> => ({
      next: async (): Promise<{ value: T; done: boolean }> => {
        while (!queue.length) await new Promise<void>((res) => (resolve = res));
        return { value: await queue.pop()!, done: false };
      },
      throw: emitError,
    }),
  };
}

export default createEmitter;
