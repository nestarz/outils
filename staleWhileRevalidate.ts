/// <reference lib="deno.unstable" />

import type { RouteConfig } from "https://deno.land/x/fresh@1.1.6/server.ts";
import * as kvUtils from "https://deno.land/x/kv_toolbox@0.0.3/blob.ts";

export const config: RouteConfig = {
  routeOverride: "/cache/",
};

export const swrCache = (() => {
  const cache = new Map();
  const toStr = JSON.stringify;
  return {
    get: async <T, U>(key: T, fn: (key: T) => U | Promise<U>): Promise<U> =>
      cache.has(toStr(key)) ? (cache.get(toStr(key)) as U) : await fn(key),
    save: <T, U>(key: T, getFn: (key: T) => U) =>
      Promise.resolve(getFn(key)).then((value) =>
        cache.set(toStr(key), value).get(toStr(key))
      ),
    map: cache,
  };
})();

const getHashSync = (str: string) =>
  String(
    str.split("").reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
  ).replace(/-/g, "");

const jsonStringifyWithBigIntSupport = (data: unknown) => {
  if (data !== undefined) {
    return JSON.stringify(data, (_, v) =>
      typeof v === "bigint" ? `${v}#bigint` : v
    ).replace(/"(-?\d+)#bigint"/g, (_, a) => a);
  }
};

const isFresh = (timestamp: number, maxAge: number) =>
  Date.now() - timestamp < maxAge;

const kv = await Deno.openKv();

type CacheItem<U> = null | { timestamp: number; data: U };

export async function staleWhileRevalidate<U>(
  rawKey: string[],
  fetchFunc: (arg0: string[]) => Promise<U>,
  maxAge: number,
  useKv = false
) {
  try {
    const key = ["_swr", ...rawKey.map((d) => getHashSync(d ?? ""))];
    const value = (await swrCache
      .get(key, () => (useKv ? kvUtils.get(kv, key) : undefined))
      .then((r) =>
        r ? JSON.parse(new TextDecoder().decode(r)) : null
      )) as CacheItem<U>;

    const set = (data: U) =>
      swrCache.save(key, async () => {
        const value = new TextEncoder().encode(
          jsonStringifyWithBigIntSupport({ data, timestamp: Date.now() })
        );
        if (useKv) await kvUtils.set(kv, key, value);
        return value;
      });
    if (value) {
      if (!isFresh(value.timestamp, maxAge / 2))
        fetchFunc(rawKey).then((data: U) => set(data));
      return value.data;
    }
    const data = await fetchFunc(rawKey);
    set(data);
    return data;
  } catch (error) {
    console.error(error);
  } finally {
    if (useKv)
      for await (const iterator of kv.list({ prefix: ["_swr"] }))
        if (!isFresh(new Date(iterator.versionstamp).getTime(), maxAge))
          kv.delete(iterator.key);
  }
}

export const handler = {
  GET: async () => {
    const result = { swrCache: [], kv: [] };
    for await (const entry of kv.list({ prefix: ["_swr"] }))
      result.kv.push(entry.key);
    result.swrCache = [...swrCache.map.keys()];
    return new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
  },
  POST: async (req: Request) => {
    const body = await req.json().catch(() => ({}));
    const key = getHashSync(body.key ?? "");
    for await (const entry of kv.list({ prefix: ["_swr", key] }))
      await kv.delete(entry.key);
    for (const cacheKey of swrCache.map.keys())
      if (JSON.parse(key)?.[1] === cacheKey) swrCache.map.delete(cacheKey);
    return new Response(JSON.stringify({ success: true }));
  },
};
