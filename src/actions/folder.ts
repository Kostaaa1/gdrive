import chalk from "chalk";
import { isGdriveFolder } from "../utils/utils.js";
import { googleDrive, questions } from "../config/config.js";
import { processMainActions, processMultipleItems } from "../index.js";
import { processSelectedFile } from "./file.js";
import { processUploadActions } from "./upload.js";

const { delete_questions, areYouSure, folder_questions, input } = questions;

export const processFolderActions = async (currentId: string, parentId?: string) => {
  const folderName = await googleDrive.getFolderNameWithId(currentId);
  try {
    const { files } = await googleDrive.getFolderItems(currentId);
    const answer = await folder_questions(files, folderName);
    let proceed: boolean = false;

    switch (answer) {
      case "RENAME":
        const new_name = await input(`Rename folder ${chalk.blueBright(folderName)}: `);
        await googleDrive.rename(new_name, currentId);
        await processFolderActions(currentId, parentId);
        break;
      case "CREATE":
        const newName = await input("Enter new folder name: ");
        await googleDrive.createFolder(newName, currentId);
        await processFolderActions(currentId, parentId);
        break;
      case "UPLOAD":
        console.log(folderName, currentId);
        await processUploadActions({ name: folderName, parentId: currentId });
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
        if (typeof answer !== "string") {
          const { id, mimeType } = answer;
          isGdriveFolder(mimeType)
            ? await processFolderActions(id, currentId)
            : await processSelectedFile(answer, { id: currentId, name: folderName });
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
