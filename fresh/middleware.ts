import type { FreshContext, Handler } from "../createRenderPipe.ts";

export type MiddlewareHandler<State = Record<string, unknown>> = (
  req: Request,
  ctx: FreshContext<State>,
) => Response | Promise<Response>;

export interface Middleware<State = Record<string, unknown>> {
  handler: MiddlewareHandler<State> | MiddlewareHandler<State>[];
}

type CreateMiddleware = (
  req: Request,
  conn: Deno.ServeHandlerInfo,
  params: Record<string, string>,
) => Promise<Response>;

export const middleware = (
  ...fns: [...(MiddlewareHandler | MiddlewareHandler[])[], Handler]
): CreateMiddleware => {
  const flatten = fns.flat(10);
  return async (
    req: Request,
    conn: Deno.ServeHandlerInfo,
    params: Record<string, string>,
  ): Promise<Response> => {
    const ctx: FreshContext = {
      remoteAddr: conn.remoteAddr,
      params,
      url: new URL(req.url),
      state: {},
      render: () => new Response(null, { status: 404 }),
      // deno-lint-ignore no-explicit-any
      Component: () => null as any,
      data: null,
      next: () => Promise.resolve(new Response(null, { status: 500 })),
    };
    const createNext = (i: number): FreshContext => ({
      ...ctx,
      next: async () =>
        await (flatten[i] as MiddlewareHandler)(req, createNext(i + 1)),
    });
    return await (flatten[0] as MiddlewareHandler)?.(req, createNext(1));
  };
};

export default middleware;
