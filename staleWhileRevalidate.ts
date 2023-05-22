type CacheItem = {
  response: Response;
  expiration: number;
  updatePromise: null | Promise<any>;
};
const cache = new Map<string, CacheItem>();
const isSameResponse = (response1: Response, response2: Response) => {
  // Implement your comparison logic to check if two responses are the same
  return (
    response1.body === response2.body && response1.status === response2.status
  );
};
type Callback = () => Response | Promise<Response>;

const updateCache =
  (revalidateAfter: number) =>
  async (key: string, handler: Callback, cacheEntry: CacheItem | undefined) => {
    const response = await handler();
    if (response?.status === 200)
      if (!cacheEntry || !isSameResponse(cacheEntry.response, response))
        cache.set(key, {
          response,
          expiration: Date.now() + revalidateAfter * 1000,
          updatePromise: null,
        });
    return response;
  };

const staleWhileRevalidate = async (
  key: string,
  handler: Callback,
  revalidateAfter = 60 * 100
) => {
  const cacheEntry = cache.get(key);
  const update = updateCache(revalidateAfter);
  if (cacheEntry)
    if (cacheEntry.expiration > Date.now()) {
      cacheEntry.updatePromise ??= update(key, handler, cacheEntry);
      return cacheEntry.response.clone();
    }
  const response = await update(key, handler, cacheEntry);
  return response.clone();
};

export default staleWhileRevalidate;
