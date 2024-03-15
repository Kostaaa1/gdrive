import { processFolderActions } from "./folder.js";
import { existsSync } from "fs";
import { googleDrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
import open from "open";
import { isExtensionValid } from "../utils/utils.js";
const { selected_item, rename, input_path, confirm } = questions;
export const deleteGdriveItem = async (id) => {
    try {
        const p = await confirm("Are you sure?");
        if (p)
            await googleDrive.deleteItem(id);
    }
    catch (error) {
        console.log(error);
    }
};
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
                // await processDeleteActions(name!, id!);
                await deleteGdriveItem(id);
                break;
            case "TRASH":
                break;
            case "RENAME":
                const newName = await rename(name);
                await googleDrive.rename(newName, id);
                file.name = newName;
                folder ? await processFolderActions(folder.name) : await processMainActions();
                break;
            case "INFO":
                await googleDrive.printFileInfo(id);
                const choice = await confirm("Go back?");
                if (choice)
                    await processSelectedFile(file, folder);
                break;
            case "DOWNLOAD":
                let path = await input_path("Provide a destination where to store file: ");
                if (path) {
                    const hasFileExtension = isExtensionValid(path);
                    if (!existsSync(path)) {
                        console.log("File path is invalid. Please check if you have entered the correct file path.");
                        await backFunc(file);
                        return;
                    }
                    if (!path.endsWith("/"))
                        path += "/";
                    if (name && hasFileExtension) {
                        path = path + name;
                    }
                    else {
                        const suffix = "." + mimeType?.split("/")[1];
                        path += name + suffix;
                    }
                    await googleDrive.downloadFile(path, id);
                }
                folder ? await processFolderActions(folder.name) : await processMainActions();
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
            //   await backFunc(file);
            //   break;
        }
    }
    catch (error) {
        if (folder) {
            await processFolderActions(folder.name);
        }
        else {
            await processMainActions();
        }
    }
};
//# sourceMappingURL=file.js.map