import type {
  FreshContext,
  MiddlewareModule,
  PluginMiddleware,
} from "./types.ts";

type NestedArray<T> = (T | T[])[];

const normalize = (
  item?: MiddlewareModule | PluginMiddleware | undefined | null,
): MiddlewareModule | undefined => {
  if (!item) return undefined;
  if ("path" in item) {
    return { name: item.path, handler: item.middleware.handler };
  }
  return item as MiddlewareModule;
};

export const composeMiddlewares = (
  middlewares: NestedArray<
    MiddlewareModule<any> | PluginMiddleware | null | undefined
  >,
): (req: Request, ctx: FreshContext) => Promise<Response> => {
  return async (req, ctx) => {
    const handlers: (() => Response | Promise<Response>)[] = [];
    ctx.next = async () => {
      const handler = handlers.shift()!;
      try {
        // As the `handler` can be either sync or async, depending on the user's code,
        // the current shape of our wrapper, that is `() => handler(req, middlewareCtx)`,
        // doesn't guarantee that all possible errors will be captured.
        // `Promise.resolve` accept the value that should be returned to the promise
        // chain, however, if that value is produced by the external function call,
        // the possible `Error`, will *not* be caught by any `.catch()` attached to that chain.
        // Because of that, we need to make sure that the produced value is pushed
        // through the pipeline only if function was called successfully, and handle
        // the error case manually, by returning the `Error` as rejected promise.
        const result = await handler();
        return Promise.resolve(result);
      } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
          return Promise.resolve(new Response(null, { status: 500 }));
        }
        return Promise.reject(e);
      }
    };

    for (
      const middleware of middlewares
        .flat()
        .map(normalize)
        .flatMap((f) => (f ? [f] : []))
    ) {
      if (middleware.handler instanceof Array) {
        for (const handler of middleware.handler) {
          handlers.push(() => handler(req, ctx));
        }
      } else {
        const handler = middleware.handler;
        handlers.push(() => handler(req, ctx));
      }
    }

    return await ctx.next().catch((err) => {
      console.error(err);
      return new Response(null, { status: 500 });
    });
  };
};
