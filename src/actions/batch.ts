import pLimit from "p-limit";
import { gdrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
import { processFolderActions, selectFolder } from "./folder.js";
import { createFolder, initProgressBar, isGdriveFolder, parsePathName } from "../utils/utils.js";
import { TFile } from "../types/types.js";
import path from "path";
import { addCacheItem, removeCacheItem } from "../store/store.js";

export const downloadDriveItem = async (item: TFile, folderPath: string) => {
  const { id, mimeType, name } = item;
  if (isGdriveFolder(mimeType)) {
    const files = await gdrive.getFolderItems(id);
    const { progressBar } = initProgressBar(files.length);
    const newPath = await createFolder(path.join(folderPath, name));

    const downloadPromises = files.map(async (file) => {
      await downloadDriveItem(file, newPath);
      progressBar.increment();
    });
    await Promise.all(downloadPromises);
    progressBar.stop();
  } else {
    const pathname = await parsePathName(path.join(folderPath, name));
    await gdrive.downloadFile(pathname, id);
  }
};

export const processMultipleItems = async (files: TFile[], parentId?: string) => {
  try {
    const { operation, selected, cpath } = await questions.batch_item_operation(files);
    const proceedMsgs: { [key in "TRASH" | "DELETE"]: string } = {
      DELETE: "Confirm deletion of items?",
      TRASH: "Confirm moving items to trash?",
    };

    const executeOperation = async (
      actionFn: (item: TFile) => Promise<void>,
      concurrencyLimit = 20
    ) => {
      const {
        progressBar,
        cancel: { value },
      } = initProgressBar(selected.length);
      const limit = pLimit(concurrencyLimit);
      const processes = selected.map(async (item) => {
        return limit(async () => {
          if (value) return;

          await actionFn(item);
          progressBar.increment();
        });
      });

      await Promise.all(processes);
      progressBar.stop();
    };

    switch (operation) {
      case "MOVE":
        const { id } = await selectFolder();
        await executeOperation(async (selected) => {
          addCacheItem(id, selected);
          removeCacheItem(parentId, selected.id);
          await gdrive.moveFile(selected.id, id);
        });
        break;
      case "DOWNLOAD":
        await executeOperation(async (item) => {
          if (!cpath) return;
          await downloadDriveItem(item, cpath);
        }, selected.length);
        break;
      case "TRASH":
        const p = await questions.areYouSure(proceedMsgs[operation]);
        if (!p) break;

        await executeOperation(async (selected) => {
          removeCacheItem(parentId, selected.id);
          await gdrive.moveToTrash(selected.id);
        });
        break;
      case "DELETE":
        const proceed = await questions.areYouSure(proceedMsgs[operation]);
        if (!proceed) break;

        await executeOperation(async (selected) => {
          removeCacheItem(parentId, selected.id);
          await gdrive.deleteItem(selected.id);
        });
        break;
    }

    parentId ? await processFolderActions(parentId) : await processMainActions();
  } catch (error) {
    parentId ? await processFolderActions(parentId) : await processMainActions();
  }
};
