import "dotenv/config";
import { googleDrive, questions } from "./config/config.js";
import { createFolder, parsePathName, isGdriveFolder, openFile } from "./utils/utils.js";
import { processFolderActions } from "./actions/folder.js";
import { processSelectedFile } from "./actions/file.js";
import { processTrashActions } from "./actions/trash.js";
import open from "open";
import { processUploadFromPath } from "./actions/upload.js";
import path from "path";
import { SingleBar } from "cli-progress";
const { main_questions, checkbox, item_operation, input_path, input } = questions;
const downloadDriveItem = async (item, folderPath) => {
    if (isGdriveFolder(item.mimeType)) {
        const items = await googleDrive.getFolderItems(item.id);
        const newPath = await createFolder(path.join(folderPath, item.name));
        for (let i = 0; i < items.length; i++) {
            const file = items[i];
            await downloadDriveItem(file, newPath);
        }
    }
    else {
        const pathname = await parsePathName(path.join(folderPath, item.name));
        await googleDrive.downloadFile(pathname, item.id);
    }
};
export const processMultipleItems = async (items) => {
    try {
        const selected = await checkbox("Select items: ", items);
        const operation = await item_operation();
        let cpath = undefined;
        if (operation === "DOWNLOAD") {
            cpath = await input_path("Provide a path where to store the items: ", false);
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
                    const proceed = await confirm("Confirm delete?");
                    if (proceed)
                        await googleDrive.deleteItem(item.id);
                    break;
                case "TRASH":
                    await googleDrive.moveToTrash(item.id);
                    break;
                case "DOWNLOAD":
                    if (cpath)
                        await downloadDriveItem(item, cpath);
                    break;
                // case "MOVE":
                //   break;
            }
            if (i === selected.length - 1) {
                progressBar.stop();
            }
        }
        await processMainActions();
    }
    catch (error) {
        await processMainActions();
    }
};
export const processMainActions = async () => {
    try {
        const storageSizeMsg = await googleDrive.getDriveStorageSize();
        const folders = await googleDrive.getRootItems();
        const answer = await main_questions(folders, storageSizeMsg);
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
                if (filePath) {
                    await openFile(filePath);
                }
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
                    const { mimeType } = answer;
                    if (mimeType === "application/vnd.google-apps.folder") {
                        await processFolderActions(answer.name);
                    }
                    else {
                        await processSelectedFile(answer);
                    }
                    break;
                }
        }
    }
    catch (error) {
        await processMainActions();
    }
};
(async () => {
    await processMainActions();
})();
//# sourceMappingURL=index.js.map