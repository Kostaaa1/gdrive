import axios from "axios";
import internal, { PassThrough, Readable } from "stream";
import fs from "fs";
import mime from "mime";
import { exec } from "child_process";
import open from "open";
import path from "path";
import { readdir, stat, access, mkdir } from "fs/promises";
import chalk from "chalk";
import { Presets, SingleBar } from "cli-progress";
import { StorageQuota, TFile } from "../types/types.js";
import { Choice } from "../custom/PendingPromise.mjs";
import ffmpeg from "fluent-ffmpeg";
import { emitKeypressEvents } from "readline";

export function formatDate(date: string) {
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

export function convertBytes(bytes: string) {
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

export const isDirectory = (path: string): Promise<boolean> => {
  if (fs.existsSync(path)) {
    return new Promise((resolve, reject) => {
      fs.stat(path, (err, stats) => {
        if (err) {
          if (err.code === "ENOENT") {
            reject(new Error("Path does not exist"));
          } else {
            reject(err);
          }
        } else {
          if (stats.isFile()) {
            resolve(false);
          } else if (stats.isDirectory()) {
            resolve(true);
          } else {
            reject(new Error("Path is neither a file nor a directory"));
          }
        }
      });
    });
  } else {
    throw new Error("The path that you provided is invalid.");
  }
};

export function parseFileExtension(name: string, mimeType: string): string {
  const fileExt = mime.getExtension(mimeType);
  const hasFileExtension = /\.(mp4|jpg|jpeg|png|webp|gif|pdf|docx)$/i.test(name);
  return !hasFileExtension ? `${name}.${fileExt}` : name;
}

const pathExists = async (fpath: string) => {
  try {
    await access(fpath);
    return true;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return false;
    } else {
      throw error;
    }
  }
};

export const parsePathName = async (itemPath: string) => {
  const hasAccess = await pathExists(itemPath);
  if (!hasAccess) return itemPath;

  const isDir = await isDirectory(itemPath);

  const numEnclosedRgx = /\((\d+)\)/;
  const dirName = path.dirname(itemPath);
  const baseName = path.basename(itemPath);

  const allItems = await readdir(dirName);
  const items = allItems
    .filter((x) => (isDir ? x.startsWith(baseName) : x.startsWith(baseName.split(".")[0])))
    .sort((a, b) => a.length - b.length);

  const lastItem = items.slice(-1)[0];
  let newName: string = dirName + path.sep;
  if (isDir) {
    const enclosed = lastItem.slice(-3);
    const n = parseInt(enclosed[1]);
    newName += numEnclosedRgx.test(enclosed)
      ? `${baseName.split(enclosed)[0]} (${n + 1})`
      : `${baseName} (0)`;
  } else {
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

export async function createFolder(folderPath: string): Promise<string> {
  try {
    if (fs.existsSync(folderPath)) {
      const newName = await parsePathName(folderPath);
      await mkdir(newName);
      return newName;
    } else {
      await mkdir(folderPath);
      return folderPath;
    }
  } catch (error) {
    throw new Error("Error while creating a folder.");
  }
}

export function getMimeType(filePath: string): string | null {
  return fs.existsSync(filePath) ? mime.getType(filePath) : null;
}

export async function getUrlMimeType(url: string): Promise<string | undefined> {
  try {
    const res = await axios.head(url);
    const contentType = res.headers["content-type"];
    return contentType;
  } catch (error) {
    console.error("Error fetching MIME Type:", error);
    return undefined;
  }
}

export async function convertUrlToStream(url: string): Promise<internal.Readable | null> {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith(".m3u8")) {
      const stream = new PassThrough();

      ffmpeg(url)
        .outputOptions(["-c copy", "-preset ultrafast", "-f mpegts"])
        .pipe(stream, { end: true });

      return stream;
    }

    const res = await axios.get(url, { responseType: "stream" });
    return res.status === 200 ? res.data : [];
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function convertPathToStream(filePath: string): Promise<internal.Readable> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("open", () => {
      resolve(stream);
    });
    stream.on("error", (err) => {
      reject(err.message);
    });
  });
}

async function findValidFile(dir: string, base: string) {
  const files = await readdir(dir);
  return files.find((x) => x.split(".")[0] === base);
}

export const stop = (ms: number = 500) => new Promise((res) => setTimeout(res, ms));

export const isExtensionValid = (p: string): Boolean => {
  const extensionRegex = /\.(mp4|jpg|jpeg|png|gif|pdf|svg|wav|mp3|docx)/i;
  return extensionRegex.test(p);
};

