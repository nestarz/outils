import type { Plugin } from "https://deno.land/x/fresh@1.5.4/src/server/types.ts";

type JSXElement<T = any> = { type: T; props: any; key: string };
export const adaptFreshPlugin = <T,>(plugin: Plugin<T>) => ({
  middlewares: (plugin.middlewares ?? []).flatMap((d) => d.middleware.handler),
  routes: (plugin.routes ?? []).map((route) => ({
    default: route
      .component as unknown as ((
        req: Request,
        context?: any,
      ) => Promise<JSXElement<any>>),
    handler: route.handler,
    config: { routeOverride: route.path },
  })),
});

export default adaptFreshPlugin;
