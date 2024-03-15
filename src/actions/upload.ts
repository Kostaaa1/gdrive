import path from "path";
import { googleDrive, questions } from "../config/config.js";
import { convertPathToStream, getMimeType, isDirectory } from "../utils/utils.js";
import { processSingleFolderUpload } from "./folder.js";

export const processUploadFromPath = async (parent?: { name: string; parentId: string }) => {
  const { input_path } = questions;
  const res_path = await input_path("📁 Provide a destination for upload: ");
  if (!res_path) return;

  if (await isDirectory(res_path)) {
    await processSingleFolderUpload(res_path, parent);
  } else {
    // GROUP:
    const stream = await convertPathToStream(res_path);
    const mimeType = getMimeType(res_path);
    const name = path.basename(res_path);
    await googleDrive.uploadSingleFile(name, stream, mimeType!, parent?.parentId);
  }
};
