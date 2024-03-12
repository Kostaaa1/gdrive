import path from "path";
import { googleDrive, questions } from "../config/config.js";
import { convertPathToStream, getMimeType, isDirectory } from "../utils/utils.js";
import { processSingleFolderUpload } from "./folder.js";
export const processUploadFromPath = async (parent) => {
    const { input_path } = questions;
    const res_path = await input_path("📁 Provide a destination for upload: ");
    console.log("DSADKOSA", res_path, parent);
    if (await isDirectory(res_path)) {
        await processSingleFolderUpload(res_path, parent);
    }
    else {
        // GROUP:
        const stream = await convertPathToStream(res_path);
        const mimeType = getMimeType(res_path);
        const name = path.basename(res_path);
        await googleDrive.uploadSingleFile(name, stream, mimeType, parent?.parentId);
    }
};
//# sourceMappingURL=upload.js.map