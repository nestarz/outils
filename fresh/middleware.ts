import type {
  Handler,
  MiddlewareHandler,
  MiddlewareHandlerContext,
} from "https://deno.land/x/fresh@1.5.4/server.ts";

export const middleware =
  // deno-lint-ignore no-explicit-any
  (...fns: [...MiddlewareHandler<any>[], Handler]) =>
  async (
    req: Request,
    conn: Deno.ServeHandlerInfo,
    params: Record<string, string>,
  ): Promise<Response> => {
    const destination = "route" as MiddlewareHandlerContext["destination"];
    const ctx = {
      remoteAddr: conn.remoteAddr,
      localAddr: { transport: "tcp" } as Deno.NetAddr,
      hostname: "",
      params,
      state: {},
      destination,
    };
    // deno-lint-ignore no-explicit-any
    const createNext = (i: number): MiddlewareHandlerContext<any> => ({
      ...ctx,
      next: async () =>
        await (fns[i] as MiddlewareHandler)(req, createNext(i + 1)),
    });
    return await (fns[0] as MiddlewareHandler)?.(req, createNext(1));
  };

export default middleware;
