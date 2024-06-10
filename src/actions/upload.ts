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

const { upload_questions, input, scraping_questions } = questions;

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

export const scrapeAndUpload = async (id?: string) => {
  const { name, url: scrapeUrl, duration, types } = await scraping_questions();
  const urls = await scrapeMedia(scrapeUrl, types, duration);

  const cancel = { value: false };
  const { progressBar } = await initProgressBar(urls.length, cancel);
  const limit = pLimit(20);
  let parentId = id;
  if (name) {
    const res = await gdrive.createFolder(name, id);
    parentId = res.id;
  }

  const tasks = urls.map(async (url) => {
    return limit(async () => {
      if (cancel.value) throw new Error("Process terminated");

      const stream = await convertUrlToStream(url);
      if (!stream) return;
      await gdrive.uploadSingleFile({
        name: extractFileNameFromUrl(url),
        stream,
        parentId,
      });
      progressBar.increment();
    });
  });

  await Promise.all(tasks)
    .then(() => console.log("\nUploading finished"))
    .catch((err) => console.error("Error occurred:", err));

  progressBar.stop();
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

const uploadFile = async (data: {
  fileName: string;
  parentId: string;
  path: string;
  mimeType: string;
}) => {
  const { fileName, mimeType, parentId, path } = data;
  const stream = await convertPathToStream(path);
  await gdrive.uploadSingleFile({
    name: fileName,
    stream,
    mimeType: mimeType!,
    parentId,
  });
};

export const handleUploadFolder = async (
  resPath: string,
  parent?: { name: string; parentId: string }
) => {
  const folderName = path.basename(resPath);
  const { id: parentId } = await gdrive.createFolder(folderName, parent?.parentId);
  const res = await readdir(resPath);
  const files = res.reverse();

  let cancel = { value: false };
  const { progressBar: bar } = initProgressBar(files.length, cancel);
  const queue: { fullPath: string; name: string; parentId: string }[] = [];

  const limit = pLimit(8);
  const batch = files.map(async (fileName) => {
    return limit(async () => {
      if (cancel.value) throw new Error("Operation terminated");
      const fullPath = path.join(resPath, fileName);
      const mimeType = getMimeType(fullPath);
      if (mimeType) {
        await uploadFile({ fileName, parentId, mimeType, path: fullPath });
      } else {
        const isFolder = await isDirectory(fullPath);
        if (isFolder) queue.push({ fullPath, name: fileName, parentId });
      }
      bar.increment();
    });
  });
  await Promise.all(batch);

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
