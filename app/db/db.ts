import { kv } from "@vercel/kv";

export const db = {
  get: async<V> (key: string): Promise<V | null> => kv.get(key),
  set: async<V> (key: string, value: V): Promise<void> => {
    await kv.set(key, value);
    return Promise.resolve();
  },
};
