import chalk from "chalk";
import { initProgressBar, isGdriveFolder } from "../utils/utils.js";
import { gdrive, questions } from "../config/config.js";
import { processMainActions, processMultipleItems } from "../index.js";
import { processSelectedFile } from "./file.js";
import { processUploadActions } from "./upload.js";
import { TFile, TFolder } from "../types/types.js";
import { mkdir } from "fs/promises";
import ora from "ora";
import path from "path";

const { input_path, areYouSure, folder_questions, input } = questions;

const handleDownloadFolder = async (
  files: TFile[],
  folderName: string,
  id: string,
  parentId?: string
) => {
  try {
    const cpath = await input_path("Provide a desired destination to store the drive folder: ");
    const newPath = path.join(cpath, folderName);
    await mkdir(newPath);

    const progressBar = initProgressBar(files.length);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progressBar.increment();
      await gdrive.downloadFile(path.join(newPath, file.name), file.id);
      if (i === files.length - 1) progressBar.stop();
    }
    await processFolderActions({ id, parentId, files });
  } catch (error) {
    await processFolderActions({ id, parentId, files });
  }
};

const handleRenameFolder = async (
  folderName: string,
  id: string,
  parentId?: string,
  files?: TFile[]
) => {
  try {
    const new_name = await input(`Rename folder ${chalk.blueBright(folderName)}: `);
    await gdrive.rename(new_name, id);
    await processFolderActions({ id, parentId, files });
  } catch (error) {
    await processFolderActions({ id, parentId, files });
  }
};

const handleCreateFolder = async (id: string, parentId?: string, files?: TFile[]) => {
  try {
    const newName = await input("Enter new folder name: ");
    await gdrive.createFolder(newName, id);
    await processFolderActions({ id, parentId });
  } catch (error) {
    await processFolderActions({ id, parentId, files });
  }
};

const handleDeleteFolder = async (id: string, parentId?: string, files?: TFile[]) => {
  try {
    const proceed = await areYouSure("Are you sure?");
    if (proceed) await gdrive.deleteItem(id);
    await processFolderActions({ id, parentId, files });
  } catch (error) {
    await processFolderActions({ id, parentId, files });
  }
};

const handleTrashFolder = async (id: string, parentId?: string, files?: TFile[]) => {
  try {
    const proceed = await areYouSure("Are you sure?");
    if (proceed) await gdrive.moveToTrash(id);
    await processFolderActions({ id, parentId, files });
  } catch (error) {
    await processFolderActions({ id, parentId, files });
  }
};

export const selectItemToMove = async (id?: string): Promise<TFolder> => {
  const allFolders = await gdrive.getDriveFolders(id);
  const selectedFolder = await questions.move_questions(allFolders);
  return selectedFolder;
};

const handleMoveFolder = async (id: string, parentId?: string, files?: TFile[]) => {
  try {
    // const allFolders = await gdrive.getDriveFolders(id);
    // const selectedFolder = await questions.move_questions(allFolders);
    const selected = await selectItemToMove(id);
    await gdrive.moveFile(id, selected.id);
    await processFolderActions({ id, files });
  } catch (error) {
    await processFolderActions({ id, parentId, files });
  }
};

export const processFolderActions = async ({
  id,
  files,
  parentId,
}: {
  id: string;
  parentId?: string;
  files?: TFile[];
}) => {
  try {
    const folderName = await gdrive.getFolderNameWithId(id);
    const items = files || (await gdrive.getFolderItems(id)).files;

    const answer = await folder_questions(items, folderName);
    switch (answer) {
      case "RENAME":
        await handleRenameFolder(folderName, id, parentId!, items);
        break;
      case "CREATE":
        await handleCreateFolder(id, parentId, items);
        break;
      case "UPLOAD":
        await processUploadActions({ name: folderName, parentId: id });
        // await processFolderActions({ id, parentId });
        break;
      case "ITEM_OPERATIONS":
        await processMultipleItems(items, id);
        // await processFolderActions({ id, parentId });
        break;
      case "DOWNLOAD":
        await handleDownloadFolder(items, folderName, id, parentId);
        break;
      case "DELETE":
        await handleDeleteFolder(id, parentId, items);
        break;
      case "TRASH":
        await handleTrashFolder(id, parentId, items);
        break;
      case "MOVE":
        await handleMoveFolder(id);
        console.log("Move");
        break;
      default:
        if (typeof answer !== "string") {
          const { id: selectedId, mimeType } = answer;
          isGdriveFolder(mimeType)
            ? await processFolderActions({ id: selectedId, parentId: id })
            : await processSelectedFile(answer, { id: id, name: folderName });
        }
        break;
    }
  } catch (error) {
    parentId ? await processFolderActions({ id: parentId }) : await processMainActions();
  }
};
