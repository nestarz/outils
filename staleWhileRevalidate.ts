import { createKv, streamToJson } from "./kvUtils.ts";

const createCache = () => {
  const cacheMap = new Map();
  const kv = createKv(Deno.env.get("DENO_DEPLOYMENT_ID") ? undefined : "1");
  const saveToLocal = (key: string, value: any) =>
    cacheMap.set(String(key), JSON.stringify(value));
  return {
    setItem: async (key: string, value: any) => {
      await kv?.saveFile(key, new TextEncoder().encode(JSON.stringify(value)));
      return saveToLocal(key, value);
    },
    getItem: async (key: string) => {
      const value =
        cacheMap.get(key) ??
        (await kv
          ?.getFile(String(key))
          .then((value) => (value ? streamToJson(value) : value))
          .then((value) => (value ? (saveToLocal(key, value), value) : value)));
      return typeof value === "string" ? JSON.parse(value) : value;
    },
    has: (key: string) => cacheMap.has(key),
  };
};

const cache = createCache();

const jsonStringifyWithBigIntSupport = (data: unknown) => {
  if (data !== undefined) {
    return JSON.stringify(data, (_, v) =>
      typeof v === "bigint" ? `${v}#bigint` : v
    ).replace(/"(-?\d+)#bigint"/g, (_, a) => a);
  }
};

const isFresh = (timestamp: number, maxAge: number) =>
  Date.now() - timestamp < maxAge;

export async function staleWhileRevalidate<U>(
  key: string,
  fetchFunc: (arg0: string) => Promise<U>,
  maxAge: number
) {
  const value = await cache.getItem(key);
  if (value) {
    // && isFresh(cache.getItem(key).timestamp, maxAge)) {
    if (!isFresh(value.timestamp, maxAge / 2))
      fetchFunc(key).then((data: U) =>
        cache.setItem(key, {
          data: jsonStringifyWithBigIntSupport(data),
          timestamp: Date.now(),
        })
      );
    return JSON.parse(value.data) as U;
  }
  const data = await fetchFunc(key);
  cache.setItem(key, {
    data: jsonStringifyWithBigIntSupport(data),
    timestamp: Date.now(),
  });
  return data as U;
}
