import type { HandlerContext } from "https://deno.land/x/fresh@1.4.2/server.ts";

export const createHandleRequestWithRouteConfiguration =
  (...pipeFns: ((vnode: VNode) => ReadableStream)[]) =>
  (route: {
    default: ((props: Record<string, unknown>) => VNode) | Handlers["GET"];
    handler: Handlers;
  }) =>
  (req: Request, ctx: HandlerContext, matcher?: Record<string, string>) => {
    const url = new URL(req.url);
    const newCtx = matcher ? { ...ctx, params: matcher, url } : { ...ctx, url };
    const props = { url, ctx: newCtx };
    const render = route.default
      ? pipe(
          (data: unknown) =>
            route.handler?.GET ? [{ ...props, data }] : [req, newCtx],
          ([p1, p2]) => route.default?.(p1, p2),
          ...pipeFns,
          (body: ReadableStream | string) =>
            new Response(body, { headers: { "content-type": "text/html" } })
        )
      : undefined;
    return (
      route.handler?.[req.method]?.(req, { ...newCtx, render }) ??
      (req.method === "GET" ? render?.() : new Response(null, { status: 404 }))
    );
  };

export default createHandleRequestWithRouteConfiguration;
