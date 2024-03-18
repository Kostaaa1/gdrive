import "dotenv/config";
import { googleDrive, questions } from "./config/config.js";
import { createFolder, parsePathName, isGdriveFolder, openFile } from "./utils/utils.js";
import { processFolderActions } from "./actions/folder.js";
import { processSelectedFile } from "./actions/file.js";
import { processTrashActions } from "./actions/trash.js";
import open from "open";
import path from "path";
import { TFile } from "./types/types.js";
import { SingleBar } from "cli-progress";
import { processUploadFromPath } from "./actions/upload.js";

const { checkbox, areYouSure, item_operation, input_path, input } = questions;

const downloadDriveFiles = async (item: TFile, folderPath: string) => {
  if (isGdriveFolder(item.mimeType)) {
    const items = await googleDrive.getFolderItems(item.id);
    const newPath = await createFolder(path.join(folderPath, item.name));
    for (let i = 0; i < items.length; i++) {
      const file = items[i];
      await downloadDriveFiles(file, newPath);
    }
  } else {
    const pathname = await parsePathName(path.join(folderPath, item.name));
    await googleDrive.downloadFile(pathname, item.id);
  }
};

export const processMultipleItems = async (items: TFile[], parentId?: string) => {
  try {
    const selected = await checkbox("Select items: ", items);
    const operation = await item_operation();
    let cpath: string | undefined = undefined;

    if (operation === "DOWNLOAD") {
      cpath = await input_path("Provide a path where to store the items: ");
    }

    const progressBar = new SingleBar({
      format: "Progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}",
    });
    progressBar.start(selected.length, 0);

    for (let i = 0; i < selected.length; i++) {
      progressBar.increment();

      const item = selected[i];
      switch (operation) {
        case "DELETE":
          const proceed = await areYouSure("Confirm delete?");
          if (proceed) await googleDrive.deleteItem(item.id);
          break;
        case "TRASH":
          await googleDrive.moveToTrash(item.id);
          break;
        case "DOWNLOAD":
          if (cpath) await downloadDriveFiles(item, cpath);
          break;
      }

      if (i === selected.length - 1) {
        progressBar.stop();
      }
    }

    parentId ? await processFolderActions(parentId) : await processMainActions();
  } catch (error) {
    parentId ? await processFolderActions(parentId) : await processMainActions();
  }
};

export const processMainActions = async () => {
  try {
    const storageSizeMsg = await googleDrive.getDriveStorageSize();
    const folders = await googleDrive.getRootItems();
    const answer = await questions.main_questions(folders, storageSizeMsg);

    switch (answer) {
      case "ITEM_OPERATIONS":
        await processMultipleItems(folders);
        break;
      case "UPLOAD":
        await processUploadFromPath();
        await processMainActions();
        break;
      case "CREATE":
        const newFolder = await input("Enter new folder name: ");
        await googleDrive.createFolder(newFolder);
        await processMainActions();
        break;
      case "OPEN":
        const filePath = await input_path("Enter the path for the file you want to preview: ");
        if (filePath) await openFile(filePath);
        await processMainActions();
        break;
      case "TRASH":
        await processTrashActions();
        break;
      case "OPEN_DRIVE":
        await open("https://drive.google.com/drive/u/0/my-drive");
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
  await processMainActions();
})();
