import "dotenv/config";
import { cache, gdrive, questions } from "./config/config.js";
import { isGdriveFolder, openFile } from "./utils/utils.js";
import { processFolderActions } from "./actions/folder.js";
import { processSelectedFile } from "./actions/file.js";
import { processTrashActions } from "./actions/trash.js";
import { processUploadActions } from "./actions/upload.js";
import { processMultipleItems } from "./actions/batch.js";
import { addCacheItem, getItems, getStorageSize } from "./store/store.js";
import open from "open";

const { input_path, input } = questions;

export const processMainActions = async () => {
  try {
    const storageSizeMsg = await getStorageSize();
    const { historyId, items } = await getItems("root", () => gdrive.getRootItems());
    const answer = await questions.main_questions(items, storageSizeMsg, historyId);
    switch (answer) {
      case "ITEM_OPERATIONS":
        await processMultipleItems(items);
        break;
      case "UPLOAD":
        await processUploadActions();
        await processMainActions();
        break;
      case "CREATE":
        const newFolder = await input("Enter new folder name: ");
        const folder = await gdrive.createFolder(newFolder);
        addCacheItem("root", folder);
        await processMainActions();
        break;
      case "OPEN":
        const filePath = await input_path("Enter the path for the file you want to preview: ");
        await openFile(filePath);
        await processMainActions();
        break;
      case "TRASH":
        await processTrashActions();
        break;
      case "OPEN_DRIVE":
        await open("https://drive.google.com/drive/u/0/my-drive");
        await processMainActions();
        break;
      case "SWITCH":
        cache.flushAll();
        await gdrive.logOut();
        await processMainActions();
        break;
      case "EXIT":
        process.exit();
      default:
        if (typeof answer !== "string") {
          isGdriveFolder(answer.mimeType)
            ? await processFolderActions(answer.id)
            : await processSelectedFile(answer);
          break;
        }
    }
  } catch (error) {
    await processMainActions();
  }
};

(async () => {
  await gdrive.logIn();
  await processMainActions();
})();
