import chalk from "chalk";
import { existsSync, readdirSync } from "fs";
import path from "path";
import { isDirectory, convertPathToStream, getMimeType, isGdriveFolder } from "../utils/utils.js";
import { SingleBar } from "cli-progress";
import { googleDrive, questions } from "../config/config.js";
import { processMainActions, processMultipleItems } from "../index.js";
import { processUploadFromPath } from "./upload.js";
import { FolderActions, TFile } from "../types/types.js";

const { delete_questions, confirm, folder_questions, input } = questions;

export const processFolderActions = async (
  folderName: string,
  repeatData?: { action: FolderActions; data: string }
) => {
  const folderId = await googleDrive.getFolderIdWithName(folderName);
  const selectedFolder = { name: folderName, id: folderId };
  const files = await googleDrive.getFolderItems(folderId);
  try {
    const res = repeatData?.action || (await folder_questions(files, selectedFolder.name));

    switch (res) {
      case "RENAME":
        try {
          const new_name = await input(
            `Rename folder ${chalk.blueBright(selectedFolder.name)}: `
          );
          await googleDrive.rename(new_name, selectedFolder.id);
          await processFolderActions(new_name);
        } catch (error) {
          await processFolderActions(selectedFolder.name);
        }
        break;
      case "CREATE":
        const newName = await input("Enter new folder name: ");
        await googleDrive.createFolder(newName, selectedFolder.id);
        await processFolderActions(selectedFolder.name);
        break;
      case "UPLOAD":
        // await processUploadActions(folderId, folderName);
        await processUploadFromPath({ name: folderName, parentId: folderId });
        await processFolderActions(folderName);
        break;
      case "ITEM_OPERATIONS":
        await processMultipleItems(files);
        break;
      default:
        if (typeof res !== "string") {
          const { name, mimeType } = res;
          // mimeType === "application/vnd.google-apps.folder"
          //   ? await processFolderActions(name!)
          //   : await processSelectedFile(res, { id: folderId, name: folderName });
          if (isGdriveFolder(mimeType)) {
          }
        }
        break;
    }
  } catch (error) {
    // if (selectedFolder.name) {
    //   await processFolderActions(folderName);
    // } else {
    await processMainActions();
    // }
  }
};

export const processSingleFolderUpload = async (
  resPath: string,
  parent?: { name: string; parentId: string }
) => {
  if (existsSync(resPath)) {
    const { name, parentId } = parent!;
    const folderName = path.basename(resPath);
    const folderId = name
      ? await googleDrive.createFolder(folderName, parentId)
      : await googleDrive.getFolderIdWithName(folderName);

    const files = readdirSync(resPath).reverse();

    let progressBar;
    if (files.length > 1) {
      progressBar = new SingleBar({
        format: "Progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}",
      });
      progressBar.start(files.length, 0);
    }

    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      const fullPath = path.join(resPath, fileName);
      const mimeType = getMimeType(fullPath);

      if (mimeType) {
        const stream = await convertPathToStream(fullPath);
        await googleDrive.uploadSingleFile(fileName, stream, mimeType!, folderId);
      } else {
        const isFolder = await isDirectory(fullPath);
        if (isFolder)
          await processSingleFolderUpload(fullPath, { name: fileName, parentId: folderId });
      }

      if (progressBar) {
        progressBar.increment();
        if (i === files.length - 1) {
          progressBar.stop();
        }
      }
    }
  } else {
    console.log("Folder path was invalid. Make sure you enter the correct path!");
  }
};

export const processDeleteActions = async (folderName: string, folderId: string) => {
  try {
    const choice = await delete_questions();

    const actions = {
      DELETE: async () => {
        const confirmed = await confirm("Are you sure that you want to delete this item forver?");
        if (confirmed) await googleDrive.deleteItem(folderId);
      },
      TRASH: async () => {
        const confirmed = await confirm(
          `Are you sure? ${chalk.gray(
            "(You will be able to recover the item from trash in the next 30 days.)"
          )}`
        );
        if (confirmed) await googleDrive.moveToTrash(folderId);
      },
    };

    await actions[choice]();
    await processMainActions();
  } catch (error) {
    console.log(error);
    // await processFolderActions(folderName);
  }
};
