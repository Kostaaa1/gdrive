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

export const populate = (key: string = "root", newData: TFile[]) => {
  cache.set(key, JSON.stringify(newData));
};

export const addCacheItem = (key: string = "root", item: TFile) => {
  const s = cache.get<string>(key);
  if (s) {
    const data = [item, ...JSON.parse(s)];
    cache.set(key, JSON.stringify(data));
  }
};

export const updateCacheItem = (key: string = "root", item: TFile) => {
  const data = cache.get<string>(key);
  if (data) {
    const values: TFile[] = JSON.parse(data);
    const added = values.map((x) => (x.id === item.id ? item : x));
    cache.set(key, JSON.stringify(added));
  }
};

export const removeCacheItem = (key: string = "root", id: string) => {
  const data = cache.get<string>(key);
  if (data) {
    const values: TFile[] = JSON.parse(data);
    const filtered = values.filter((x) => x.id !== id);
    cache.set(key, JSON.stringify(filtered));
  }
};
