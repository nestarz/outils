import { composeMiddlewares } from "./composeMiddlewares.ts";
import type {
  FreshContext,
  MiddlewareModule,
  PluginMiddleware,
  PluginRoute,
  RenderPipe,
  Route,
  RouteModule,
  router,
} from "./types.ts";

type NestedArray<T> = (T | T[])[];

// deno-lint-ignore no-namespace
export namespace rutt {
  export type HandlerContext<T = unknown> = T & Deno.ServeHandlerInfo;
  export type MatchHandler<T = unknown> = (
    req: Request,
    ctx: HandlerContext<T>,
    match: Record<string, string>,
  ) => Response | Promise<Response>;
  export interface Routes<T = {}> {
    [key: string]: Routes<T> | MatchHandler<T>;
  }
}

const normalize = (
  item?: RouteModule | PluginRoute | undefined | null,
): Route | undefined => {
  if (!item) return undefined;
  if ("path" in item) {
    return {
      pattern: item.path,
      handler: item.handler,
      component: item.component,
    } as Route;
  }
  return {
    pattern: item.config?.routeOverride!,
    component: item.default,
    handler: item.handler,
  } as Route;
};

export const defaultRenderer = (route: Route): MiddlewareModule => ({
  name: "defaultRenderer",
  handler: (req, ctx) =>
    typeof route.handler === "function"
      ? route.handler(req, ctx)
      : route.handler?.[req.method as router.KnownMethod]?.(req, ctx) ??
        new Response(null, { status: 404 }),
});

export const initFreshContext = (
  req: Request,
  connInfo: Deno.ServeHandlerInfo,
  params: Record<string, string>,
  route: Route,
): FreshContext => {
  const url = new URL(req.url);
  return {
    url,
    params,
    route: route.pattern,
    remoteAddr: connInfo.remoteAddr,
    state: {},
    render: () => new Response(null, { status: 404 }),
    // deno-lint-ignore no-explicit-any
    Component: () => null as any,
    data: undefined,
    next: () => Promise.resolve(new Response(null, { status: 500 })),
  };
};

export const composeRoutes = (
  optionsArray: {
    routes?: NestedArray<RouteModule | PluginRoute | null | undefined>;
    middlewares?: NestedArray<
      PluginMiddleware<any> | MiddlewareModule<any> | null | undefined
    >;
    renderer?: ReturnType<RenderPipe>;
  }[],
): rutt.Routes => {
  const finalRoutes: rutt.Routes = {};
  for (const options of optionsArray) {
    for (const route of (options.routes ?? []).flat().map(normalize)) {
      if (!route) continue;

      finalRoutes[route.pattern] = (req, ctx, matcher) => {
        try {
          return composeMiddlewares([
            ...(options.middlewares ?? []),
            options.renderer?.(route) ?? defaultRenderer(route),
          ])(req, initFreshContext(req, ctx, matcher, route));
        } catch (error) {
          console.error(error);
          return new Response(null, { status: 500 });
        }
      };
    }
  }

  return finalRoutes;
};
