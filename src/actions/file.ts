import { processFolderActions } from "./folder.js";
import { existsSync } from "fs";
import { gdrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
import open from "open";
import { isExtensionValid } from "../utils/utils.js";
import { TFile } from "../types/types.js";
import path from "path";
import { removeCacheItem, updateCacheItem } from "../store/store.js";
import chalk from "chalk";

const { selected_item, rename, input_path, areYouSure } = questions;

export const processSelectedFile = async (file: TFile, folder?: { name: string; id: string }) => {
  try {
    let { id, name, mimeType } = file;
    const fileAnswer = await selected_item(name);
    // if (!isExtensionValid(name)) {
    // const ext = mimeType.split("/")[1];
    // update the name if the name of the uploaded file does not have extension.
    // }
    const backFunc = async (file: TFile) => {
      await processSelectedFile(file, folder);
      return;
    };

    switch (fileAnswer) {
      case "DELETE":
        const proceed = await areYouSure("Proceed deleting the item?");
        if (proceed) {
          removeCacheItem(folder?.id, file.id);
          await gdrive.deleteItem(id);
        }
        folder ? await processFolderActions(folder.id) : await processMainActions();
        break;
      case "TRASH":
        const proceed1 = await areYouSure(
          `Proceed moving the item to trash? ${chalk.gray(
            "(You will be able to restore it in the next 30 days.)"
          )}`
        );
        if (proceed1) {
          removeCacheItem(folder?.id, file.id);
          await gdrive.moveToTrash(id);
        }
        folder ? await processFolderActions(folder.id) : await processMainActions();
        break;
      case "RENAME":
        const newName = await rename(name);
        const renamedFile = await gdrive.rename(newName, id);
        updateCacheItem(folder?.id, renamedFile);
        folder ? await processFolderActions(folder.id) : await processMainActions();
        break;
      case "INFO":
        // console.clear();
        await gdrive.printFileInfo(id);
        await questions.pressKeyToContinue();
        await processSelectedFile(file, folder);
        break;
      case "DOWNLOAD":
        let newPath = await input_path("Provide a destination where to store file: ");
        if (newPath) {
          const hasFileExtension = isExtensionValid(newPath);
          if (!existsSync(newPath)) {
            console.log(
              "File path is invalid. Make sure you have entered the correct file path."
            );
            await backFunc(file);
            return;
          }
          if (!newPath.endsWith(path.sep)) newPath += path.sep;
          if (name && hasFileExtension) {
            newPath += name;
          } else {
            const suffix = "." + mimeType?.split(path.sep)[1];
            newPath += name + suffix;
          }
          await gdrive.downloadFile(newPath, id);
        }
        folder ? await processFolderActions(folder.id) : await processMainActions();
        break;
      case "OPEN":
        await open(`https://drive.google.com/file/d/${id}/view`);
        await processSelectedFile(file, folder);
        break;
      // case "MOVE":
      //   const folders = await gdrive.getRootFolders();
      //   if (folders.length > 0 && id) {
      //     const message = `Select the folder where you want to move the file: ${chalk.blueBright(
      //       file.name
      //     )}`;
      //     const selectedFolder = await folder_questions_1(folders, message);
      //     const selectedFolderId = await gdrive.getFolderIdWithName(selectedFolder);
      //     await gdrive.moveFile(id, selectedFolderId);
      //   }
    }
  } catch (error) {
    if (folder) {
      await processFolderActions(folder.id);
    } else {
      await processMainActions();
    }
  }
};
