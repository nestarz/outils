import type { Plugin } from "https://deno.land/x/fresh@1.5.4/src/server/types.ts";

export const adaptFreshPlugin = <T>(plugin: Plugin<T>) => ({
  middlewares: (plugin.middlewares ?? []).map((d) => d.middleware.handler),
  routes: (plugin.routes ?? []).map((route) => ({
    default: route.component,
    handler: route.handler,
    config: { routeOverride: route.path },
  })),
});

export default adaptFreshPlugin;
