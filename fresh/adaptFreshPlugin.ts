import type { Handler, Handlers } from "../createRenderPipe.ts";
import type { Middleware } from "./middleware.ts";

export interface PluginMiddleware<State = Record<string, unknown>> {
  /** A path in the format of a filename path without filetype */
  path: string;
  middleware: Middleware<State>;
}

export interface PluginRoute<State = Record<string, unknown>> {
  /** A path in the format of a filename path without filetype */
  path: string;
  component?: any;
  handler?: Handler<any, State> | Handlers<any, State>;
}

export interface Plugin<State = Record<string, unknown>> {
  /** The name of the plugin. Must be snake-case. */
  name: string;
  entrypoints?: Record<string, string>;
  routes?: PluginRoute<State>[];
  middlewares?: PluginMiddleware<State>[];
}

type JSXElement<T = any> = { type: T; props: any; key: string };

type FreshPluginAdapter = {
  middlewares: any[];
  routes: {
    default: (req: Request, context?: any) => Promise<JSXElement<any>>;
    handler: any;
    config: {
      routeOverride: string;
    };
  }[];
};

export const adaptFreshPlugin = <T>(plugin: Plugin<T>): FreshPluginAdapter => ({
  middlewares: (plugin.middlewares ?? []).flatMap((d) => d.middleware.handler),
  routes: (plugin.routes ?? []).map((route) => ({
    default: route.component as unknown as (
      req: Request,
      context?: any,
    ) => Promise<JSXElement<any>>,
    handler: route.handler,
    config: { routeOverride: route.path },
  })),
});

export default adaptFreshPlugin;
