import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env["REDIS_API_URL"]!,
  token: process.env["REDIS_API_TOKEN"]!,
});

export const db = {
  get: async <V>(key: string): Promise<V | null> => redis.get<V>(key),
  set: async <V>(key: string, value: V): Promise<void> => {
    await redis.set(key, value);
    return Promise.resolve();
  },
};
