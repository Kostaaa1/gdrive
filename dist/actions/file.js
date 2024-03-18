import { processFolderActions } from "./folder.js";
import { existsSync } from "fs";
import { googleDrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
import open from "open";
import { isExtensionValid } from "../utils/utils.js";
import path from "path";
const { selected_item, rename, input_path, areYouSure } = questions;
export const processSelectedFile = async (file, folder) => {
    try {
        let { id, name, mimeType } = file;
        const fileAnswer = await selected_item(name);
        const backFunc = async (file) => {
            await processSelectedFile(file, folder);
            return;
        };
        switch (fileAnswer) {
            case "DELETE":
                const proceed = await areYouSure("Are you sure?");
                if (proceed)
                    await googleDrive.deleteItem(id);
                break;
            case "TRASH":
                const proceed1 = await areYouSure("Are you sure?");
                if (proceed1)
                    await googleDrive.moveToTrash(id);
                break;
            case "RENAME":
                const newName = await rename(name);
                await googleDrive.rename(newName, id);
                folder ? await processFolderActions(folder.id) : await processMainActions();
                break;
            case "INFO":
                // console.clear();
                await googleDrive.printFileInfo(id);
                await questions.pressKeyToContinue();
                await processSelectedFile(file, folder);
                break;
            case "DOWNLOAD":
                let newPath = await input_path("Provide a destination where to store file: ");
                if (newPath) {
                    const hasFileExtension = isExtensionValid(newPath);
                    if (!existsSync(newPath)) {
                        console.log("File newPath is invalid. Please check if you have entered the correct file path.");
                        await backFunc(file);
                        return;
                    }
                    if (!newPath.endsWith(path.sep))
                        newPath += path.sep;
                    if (name && hasFileExtension) {
                        newPath += name;
                    }
                    else {
                        const suffix = "." + mimeType?.split(path.sep)[1];
                        newPath += name + suffix;
                    }
                    await googleDrive.downloadFile(newPath, id);
                }
                folder ? await processFolderActions(folder.id) : await processMainActions();
                break;
            case "OPEN":
                await open(`https://drive.google.com/file/d/${id}/view`);
                await processSelectedFile(file, folder);
                break;
            // case "MOVE":
            //   const folders = await googleDrive.getRootFolders();
            //   if (folders.length > 0 && id) {
            //     const message = `Select the folder where you want to move the file: ${chalk.blueBright(
            //       file.name
            //     )}`;
            //     const selectedFolder = await folder_questions_1(folders, message);
            //     const selectedFolderId = await googleDrive.getFolderIdWithName(selectedFolder);
            //     await googleDrive.moveFile(id, selectedFolderId);
            //   }
        }
    }
    catch (error) {
        if (folder) {
            await processFolderActions(folder.id);
        }
        else {
            await processMainActions();
        }
    }
};
//# sourceMappingURL=file.js.map