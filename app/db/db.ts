import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env["REDIS_API_URL"]!,
  token: process.env["REDIS_API_TOKEN"]!,
});

const BATCH_SIZE = 100;

export const db = {
  get: async <V>(key: string): Promise<V | null> => redis.get<V>(key),
  getAll: async <V>(keyPattern: string): Promise<V[]> => {
    let cursor: number | null = 0;
    const values: V[] = [];
    while (cursor != null) {
      const [newCursor, keys] = await redis.scan(cursor, {
        count: BATCH_SIZE,
        match: keyPattern,
      });
      if (newCursor === 0) {
        cursor = null;
      } else {
        cursor = newCursor;
      }
      if (keys.length > 0) {
        (await redis.mget<V[]>(...keys)).forEach((val) => values.push(val));
      }
    }
    return values;
  },
  set: async <V>(key: string, value: V): Promise<void> => {
    await redis.set(key, value);
    return Promise.resolve();
  },
};
