export interface SSEContext {
  dispatch: (msg: string) => void;
  streamsControllers: Map<
    string,
    {
      controller: ReadableStreamDefaultController<unknown>;
      readableStream: ReadableStream;
      reuseKey: string;
    }
  >;
}

const createId = ((id = 0) => () => id++)(); // prettier-ignore

const promiseCache = new Map<
  string,
  { sse: SSEContext; promise: Promise<unknown> }
>();

export const sse =
  <T, U, V>(
    fn: (arg1: T, arg2: U & { sse: SSEContext }) => V,
    options?: {
      requestInit?: ResponseInit;
      encode?: (payload: unknown) => string;
      reuseKeyFn?: (req: T, ctx: U) => string[] | Promise<string[]>;
    }
  ) =>
  async (req: T, ctx: U) => {
    const streamKey = createId().toString();
    const reuseKey =
      (await options?.reuseKeyFn?.(req, ctx))?.join(",") ?? streamKey;

    const encode =
      options?.encode ??
      ((msg: string) => new TextEncoder().encode(`data: ${msg}\r\n\r\n`));
    const createDispatch =
      (streams: SSEContext["streamsControllers"]) => (msg: string) => {
        streams.forEach(({ reuseKey: key, readableStream, controller }) => {
          if (!readableStream.locked && key === reuseKey) {
            try {
              controller.enqueue(encode(msg));
            } catch {
              promiseCache
                .get(reuseKey)
                ?.sse.streamsControllers.delete(streamKey);
            }
          }
        });
      };

    const readableStream = new ReadableStream({
      start(controller) {
        if (!promiseCache.has(reuseKey)) {
          const streamsControllers: SSEContext["streamsControllers"] =
            new Map();
          const sse = {
            streamsControllers,
            dispatch: createDispatch(streamsControllers),
          };
          promiseCache.set(reuseKey, {
            promise: Promise.resolve(fn(req, { ...ctx, sse })),
            sse,
          });
        }
        const cached = promiseCache.get(reuseKey);
        cached?.sse.streamsControllers.set(streamKey, {
          readableStream: this as ReadableStream,
          controller,
          reuseKey,
        });
        cached?.promise
          .then(() => controller.close())
          .finally(() => promiseCache.delete(reuseKey));
      },
      cancel() {
        promiseCache.get(reuseKey)?.sse.streamsControllers.delete(streamKey);
      },
    });
    return new Response(readableStream, {
      ...(options?.requestInit ?? {}),
      headers: {
        "Content-Type": "text/event-stream",
        ...(options?.requestInit?.headers ?? {}),
      },
    });
  };

export default sse;
