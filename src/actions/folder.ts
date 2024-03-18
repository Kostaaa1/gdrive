import chalk from "chalk";
import { isGdriveFolder } from "../utils/utils.js";
import { googleDrive, questions } from "../config/config.js";
import { processMainActions, processMultipleItems } from "../index.js";
import { processSelectedFile } from "./file.js";
import { processUploadFromPath } from "./upload.js";

const { delete_questions, areYouSure, folder_questions, input } = questions;

export const processFolderActions = async (currentId: string, parentId?: string) => {
  const folderName = await googleDrive.getFolderNameWithId(currentId);
  try {
    const files = await googleDrive.getFolderItems(currentId);
    const res = await folder_questions(files, folderName);
    let proceed: boolean = false;
    // const res = repeatData?.action || (await folder_questions(files, folderName));
    switch (res) {
      case "RENAME":
        const new_name = await input(`Rename folder ${chalk.blueBright(folderName)}: `);
        await googleDrive.rename(new_name, currentId);
        await processFolderActions(currentId, parentId);
        // try {
        // } catch (error) {
        //   await processFolderActions(folderName);
        // }
        break;
      case "CREATE":
        const newName = await input("Enter new folder name: ");
        await googleDrive.createFolder(newName, currentId);
        await processFolderActions(currentId, parentId);
        break;
      case "UPLOAD":
        // await processUploadActions(folderId, folderName);
        await processUploadFromPath({ name: folderName, parentId: currentId });
        await processFolderActions(currentId, parentId);
        break;
      case "ITEM_OPERATIONS":
        await processMultipleItems(files, folderName);
        break;
      case "DELETE":
        proceed = await areYouSure("Are you sure?");
        if (proceed) await googleDrive.deleteItem(currentId);
        await processFolderActions(currentId, parentId);
        break;
      case "TRASH":
        proceed = await areYouSure("Are you sure?");
        if (proceed) await googleDrive.moveToTrash(currentId);
        await processFolderActions(currentId, parentId);
        break;
      default:
        if (typeof res !== "string") {
          const { id, mimeType } = res;
          isGdriveFolder(mimeType)
            ? await processFolderActions(id, currentId)
            : await processSelectedFile(res, { id: currentId, name: folderName });
        }
        break;
    }
  } catch (error) {
    parentId ? await processFolderActions(parentId) : await processMainActions();
  }
};

export const processDeleteActions = async (folderName: string, folderId: string) => {
  try {
    const choice = await delete_questions();
    const actions = {
      DELETE: async () => {
        const confirmed = await areYouSure(
          "Are you sure that you want to delete this item forver?"
        );
        if (confirmed) await googleDrive.deleteItem(folderId);
      },
      TRASH: async () => {
        const confirmed = await areYouSure(
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
    await processFolderActions(folderName);
  }
};
