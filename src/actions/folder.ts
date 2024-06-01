import chalk from "chalk";
import { createFolder, initProgressBar, isGdriveFolder } from "../utils/utils.js";
import { gdrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
import { processSelectedFile } from "./file.js";
import { processUploadActions } from "./upload.js";
import { TFile, TFolder } from "../types/types.js";
import path from "path";
import { downloadDriveItem, processMultipleItems } from "./batch.js";
import { addCacheItem, getItems, removeCacheItem, updateCacheItem } from "../store/store.js";
import pLimit from "p-limit";

const { input_path, areYouSure, folder_questions, input } = questions;

const handleRenameFolder = async (folderName: string, id: string, parentId?: string) => {
  try {
    const new_name = await input(`Rename folder ${chalk.blueBright(folderName)}: `);
    const renamed = await gdrive.rename(new_name, id);
    updateCacheItem(parentId, renamed);
    await processFolderActions(id, parentId);
  } catch (error) {
    await processFolderActions(id, parentId);
  }
};

const handleCreateFolder = async (id: string, parentId?: string) => {
  try {
    const newName = await input("Enter new folder name: ");
    const folder = await gdrive.createFolder(newName, id);
    addCacheItem(id, folder);
    await processFolderActions(id, parentId);
  } catch (error) {
    await processFolderActions(id, parentId);
  }
};

const handleDeleteFolder = async (id: string, parentId?: string) => {
  try {
    const proceed = await areYouSure("Proceed deleting the folder?");
    if (proceed) {
      await gdrive.deleteItem(id);
      removeCacheItem(parentId, id);
    }
    await processFolderActions(id, parentId);
  } catch (error) {
    await processFolderActions(id, parentId);
  }
};

const handleTrashFolder = async (id: string, parentId?: string) => {
  try {
    const proceed = await areYouSure(
      `Proceed moving the folder to trash? ${chalk.gray(
        "(You will be able to restore it in the next 30 days.)"
      )}`
    );

    if (proceed) {
      removeCacheItem(parentId, id);
      await gdrive.moveToTrash(id);
      await processMainActions();
      return;
    }

    await processFolderActions(id, parentId);
  } catch (error) {
    await processFolderActions(id, parentId);
  }
};

export const selectFolder = async (id?: string): Promise<TFolder> => {
  const allFolders = await gdrive.getDriveFolders(id);
  const selectedFolder = await questions.move_questions(allFolders);
  return selectedFolder;
};

const handleMoveFolder = async (id: string, parentId?: string) => {
  try {
    const selected = await selectFolder(id);
    const item = await gdrive.getItem(id);

    addCacheItem(selected.id, item);
    removeCacheItem(parentId, id);
    await gdrive.moveFile(id, selected.id);

    parentId ? await processFolderActions(parentId) : await processMainActions();
  } catch (error) {
    parentId ? await processFolderActions(parentId) : await processMainActions();
  }
};

const handleDownloadFolder = async (
  files: TFile[],
  folderName: string,
  id: string,
  parentId?: string
) => {
  try {
    const cpath = await input_path("Provide a desired destination to store the drive folder: ");
    const newPath = path.join(cpath, folderName);
    await createFolder(path.join(newPath));
    const cancel = { value: false };
    const { progressBar: bar } = initProgressBar(files.length);

    const processes = files.map(async (file) => {
      if (cancel.value) throw new Error("Process terminated");
      await downloadDriveItem(file, path.join(newPath));
      bar.increment();
    });

    await Promise.all(processes);
    bar.stop();

    await processFolderActions(id, parentId);
  } catch (error) {
    await processFolderActions(id, parentId);
  }
};

export const processFolderActions = async (id: string, parentId?: string) => {
  try {
    const folderName = await gdrive.getFolderNameWithId(id);
    const { items, historyId } = await getItems(id, () => gdrive.getFolderItems(id));
    const answer = await folder_questions(
      items,
      `${folderName} (${items.length})`,
      id,
      historyId
    );
    switch (answer) {
      case "RENAME":
        await handleRenameFolder(folderName, id, parentId);
        break;
      case "CREATE":
        await handleCreateFolder(id, parentId);
        break;
      case "UPLOAD":
        await processUploadActions({ name: folderName, parentId: id });
        break;
      case "ITEM_OPERATIONS":
        await processMultipleItems(items, id);
        break;
      case "DOWNLOAD":
        await handleDownloadFolder(items, folderName, id, parentId);
        break;
      case "DELETE":
        await handleDeleteFolder(id, parentId);
        break;
      case "TRASH":
        await handleTrashFolder(id, parentId);
        break;
      case "MOVE":
        await handleMoveFolder(id, parentId);
        break;
      default:
        if (typeof answer !== "string") {
          const { id: selectedId, mimeType } = answer;
          isGdriveFolder(mimeType)
            ? await processFolderActions(selectedId, id)
            : await processSelectedFile(answer, { id: id, name: folderName });
        }
        break;
    }
  } catch (error) {
    parentId ? await processFolderActions(parentId) : await processMainActions();
  }
};
