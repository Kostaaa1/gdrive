import axios from "axios";
import { Readable } from "stream";
import fs from "fs";
import mime from "mime";
import { exec } from "child_process";
import open from "open";
import path from "path";
import { readdir, access, mkdir } from "fs/promises";
import chalk from "chalk";
export function formatDate(date) {
    const formattedDate = new Date(date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
    });
    return formattedDate;
}
export function convertBytes(bytes) {
    const b = Number(bytes);
    const KB = b / 1024;
    const MB = KB / 1024;
    const GB = MB / 1024;
    const TB = GB / 1024;
    const result = {
        bytes,
        KB: KB.toFixed(2),
        MB: MB.toFixed(2),
        GB: GB.toFixed(2),
        TB: TB.toFixed(2),
    };
    const index = Object.entries(result).findIndex((x) => x[1][0] === "0");
    const output = Object.entries(result)[index - 1];
    return output[1].split(".")[0] + output[0];
}
export const isDirectory = (path) => {
    if (fs.existsSync(path)) {
        return new Promise((resolve, reject) => {
            fs.stat(path, (err, stats) => {
                if (err) {
                    if (err.code === "ENOENT") {
                        reject(new Error("Path does not exist"));
                    }
                    else {
                        reject(err);
                    }
                }
                else {
                    if (stats.isFile()) {
                        resolve(false);
                    }
                    else if (stats.isDirectory()) {
                        resolve(true);
                    }
                    else {
                        reject(new Error("Path is neither a file nor a directory"));
                    }
                }
            });
        });
    }
    else {
        throw new Error("The path that you provided is invalid.");
    }
};
export function parseFileExtension(name, mimeType) {
    const fileExt = mime.getExtension(mimeType);
    const hasFileExtension = /\.(mp4|jpg|jpeg|png|gif|pdf|docx)$/i.test(name);
    return !hasFileExtension ? `${name}.${fileExt}` : name;
}
const pathExists = async (fpath) => {
    try {
        await access(fpath);
        return true;
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return false;
        }
        else {
            throw error;
        }
    }
};
export const parsePathName = async (itemPath) => {
    const hasAccess = await pathExists(itemPath);
    if (!hasAccess)
        return itemPath;
    const isDir = await isDirectory(itemPath);
    const numEnclosedRgx = /\((\d+)\)/;
    const dirName = path.dirname(itemPath);
    const baseName = path.basename(itemPath);
    const allItems = await readdir(dirName);
    const items = allItems
        .filter((x) => (isDir ? x.startsWith(baseName) : x.startsWith(baseName.split(".")[0])))
        .sort((a, b) => a.length - b.length);
    const lastItem = items.slice(-1)[0];
    let newName = dirName + path.sep;
    if (isDir) {
        const enclosed = lastItem.slice(-3);
        const n = parseInt(enclosed[1]);
        newName += numEnclosedRgx.test(enclosed)
            ? `${baseName.split(enclosed)[0]} (${n + 1})`
            : `${baseName} (0)`;
    }
    else {
        const s = lastItem.split(".");
        const name = s[0];
        const ext = s[1];
        const enclosed = name.slice(-3);
        const n = parseInt(enclosed[1]);
        newName += numEnclosedRgx.test(enclosed)
            ? `${name.split(enclosed)[0]} (${n + 1}).${ext}`
            : `${name} (0).${ext}`;
    }
    return newName;
};
export async function createFolder(folderPath) {
    try {
        if (fs.existsSync(folderPath)) {
            const newName = await parsePathName(folderPath);
            await mkdir(newName);
            return newName;
        }
        else {
            await mkdir(folderPath);
            return folderPath;
        }
    }
    catch (error) {
        throw new Error("Error while creating a folder.");
    }
}
// export function getMimeType(filePath: string): string | null {
//   try {
//     const lastSlashIndex = filePath.lastIndexOf(path.sep);
//     const dest = filePath.slice(0, lastSlashIndex);
//     const fileName = filePath.slice(lastSlashIndex + 1);
//     // const dest = path.dirname(filePath)
//     // const fileName = path.basename(filePath)
//     if (fs.existsSync(dest)) {
//       const files = readdirSync(dest);
//       return files.includes(fileName) ? mime.getType(filePath) : null;
//     } else {
//       return null;
//     }
//   } catch (err) {
//     console.error(err);
//     return null;
//   }
// }
export function getMimeType(filePath) {
    return fs.existsSync(filePath) ? mime.getType(filePath) : null;
}
export async function getUrlMimeType(url) {
    try {
        const res = await axios.head(url);
        const contentType = res.headers["content-type"];
        return contentType;
    }
    catch (error) {
        console.error("Error fetching MIME Type:", error);
        return undefined;
    }
}
export async function convertUrlToStream(url) {
    const res = await axios.get(url, { responseType: "stream" });
    return res.data;
}
export async function convertPathToStream(filePath) {
    const stream = new Readable();
    const fileStream = fs.createReadStream(filePath);
    fileStream
        .on("data", (chunk) => {
        if (!stream.push(chunk)) {
            fileStream.pause();
        }
    })
        .on("end", () => {
        stream.push(null);
    })
        .on("error", (err) => {
        stream.emit("error", err);
    });
    stream._read = () => {
        fileStream.resume();
    };
    return stream;
}
async function findValidFile(dir, base) {
    const files = await readdir(dir);
    return files.find((x) => x.split(".")[0] === base);
}
export const stop = (ms = 500) => new Promise((res) => setTimeout(res, ms));
export const isExtensionValid = (p) => {
    const extensionRegex = /\.(mp4|jpg|jpeg|png|gif|pdf|wav|mp3|docx)/i;
    return extensionRegex.test(p);
};
export const notify = (message, ms = 500) => new Promise((res) => {
    console.log(chalk.redBright(message));
    setTimeout(res, ms);
});
export async function openFile(filePath) {
    const dir = path.dirname(filePath);
    let base = path.basename(filePath);
    const isValid = isExtensionValid(base);
    if (!isValid) {
        const validBase = await findValidFile(dir, base);
        if (validBase) {
            base = validBase;
        }
        else {
            console.log("Path invalid. Make sure you are using the existing file path.");
            return;
        }
    }
    const newPath = path.join(dir, base);
    if (!fs.existsSync(dir) || !fs.existsSync(newPath)) {
        console.log("Path invalid. Make sure you are using the existing file path.");
        return;
    }
    switch (process.platform) {
        case "win32":
            await open(newPath);
            break;
        case "linux":
            try {
                exec(`xdg-open "${newPath}"`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error: ${error.message}`);
                        return;
                    }
                });
            }
            catch (error) {
                console.error("Failed to open with xdg-open, check if you have se the default media player in your linux environment");
            }
            break;
        default:
            console.log("Unsupported platform for automatic file opening.");
            break;
    }
}
export function formatStorageQuotaMessage(storageQuota) {
    // const usageBytes = parseInt(storageQuota.usage);
    const limitBytes = parseInt(storageQuota.limit);
    const usageInDriveBytes = parseInt(storageQuota.usageInDrive);
    const bytesToGB = (bytes) => bytes / (1024 * 1024 * 1024);
    const bytesToMB = (bytes) => bytes / (1024 * 1024);
    const usedInDriveGB = bytesToGB(usageInDriveBytes);
    const usedInDriveMB = bytesToMB(usageInDriveBytes);
    const limitGB = bytesToGB(limitBytes);
    const limitMB = bytesToMB(limitBytes);
    let usedMessage, limitMessage;
    if (usedInDriveGB >= 1) {
        usedMessage = `Used ${usedInDriveGB.toFixed(2)} GB`;
    }
    else {
        usedMessage = `Used ${usedInDriveMB.toFixed(2)} MB`;
    }
    if (limitGB >= 1) {
        limitMessage = `${limitGB.toFixed(2)} GB`;
    }
    else {
        limitMessage = `${limitMB.toFixed(2)} MB`;
    }
    return `${usedMessage} of ${limitMessage}`;
}
export function isGdriveFolder(type) {
    return type === "application/vnd.google-apps.folder";
}
//# sourceMappingURL=utils.js.map