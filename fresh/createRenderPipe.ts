import type {
  FreshContext,
  Handlers,
  PropHandler,
  RenderPipe,
  RequestHandler,
  VNode,
} from "./types.ts";

export const createRenderPipe: RenderPipe = (config) => (route) => ({
  handler: async (req, ctx) => {
    const url = new URL(req.url);
    const render = route.component
      ? (data?: Record<string, unknown>) =>
        Promise.resolve(
          typeof route.handler === "function" || route.handler?.GET
            ? (route.component as PropHandler<any>)?.({ url, ctx, data })
            : (route.component as RequestHandler<any>)?.(req, ctx),
        ).then((node) =>
          node instanceof Response
            ? node
            : !node
            ? Promise.reject("Missing Response or JSXElement")
            : Promise.resolve({ ...ctx, Component: () => node })
              .then(
                (ctx) =>
                  (config?.Layout?.default(req, ctx) as Promise<
                    typeof node
                  >) ?? node,
              )
              .then((virtualNode: VNode) =>
                config.virtualNodePipe(req, {
                  ...ctx,
                  state: { ...ctx.state, virtualNode },
                })
              )
              .then((result) =>
                result instanceof Response ? result : new Response(result, {
                  headers: {
                    "content-type": "text/html; charset=utf-8",
                  },
                })
              )
        )
      : undefined;

    return await Promise.resolve({ ...ctx, render: render! } as FreshContext)
      .then(
        (ctx) =>
          (typeof route.handler === "function"
            ? route.handler
            : route.handler?.[req.method as keyof Handlers])?.(req, ctx) ??
            (req.method === "GET" ||
                req.headers.get("accept") === "text/x-component"
              ? render?.()
              : new Response(null, { status: 404 })),
      )
      .then((response) => response ?? Promise.reject("Missing Response"))
      .catch((err) => (console.error(err), Promise.reject(err)))
      .catch(() => new Response(null, { status: 500 }));
  },
});

export default createRenderPipe;
