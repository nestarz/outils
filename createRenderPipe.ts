import type {
  AsyncLayout,
  HandlerContext,
  Handlers,
} from "https://deno.land/x/fresh@1.5.4/src/server/types.ts";

type JSXElement = { type: any; props: any; key: string };
type RequestHandler<VNode extends JSXElement = JSXElement> = (
  req: Request,
  ctx: HandlerContext,
) => Promise<VNode>;
type PropHandler<VNode extends JSXElement = JSXElement> = (
  props: Record<string, unknown>,
) => Promise<VNode>;
export type RouteConfig<VNode extends JSXElement = JSXElement> = {
  default: RequestHandler<VNode> | PropHandler<VNode>;
  handler?: Handlers;
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
    config?: { responseInit?: ResponseInit; Layout?: { default: AsyncLayout } },
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
          route.handler?.GET
            ? (route.default as RequestHandler<VNode>)?.(req, ctx)
            : (route.default as PropHandler<VNode>)?.({ url, ctx, data }),
        )
          .then((node) =>
            node instanceof Response
              ? node
              : !node
              ? Promise.reject("Missing Response")
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
        route.handler?.[req.method as keyof Handlers]?.(req, ctx) ??
            req.method === "GET"
          ? render?.()
          : new Response(null, { status: 404 })
      )
      .then((response) => response ?? Promise.reject("Missing Response"))
      .catch((err) => (console.error(err), Promise.reject(err)))
      .catch(() => new Response(null, { status: 500 }));
  };

export default createRenderPipe;
