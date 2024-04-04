import chalk from "chalk";
import { createFolder, initProgressBar, isGdriveFolder } from "../utils/utils.js";
import { gdrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
import { processSelectedFile } from "./file.js";
import { processUploadActions } from "./upload.js";
import { TFile, TFolder } from "../types/types.js";
import path from "path";
import { downloadDriveItem, processMultipleItems } from "./batch.js";
import { getItems } from "../store/store.js";

const { input_path, areYouSure, folder_questions, input } = questions;

const handleRenameFolder = async (folderName: string, id: string, parentId?: string) => {
  try {
    const new_name = await input(`Rename folder ${chalk.blueBright(folderName)}: `);
    await gdrive.rename(new_name, id);
    await processFolderActions(id, parentId);
  } catch (error) {
    await processFolderActions(id, parentId);
  }
};

const handleCreateFolder = async (id: string, parentId?: string) => {
  try {
    const newName = await input("Enter new folder name: ");
    await gdrive.createFolder(newName, id);
    await processFolderActions(id, parentId);
  } catch (error) {
    await processFolderActions(id, parentId);
  }
};

const handleDeleteFolder = async (id: string, parentId?: string) => {
  try {
    const proceed = await areYouSure("Are you sure?");
    if (proceed) await gdrive.deleteItem(id);
    await processFolderActions(id, parentId);
  } catch (error) {
    await processFolderActions(id, parentId);
  }
};

const handleTrashFolder = async (id: string, parentId?: string) => {
  try {
    const proceed = await areYouSure("Are you sure?");
    if (proceed) await gdrive.moveToTrash(id);
    await processFolderActions(id, parentId);
  } catch (error) {
    await processFolderActions(id, parentId);
  }
};

export const selectItemToMove = async (id?: string): Promise<TFolder> => {
  const allFolders = await gdrive.getDriveFolders(id);
  const selectedFolder = await questions.move_questions(allFolders);
  return selectedFolder;
};

const handleMoveFolder = async (id: string) => {
  try {
    const selected = await selectItemToMove(id);
    await gdrive.moveFile(id, selected.id);
    await processFolderActions(id);
  } catch (error) {
    await processFolderActions(id);
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
    const bar = initProgressBar(files.length);

    const processes = files.map(async (file) => {
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
    const items = await getItems(id, () => gdrive.getFolderItems(id));
    const answer = await folder_questions(items, `${folderName} (${items.length})`);
    // const items = files || (await gdrive.getFolderItems(id)).files;

    switch (answer) {
      case "RENAME":
        await handleRenameFolder(folderName, id, parentId);
        break;
      case "CREATE":
        await handleCreateFolder(id, parentId);
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
        await handleDeleteFolder(id, parentId);
        break;
      case "TRASH":
        await handleTrashFolder(id, parentId);
        break;
      case "MOVE":
        await handleMoveFolder(id);
        console.log("Move");
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
