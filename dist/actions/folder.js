import chalk from "chalk";
import { existsSync, readdirSync } from "fs";
import path from "path";
import { isDirectory, convertPathToStream, getMimeType } from "../utils/utils.js";
import { SingleBar } from "cli-progress";
import { mkdir } from "fs/promises";
import { processSelectedFile } from "./file.js";
import { googleDrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
import { processUploadFromPath } from "./upload.js";
const processDownloadFolder = async (folderName, files, repeatData) => {
    const { input_path } = questions;
    if (repeatData) {
        console.clear();
        console.log(`The folder ${chalk.blueBright(folderName)}, already exists on the provided path (${chalk.gray(repeatData.data)}).`);
    }
    const folderPath = await input_path("Provide a path where to store the folder: ");
    const progressBar = new SingleBar({
        format: "Progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}",
    });
    progressBar.start(files.length, 0);
    const newPath = path.join(folderPath, folderName);
    if (!existsSync(newPath)) {
        await mkdir(newPath);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            await googleDrive.downloadFile(path.join(newPath, file.name), file.id);
            progressBar.increment();
            if (i === files.length - 1) {
                progressBar.stop();
            }
        }
        await processFolderActions(folderName);
    }
    else {
        await processFolderActions(folderName, { action: "DOWNLOAD", data: newPath });
    }
};
export const processSingleFolderUpload = async (resPath, parent) => {
    if (existsSync(resPath)) {
        const { name, parentId } = parent;
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
                await googleDrive.uploadSingleFile(fileName, stream, mimeType, folderId);
            }
            else {
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
    }
    else {
        console.log("Folder path was invalid. Make sure you enter the correct path!");
    }
};
export const processDeleteActions = async (folderName, folderId) => {
    try {
        const { delete_questions, confirm } = questions;
        const choice = await delete_questions();
        const actions = {
            DELETE: async () => {
                const confirmed = await confirm("Are you sure that you want to delete selceted item forver?");
                if (confirmed)
                    await googleDrive.deleteItem(folderId);
            },
            TRASH: async () => {
                const confirmed = await confirm(`Are you sure? ${chalk.gray("(in the next 30 days you will be able to recover it from)")}`);
                if (confirmed)
                    await googleDrive.moveToTrash(folderId);
            },
        };
        await actions[choice]();
        await processMainActions();
    }
    catch (error) {
        processFolderActions(folderName);
    }
};
export const processFolderActions = async (folderName, repeatData) => {
    const { folder_questions, input } = questions;
    const folderId = await googleDrive.getFolderIdWithName(folderName);
    const selectedFolder = { name: folderName, id: folderId };
    const files = await googleDrive.listFolderFiles(folderId);
    try {
        const res = repeatData?.action || (await folder_questions(files, selectedFolder.name));
        switch (res) {
            case "RENAME":
                try {
                    const new_name = await input(`Rename folder ${chalk.blueBright(selectedFolder.name)}: `);
                    await googleDrive.rename(new_name, selectedFolder.id);
                    await processFolderActions(new_name);
                }
                catch (error) {
                    await processFolderActions(selectedFolder.name);
                }
                break;
            case "DOWNLOAD":
                await processDownloadFolder(folderName, files, repeatData);
                break;
            case "DELETE":
                await processDeleteActions(folderName, folderId);
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
            default:
                if (typeof res !== "string") {
                    const { name, mimeType } = res;
                    mimeType === "application/vnd.google-apps.folder"
                        ? await processFolderActions(name)
                        : await processSelectedFile(res, { id: folderId, name: folderName });
                }
                break;
        }
    }
    catch (error) {
        // if (selectedFolder.name) {
        //   await processFolderActions(folderName);
        // } else {
        await processMainActions();
        // }
    }
};
//# sourceMappingURL=folder.js.map