import type { ConnInfo } from "https://deno.land/std@0.190.0/http/server.ts";
import type { MiddlewareHandlerContext } from "https://deno.land/x/fresh@1.1.6/server.ts";

export interface Middleware {
  (request: Request, ctx: MiddlewareHandlerContext):
    | Response
    | Promise<Response>;
}

export const middleware =
  (...fns: Middleware[]) =>
  async (
    req: Request,
    conn: ConnInfo,
    params: Record<string, string>
  ): Promise<Response> => {
    const destination = "route" as MiddlewareHandlerContext["destination"];
    const ctx = { ...conn, params, state: {}, destination };
    const createNext = (i: number): MiddlewareHandlerContext => ({
      ...ctx,
      next: async () => await fns[i](req, createNext(i + 1)),
    });
    return await fns[0]?.(req, createNext(1));
  };

export default middleware;
