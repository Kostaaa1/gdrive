import "dotenv/config";
import { googleDrive, questions } from "./config/config.js";
import { openFile } from "./utils/utils.js";
import { processFolderActions } from "./actions/folder.js";
import { processSelectedFile } from "./actions/file.js";
import { processTrashActions } from "./actions/trash.js";
import open from "open";
import { processUploadFromPath } from "./actions/upload.js";
import inquirer from "inquirer";
export const processMultipleItems = async (items) => {
    try {
        const { item_operation } = questions;
        const operation = await item_operation();
        const { selected } = await inquirer.prompt([
            {
                message: `Select items to ${operation}: `,
                type: "checkbox",
                name: "selected",
                choices: items.map((x) => x && { ...x, value: x.id }),
            },
        ]);
        // console.log("selected", selected);
        for (const item of selected) {
            switch (operation) {
                case "DELETE":
                    await googleDrive.deleteItem(item);
                    break;
                case "TRASH":
                    await googleDrive.moveToTrash(item);
                    break;
                case "MOVE":
                    break;
                default:
                    console.log("Yooooo");
                    break;
            }
        }
    }
    catch (error) {
        console.log(error);
    }
};
export const processMainActions = async () => {
    try {
        const { main_questions, input_path, input } = questions;
        const storageSize = await googleDrive.getDriveStorageSize();
        const folders = await googleDrive.getRootItems();
        const answer = await main_questions(folders, storageSize);
        switch (answer) {
            case "CHECKBOX":
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
        processMainActions();
    }
};
(async () => {
    await processMainActions();
    // await processMultipleItems();
})();
//# sourceMappingURL=index.js.map