const mem: Record<string, string> = {};

export const db = {
  get: (key: string): Promise<string | undefined> => Promise.resolve(mem[key]),
  set: (key: string, value: string): Promise<void> => {
    mem[key] = value;
    return Promise.resolve();
  },
};
