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
import { addItem, populate } from "../store/store.js";

const { upload_questions, input, scraping_questions } = questions;

export const scrapeAndUpload = async (id?: string) => {
  const { name, url: scrapeUrl, duration, types } = await scraping_questions();
  const urls = await scrapeMedia(scrapeUrl, types, duration);

  const progressBar = initProgressBar(urls.length);
  const limit = pLimit(20);

  let parentId = id;
  if (name) parentId = await gdrive.createFolder(name, id);

  const processes = urls.map(async (url) => {
    return limit(async () => {
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

  await Promise.all(processes)
    .then(() => console.log("\nUploading finished"))
    .catch((err) => console.error("Error occurred:", err));

  if (id) {
    const items = await gdrive.getFolderItems(id);
    populate(id, items);
  }

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
  // const parentId =
  //   parent && parent.name
  //     ? await gdrive.createFolder(folderName, parent.parentId)
  //     : await gdrive.getFolderIdWithName(folderName, parent.parentId);
  const parentId = await gdrive.createFolder(folderName, parent?.parentId);
  const res = await readdir(resPath);
  const files = res.reverse();

  let progressBar;
  if (files.length > 1) {
    const bar = initProgressBar(files.length);
    progressBar = bar;
  }

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
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
      if (isFolder) await handleUploadFolder(fullPath, { name: fileName, parentId });
    }
    if (progressBar) {
      progressBar.increment();
      if (i === files.length - 1) {
        progressBar.stop();
      }
    }
  }
};

export const handleUploadFromPath = async (parent?: { name: string; parentId: string }) => {
  try {
    const { input_path } = questions;
    const res_path = await input_path("📁 Provide a destination for upload: ");
    const isDir = await isDirectory(res_path);

    if (isDir) {
      await handleUploadFolder(res_path, parent);
    } else {
      // GROUP:
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
