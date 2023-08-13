export interface SSEContext {
  sse: {
    dispatch: (msg: string) => void;
    controller: ReadableStreamDefaultController<any>;
    readableStream: ReadableStream;
  };
}

export const sse =
  <T, U, V>(
    fn: (arg1: T, arg2: U & SSEContext) => V,
    options?: {
      requestInit?: ResponseInit;
      encode: (payload: unknown) => string;
    }
  ) =>
  (req: T, ctx: U) => {
    const readableStream = new ReadableStream({
      start(controller) {
        const encode =
          options?.encode ??
          ((msg: string) => new TextEncoder().encode(`data: ${msg}\r\n\r\n`));
        controller.enqueue(encode("open"));
        const dispatch = (msg: string) => controller.enqueue(encode(msg));
        const sse = { dispatch, controller, readableStream };
        fn(req, { ...ctx, sse });
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
