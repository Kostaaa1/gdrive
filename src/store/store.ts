import { cache } from "../config/config.js";
import { TFile } from "../types/types.js";

export const getItems = async (key: string, action: () => Promise<TFile[]>): Promise<TFile[]> => {
  const data = cache.get<string>(key);
  if (data && data.length > 0) {
    const parsed = JSON.parse(data);
    return parsed;
  } else {
    const data = await action();
    cache.set(key, JSON.stringify(data));
    return data;
  }
};

export const populate = (key: string, newData: any) => {
  cache.set(key, JSON.stringify(newData));
};

export const addItem = (key: string, item: any) => {
  const s = cache.get<string>(key);
  if (s) {
    const data = (JSON.parse(s) as any[]).push(item);
    cache.set(key, JSON.stringify(data));
  }
};

export const removeItem = (key: string, id: number) => {
  const data = cache.get<string>(key);
  if (data) {
    const values: TFile[] = JSON.parse(data);
    const filtered = values.filter((_, i) => i !== id);
    cache.set(key, JSON.stringify(filtered));
  }
};
