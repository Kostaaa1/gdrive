import path from "path";
import { googleDrive, questions } from "../config/config.js";
import { convertPathToStream, getMimeType, isDirectory } from "../utils/utils.js";
import { processFolderActions } from "./folder.js";
import { processMainActions } from "../index.js";
import { readdirSync } from "fs";
import { SingleBar } from "cli-progress";
export const processUploadFolder = async (resPath, parent) => {
    // const { name, parentId } = parent;
    const folderName = path.basename(resPath);
    const folderId = parent && parent.name
        ? await googleDrive.createFolder(folderName, parent.parentId)
        : await googleDrive.getFolderIdWithName(folderName, parent?.parentId);
    // const folderId = await googleDrive.createFolder(folderName);
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
                await processUploadFolder(fullPath, { name: fileName, parentId: folderId });
        }
        if (progressBar) {
            progressBar.increment();
            if (i === files.length - 1) {
                progressBar.stop();
            }
        }
    }
};
export const processUploadFromPath = async (parent) => {
    try {
        const { input_path } = questions;
        const res_path = await input_path("📁 Provide a destination for upload: ");
        const isDir = await isDirectory(res_path);
        if (isDir) {
            await processUploadFolder(res_path, parent);
        }
        else {
            // GROUP:
            const stream = await convertPathToStream(res_path);
            const mimeType = getMimeType(res_path);
            const name = path.basename(res_path);
            await googleDrive.uploadSingleFile(name, stream, mimeType, parent?.parentId);
        }
    }
    catch (error) {
        parent ? await processFolderActions(parent.parentId) : await processMainActions();
    }
};
//# sourceMappingURL=upload.js.map