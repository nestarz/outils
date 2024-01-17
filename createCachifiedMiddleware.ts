import type {
  Cache,
  CacheEntry,
  CachifiedOptions,
  CachifiedOptionsWithSchema,
} from "https://esm.sh/@epic-web/cachified@4.0.0/dist/src/common.d.ts";
import type { FreshContext } from "https://deno.land/x/fresh@1.6.1/src/server/types.ts";

import { LRUCache } from "https://esm.sh/lru-cache@10.1.0";
import { cachified } from "https://esm.sh/@epic-web/cachified@4.0.0";

type PartialPick<T, F extends keyof T> = Omit<T, F> & Partial<Pick<T, F>>;
declare function cachifiedWithOptionalCache<Value, InternalValue>(
  options: PartialPick<
    CachifiedOptionsWithSchema<Value, InternalValue>,
    "cache"
  >,
): Promise<Value>;
declare function cachifiedWithOptionalCache<Value>(
  options: PartialPick<CachifiedOptions<Value>, "cache">,
): Promise<Value>;

export type CachifiedState = { cachified: typeof cachifiedWithOptionalCache };

export const createCachifiedMiddleware = (
  { cache: initCache, lruCacheOptions }: {
    cache?: Cache;
    lruCacheOptions?: LRUCache.Options<any, any, any>;
  } = {},
) => {
  const cache = initCache ??
    new LRUCache<string, CacheEntry>({ max: 1000, ...lruCacheOptions ?? {} });
  return {
    handler: async (_req: Request, ctx: FreshContext<CachifiedState>) => {
      ctx.state.cachified =
        ((...props: Parameters<typeof cachifiedWithOptionalCache>) =>
          cachified(
            { ...props[0], cache: props[0]?.cache ?? cache },
            ...(props.slice(1) as []),
          )) as typeof cachifiedWithOptionalCache;
      const resp = await ctx.next();
      return resp;
    },
  };
};

export default createCachifiedMiddleware;
