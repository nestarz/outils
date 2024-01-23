const createId = (i = 0) => () => i++; // prettier-ignore
const getObjectTimerId = createId();

type Lock = { id: string; validTo: number };

export const createLocker = (
  kv: Deno.Kv,
  lockKey: string[],
  lockLifetime = 5000,
  acquireLockRetryTimeout = 100,
) =>
async <T>(fn: () => T) => {
  const lockId = Math.random().toString();
  const getLock = async (): Promise<Lock> => {
    const lock = (await kv.get(lockKey)).value as Lock | null;
    if (!lock || lock.validTo < Date.now()) {
      const lock: Lock = { id: lockId, validTo: Date.now() + lockLifetime };
      await kv.set(lockKey, lock);
    } else {
      console.log("[locker]:exists", lock.id);
    }

    const lock2 = (await kv.get(lockKey)).value as Lock | null;
    if (lock2 && lock2.id === lockId) {
      return Promise.resolve(lock2);
    } else {
      return new Promise((resolve) =>
        setTimeout(resolve, acquireLockRetryTimeout)
      ).then(getLock);
    }
  };

  const timerId = `[locker:releaseLock:${getObjectTimerId()}]`;
  const timerGetId = timerId.replace("releaseLock", "getLock");
  console.time(timerId);
  console.time(timerGetId);
  const lock = await getLock();
  console.timeEnd(timerGetId);
  try {
    return fn();
  } finally {
    if (lock && lock.id === lockId) {
      await kv.delete(lockKey);
      console.timeEnd(timerId);
    }
  }
};

export default createLocker;
