import { composeMiddlewares } from "./composeMiddlewares.ts";
import type {
  AsyncLayout,
  FreshContext,
  MiddlewareModule,
  PluginMiddleware,
  PluginRoute,
  RenderPipe,
  Route,
  RouteModule,
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

export const composeRoutes = (options: {
  routes: NestedArray<RouteModule | PluginRoute | null | undefined>;
  middlewares?: NestedArray<
    PluginMiddleware<any> | MiddlewareModule<any> | null | undefined
  >;
  renderer?: ReturnType<RenderPipe>;
}): rutt.Routes => {
  const createContext = (
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

  const finalRoutes: rutt.Routes = {};
  for (const route of options.routes.flat().map(normalize)) {
    if (!route) continue;

    finalRoutes[route.pattern] = {
      [route.pattern]: (req, ctx, matcher) => {
        return composeMiddlewares([
          ...(options.middlewares ?? []),
          options.renderer?.(route),
        ])(
          req,
          createContext(req, ctx, matcher, route),
        );
      },
    };
  }

  return finalRoutes;
};
