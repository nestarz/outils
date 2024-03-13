import {
  cachified,
  type CachifiedOptions,
} from "npm:@epic-web/cachified@^5.1.2";
import type { Plugin } from "./types.ts";

type PartialPick<T, F extends keyof T> = Omit<T, F> & Partial<Pick<T, F>>;
declare function cachifiedWithOptionalCache<Value>(
  options: PartialPick<CachifiedOptions<Value>, "cache">,
): Promise<Value>;

export interface CachifiedState extends Record<string, unknown> {
  cachified: typeof cachifiedWithOptionalCache;
}

export const createCachifiedPlugin = <Value>(
  options: Partial<CachifiedOptions<any>>,
): Plugin<CachifiedState> => {
  const cache = options.cache ?? new Map();
  return {
    name: "cachifiedPlugin",
    middlewares: [
      {
        path: "/",
        middleware: {
          handler: async (_req, ctx) => {
            ctx.state.cachified = (v) =>
              cachified({
                cache,
                ttl: 1000 * 60 * 0.001,
                staleWhileRevalidate: 300_000,
                ...options,
                ...v,
              });
            const resp = await ctx.next();
            return resp;
          },
        },
      },
    ],
  };
};

export default createCachifiedPlugin;