export const notify = (message: string, ms: number = 500) =>
  new Promise((res) => {
    console.log(chalk.redBright(message));
    setTimeout(res, ms);
  });

export function extractFileNameFromUrl(url: string) {
  const urlParts = url.split("/");
  let fileName = urlParts[urlParts.length - 1];
  fileName = fileName.split("?")[0];
  fileName = fileName.split("#")[0];
  if (!fileName || fileName === "/") {
    fileName = urlParts[urlParts.length - 2];
  }

  fileName = decodeURIComponent(fileName);
  if (fileName.endsWith(".m3u8")) fileName = fileName.replace(".m3u8", ".mp4");
  return fileName;
}

export async function openFile(filePath: string) {
  try {
    const dir = path.dirname(filePath);
    let base = path.basename(filePath);

    const isValid = isExtensionValid(base);
    if (!isValid) {
      const validBase = await findValidFile(dir, base);
      if (validBase) {
        base = validBase;
      } else {
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
        } catch (error) {
          console.error(
            "Failed to open with xdg-open, check if you have se the default media player in your linux environment"
          );
        }
        break;
      default:
        console.log("Unsupported platform for automatic file opening.");
        break;
    }
  } catch (error) {
    console.log("ERror while opening the file: ", error);
  }
}

export function formatStorageQuotaMessage(storageQuota: StorageQuota) {
  const limitBytes = parseInt(storageQuota.limit);
  const usageInDriveBytes = parseInt(storageQuota.usageInDrive);

  const bytesToGB = (bytes: number) => bytes / (1024 * 1024 * 1024);
  const bytesToMB = (bytes: number) => bytes / (1024 * 1024);

  const usedInDriveGB = bytesToGB(usageInDriveBytes);
  const usedInDriveMB = bytesToMB(usageInDriveBytes);

  const limitGB = bytesToGB(limitBytes);
  const limitMB = bytesToMB(limitBytes);

  let usedMessage, limitMessage;

  if (usedInDriveGB >= 1) {
    usedMessage = `Used ${usedInDriveGB.toFixed(2)} GB`;
  } else {
    usedMessage = `Used ${usedInDriveMB.toFixed(2)} MB`;
  }

  if (limitGB >= 1) {
    limitMessage = `${limitGB.toFixed(2)} GB`;
  } else {
    limitMessage = `${limitMB.toFixed(2)} MB`;
  }

  return `${usedMessage} of ${limitMessage}`;
}

export async function getTotalBytesFromPlaylist(url: string) {
  const response = await axios.get(url);
  console.log(response.data);

  const playlistText = response.data;
  const segmentUrls = playlistText.split("\n").filter((line: any) => line.startsWith("http"));
  let totalBytes = 0;
  for (const segmentUrl of segmentUrls) {
    console.log(segmentUrl);
    const segmentResponse = await fetch(segmentUrl);
    // @ts-ignore
    const segmentSize = parseInt(segmentResponse.headers.get("content-length"));
    if (!isNaN(segmentSize)) {
      totalBytes += segmentSize;
    }
  }
  return totalBytes;
}

export function isGdriveFolder(type: string) {
  return type === "application/vnd.google-apps.folder";
}

export function base64ToStream(base64str: string) {
  const byteCharacters = atob(base64str);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "image/jpeg" });
  return blob;
}

export const parseItemsForQuestion = <Value>(items: TFile[]): Choice<Value>[] => {
  // @ts-ignore
  return items.map((file) => ({
    name: `${file.name} ${isGdriveFolder(file.mimeType) ? chalk.gray("(folder)") : ""}`,
    value: file,
  }));
};

export function initProgressBar(
  itemsLength: number,
  message: string = "Progress"
): { progressBar: SingleBar; cancel: { value: boolean } } {
  const cancel = { value: false };

  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  const handleKeypress = (_: any, key: any) => {
    if (key && key.name === "escape") {
      cancel.value = true;
      progressBar.stop();
      console.log(chalk.gray("\nOperation terminated."));
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("keypress", handleKeypress);
    }
  };
  process.stdin.on("keypress", handleKeypress);

  const msg = `${message} [{bar}] {percentage}% | {value}/{total}`;
  const progressBar = new SingleBar(
    {
      format: msg,
    },
    Presets.rect
  );

  progressBar.on("stop", () => {
    process.stdin.removeListener("keypress", handleKeypress);
  });
  progressBar.start(itemsLength, 0);
  return { progressBar, cancel };
}
