import NodeCache from "node-cache";
import { cache, gdrive } from "../config/config.js";
import { TFile } from "../types/types.js";

export type TCached = {
  items: TFile[];
  historyId: number;
};

export const getItems = async (key: string, action: () => Promise<TFile[]>): Promise<TCached> => {
  const data = cache.get<string>(key);
  if (data) {
    const parsed = JSON.parse(data);
    return parsed;
  } else {
    const items = await action();
    cache.set(key, JSON.stringify({ items, historyId: 0 }));
    return { items, historyId: 0 };
  }
};

export const updateHistoryId = (key: string, id: number) => {
  const s = cache.get<string>(key);
  if (s) {
    const data = JSON.parse(s);
    const updated = { ...data, historyId: id };
    cache.set(key, JSON.stringify(updated));
  }
};

export const populate = (key: string = "root", newData: TFile[]) => {
  const s = cache.get<string>(key);
  if (s) {
    const parsed = JSON.parse(s);
    cache.set(key, JSON.stringify({ ...parsed, items: newData }));
  }
};

export const addCacheItem = (key: string = "root", item: TFile) => {
  const s = cache.get<string>(key);
  if (s) {
    const parsed: TCached = JSON.parse(s);
    const data = { ...parsed, items: [item, ...parsed.items] };
    cache.set(key, JSON.stringify(data));
  }
};

export const updateCacheItem = (key: string = "root", item: TFile) => {
  const s = cache.get<string>(key);
  if (s) {
    const values: TCached = JSON.parse(s);
    const added = values.items.map((x) => (x.id === item.id ? item : x));
    const data = { ...values, items: added };
    cache.set(key, JSON.stringify(data));
  }
};

export const removeCacheItem = (key: string = "root", id: string) => {
  const data = cache.get<string>(key);
  if (data) {
    const values: TCached = JSON.parse(data);
    const filtered = values.items.filter((x) => x.id !== id);
    cache.set(key, JSON.stringify({ ...values, items: filtered }));
  }
};

export const getStorageSize = async () => {
  const expiryCache = new NodeCache({ stdTTL: 240 });
  const size = expiryCache.get<string>("storageSize");

  if (!size) {
    const storageSizeMsg = await gdrive.getDriveStorageSize();
    expiryCache.set("storageSize", JSON.stringify(storageSizeMsg));
    return storageSizeMsg;
  } else {
    return JSON.parse(size);
  }
};
