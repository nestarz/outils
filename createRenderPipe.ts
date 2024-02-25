import type { Plugin } from "./fresh/adaptFreshPlugin.ts";

// TODO:
type RenderFunction = Function;
type RouterOptions = any;
type ComponentType<T = any> = any;
type ComponentChildren<T = any> = any;
//

// deno-lint-ignore no-namespace
export namespace router {
  export const knownMethods = [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS",
    "PATCH",
  ] as const;

  export type DestinationKind = "internal" | "static" | "route" | "notFound";
  export type KnownMethod = (typeof knownMethods)[number];
}

// deno-lint-ignore no-empty-interface
export interface RenderOptions extends ResponseInit {}

export interface ResolvedFreshConfig {
  dev: boolean;
  build: {
    outDir: string;
    target: string | string[];
  };
  render: RenderFunction;
  plugins: Plugin[];
  staticDir: string;
  router?: RouterOptions;
  server: Partial<Deno.ServeTlsOptions>;
  basePath: string;
}

export interface FreshContext<
  State = Record<string, unknown>,
  // deno-lint-ignore no-explicit-any
  Data = any,
> {
  remoteAddr: Deno.NetAddr;
  url: URL;
  params: Record<string, string>;
  state: State;
  data: Data;
  render: (
    data?: Data,
    options?: RenderOptions,
  ) => Response | Promise<Response>;
  Component: ComponentType<unknown>;
  next: () => Promise<Response>;
}

export type AsyncLayout<T = any, S = Record<string, unknown>> = (
  req: Request,
  ctx: FreshContext<S, T>,
) => Promise<ComponentChildren | Response>;

export type Handler<T = any, State = Record<string, unknown>> = (
  req: Request,
  ctx: FreshContext<State, T>,
) => Response | Promise<Response>;

export type Handlers<T = any, State = Record<string, unknown>> = {
  [K in router.KnownMethod]?: Handler<T, State>;
};

type JSXElement = { type: any; props: any; key?: string | null };
type RequestHandler<VNode extends JSXElement = JSXElement> = (
  req: Request,
  ctx: FreshContext<any, any>,
) => Promise<VNode | Response>;
type PropHandler<VNode extends JSXElement = JSXElement> = (
  props: Record<string, unknown>,
) => Promise<VNode | Response>;
export type RouteConfig<VNode extends JSXElement = JSXElement> = {
  default?: RequestHandler<VNode> | PropHandler<VNode>;
  handler?: Handler<any, any> | Handlers<any, any>;
  config?: { routeOverride?: string };
};

export type RenderPipe = <VNode extends JSXElement>(
  virtualNodePipe: (
    vn: VNode,
  ) => Promise<BodyInit | null | undefined | Response>,
) => (
  route: RouteConfig<VNode>,
  config?: {
    responseInit?: ResponseInit;
    Layout?: {
      default: AsyncLayout<any, any>;
    };
  },
) => (
  req: Request,
  rawCtx: FreshContext,
  matcher?: Record<string, string>,
) => Promise<Response>;

export const createRenderPipe: RenderPipe =
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
  async <State = Record<string, unknown>>(
    req: Request,
    rawCtx: FreshContext<State>,
    matcher?: Record<string, string>,
  ) => {
    const url = new URL(req.url);
    const ctx = {
      ...rawCtx,
      params: rawCtx.params ?? matcher ?? {},
      url,
      route: route.config?.routeOverride ?? null!,
      data: null!,
      virtualNodePipe,
    };

    const render = route.default
      ? (data?: Record<string, unknown>) =>
        Promise.resolve(
          typeof route.handler === "function" || route.handler?.GET
            ? (route.default as PropHandler<VNode>)?.({ url, ctx, data })
            : (route.default as RequestHandler<VNode>)?.(req, ctx),
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
              .then(virtualNodePipe)
              .then((result) =>
                result instanceof Response ? result : new Response(result, {
                  headers: {
                    "content-type": "text/html; charset=utf-8",
                  },
                })
              )
        )
      : undefined;

    return await Promise.resolve({ ...ctx, render: render! })
      .then(
        (ctx) =>
          (typeof route.handler === "function"
            ? route.handler
            : route.handler?.[req.method as keyof Handlers])?.(req, ctx) ??
            (req.method === "GET"
              ? render?.()
              : new Response(null, { status: 404 })),
      )
      .then((response) => response ?? Promise.reject("Missing Response"))
      .catch((err) => (console.error(err), Promise.reject(err)))
      .catch(() => new Response(null, { status: 500 }));
  };

export default createRenderPipe;
