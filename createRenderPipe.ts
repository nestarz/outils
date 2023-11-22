import type {
  AsyncLayout,
  Handler,
  HandlerContext,
  Handlers,
} from "https://deno.land/x/fresh@1.5.4/src/server/types.ts";

type JSXElement = { type: any; props: any; key: string };
type RequestHandler<VNode extends JSXElement = JSXElement> = (
  req: Request,
  ctx: HandlerContext<any, any>,
) => Promise<VNode | Response>;
type PropHandler<VNode extends JSXElement = JSXElement> = (
  props: Record<string, unknown>,
) => Promise<VNode | Response>;
export type RouteConfig<VNode extends JSXElement = JSXElement> = {
  default?: RequestHandler<VNode> | PropHandler<VNode>;
  handler?: Handler<any, any> | Handlers<any, any>;
  config?: { routeOverride?: string };
};

export const createRenderPipe =
  // deno-lint-ignore no-explicit-any
  <VNode extends JSXElement>(
    virtualNodePipe: (
      vn: VNode,
    ) => Promise<BodyInit | null | undefined | Response>,
  ) =>
  (
    route: RouteConfig<VNode>,
    config?: {
      responseInit?: ResponseInit;
      // deno-lint-ignore no-explicit-any
      Layout?: { default: AsyncLayout<any, any> };
    },
  ) =>
  (req: Request, rawCtx: HandlerContext, matcher?: Record<string, string>) => {
    const url = new URL(req.url);
    const ctx = {
      ...rawCtx,
      params: matcher ?? {},
      url,
      route: route.config?.routeOverride ?? null!,
      data: null!,
      virtualNodePipe,
    };

    const render = route.default
      ? (data?: Record<string, unknown>) =>
        Promise.resolve(
          typeof route.handler === "function" || route.handler?.GET
            ? (route.default as RequestHandler<VNode>)?.(req, ctx)
            : (route.default as PropHandler<VNode>)?.({ url, ctx, data }),
        )
          .then((node) =>
            node instanceof Response
              ? node
              : !node
              ? Promise.reject("Missing Response or JSXElement")
              : Promise.resolve({ ...ctx, Component: () => node })
                .then((ctx) =>
                  (config?.Layout?.default(req, ctx) as Promise<typeof node>) ??
                    node
                )
                .then(virtualNodePipe)
                .then(
                  (result) =>
                    result instanceof Response ? result : new Response(result, {
                      headers: { "content-type": "text/html; charset=utf-8" },
                    }),
                )
          )
      : undefined;

    return Promise.resolve({ ...ctx, render: render! })
      .then((ctx) =>
        (typeof route.handler === "function"
            ? route.handler
            : route.handler?.[req.method as keyof Handlers])?.(req, ctx) ??
            req.method === "GET"
          ? render?.()
          : new Response(null, { status: 404 })
      )
      .then((response) => response ?? Promise.reject("Missing Response"))
      .catch((err) => (console.error(err), Promise.reject(err)))
      .catch(() => new Response(null, { status: 500 }));
  };

export default createRenderPipe;
