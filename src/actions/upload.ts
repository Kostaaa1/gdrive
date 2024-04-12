import path from "path";
import { cache, gdrive, questions } from "../config/config.js";
import {
  convertPathToStream,
  convertUrlToStream,
  extractFileNameFromUrl,
  getMimeType,
  isDirectory,
  isExtensionValid,
  initProgressBar,
} from "../utils/utils.js";
import { processFolderActions } from "./folder.js";
import { processMainActions } from "../index.js";
import { readdir } from "fs/promises";
import pLimit from "p-limit";
import { scrapeMedia } from "../service/Scraper.js";
import { addCacheItem, populate } from "../store/store.js";
import { SingleBar } from "cli-progress";

const { upload_questions, input, scraping_questions } = questions;

export const scrapeAndUpload = async (id?: string) => {
  const { name, url: scrapeUrl, duration, types } = await scraping_questions();
  const urls = await scrapeMedia(scrapeUrl, types, duration);
  const { progressBar, cancel } = initProgressBar(urls.length);
  const limit = pLimit(20);
  let parentId = id;
  // if (name) parentId = await gdrive.createFolder(name, id);
  if (name) {
    const res = await gdrive.createFolder(name, id);
    parentId = res.id;
  }

  const processes = urls.map(async (url) => {
    return limit(async () => {
      if (cancel.value) return;

      const stream = await convertUrlToStream(url);
      if (!stream) return;

      await gdrive.uploadSingleFile({
        name: extractFileNameFromUrl(url),
        stream,
        parentId,
      });

      if (!cancel.value) {
        progressBar.increment();
      }
    });
  });

  await Promise.all(processes)
    .then(() => console.log("Uploading finished"))
    .catch((err) => console.error("Error occurred:", err));

  progressBar.stop();
};

export const processUploadActions = async (parent?: { name: string; parentId: string }) => {
  try {
    const res = await upload_questions();
    switch (res) {
      case "PATH":
        await handleUploadFromPath(parent);
        break;
      case "SCRAPE":
        await scrapeAndUpload(parent?.parentId);
        break;
      case "URL":
        await handleUploadFromUrl(parent?.parentId);
        break;
    }

    cache.del(parent?.parentId || "root");
    parent ? await processFolderActions(parent.parentId) : await processMainActions();
  } catch (err) {
    parent ? await processFolderActions(parent.parentId) : await processMainActions();
  }
};

const handleUploadFromUrl = async (parentId?: string) => {
  const url = await input("Enter the URL: ");
  const stream = await convertUrlToStream(url);
  if (!stream) return;

  let name = await input("Enter the name of the file: ");
  if (!isExtensionValid(name)) {
    name += url.substring(url.lastIndexOf("."));
  }
  await gdrive.uploadSingleFile({ name, stream, parentId });
};

export const handleUploadFolder = async (
  resPath: string,
  parent?: { name: string; parentId: string }
) => {
  const folderName = path.basename(resPath);
  const { id: parentId } = await gdrive.createFolder(folderName, parent?.parentId);

  const res = await readdir(resPath);
  const files = res.reverse();
  let bar: SingleBar | null = null;
  let isCancelled = false;

  if (files.length > 1) {
    const { progressBar, cancel } = initProgressBar(files.length);
    bar = progressBar;
    isCancelled = cancel.value;
  }

  const queue: { fullPath: string; name: string; parentId: string }[] = [];
  const limit = pLimit(20);
  const batchUpload = files.map(async (fileName, i) => {
    return limit(async () => {
      if (isCancelled) return;

      const fullPath = path.join(resPath, fileName);
      const mimeType = getMimeType(fullPath);

      if (mimeType) {
        const stream = await convertPathToStream(fullPath);
        await gdrive.uploadSingleFile({
          name: fileName,
          stream,
          mimeType: mimeType!,
          parentId,
        });
      } else {
        const isFolder = await isDirectory(fullPath);
        if (isFolder) queue.push({ fullPath, name: fileName, parentId });
      }
      if (bar && !isCancelled) bar.increment();
    });
  });
  await Promise.all(batchUpload);

  while (true) {
    for (const p of queue) {
      const { fullPath, name, parentId } = p;
      await handleUploadFolder(fullPath, { name, parentId });
    }
    queue.pop();
    if (queue.length === 0) {
      if (bar) bar.stop();
      break;
    }
  }
};

export const handleUploadFromPath = async (parent?: { name: string; parentId: string }) => {
  try {
    const res_path = await questions.input_path("📁 Provide a destination for upload: ");
    const isDir = await isDirectory(res_path);

    if (isDir) {
      await handleUploadFolder(res_path, parent);
    } else {
      const stream = await convertPathToStream(res_path);
      const mimeType = getMimeType(res_path);
      const name = path.basename(res_path);

      await gdrive.uploadSingleFile({
        name,
        stream,
        mimeType: mimeType!,
        parentId: parent?.parentId,
      });
    }
  } catch (error) {
    parent ? await processFolderActions(parent.parentId) : await processMainActions();
  }
};
