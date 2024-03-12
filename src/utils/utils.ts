import axios from "axios";
import internal, { Readable } from "stream";
import fs, { readdirSync } from "fs";
import mime from "mime";
import { exec } from "child_process";
import open from "open";
import path from "path";
import { readdir, mkdir } from "fs/promises";

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
  const hasFileExtension = /\.(mp4|jpg|jpeg|png|gif|pdf|docx)$/i.test(name);
  return !hasFileExtension ? `${name}.${fileExt}` : name;
}

export async function createFolder(folderPath: string, folderName: string) {
  const newPath = path.join(folderPath, folderName);
  await mkdir(newPath);
}

export function getMimeType(filePath: string): string | null {
  try {
    const lastSlashIndex = filePath.lastIndexOf("/");
    const dest = filePath.slice(0, lastSlashIndex);
    const fileName = filePath.slice(lastSlashIndex + 1);

    if (fs.existsSync(dest)) {
      const files = readdirSync(dest);
      if (files.includes(fileName)) {
        const mime_type = mime.getType(filePath);
        return mime_type;
      } else {
        return null;
      }
    } else {
      return null;
    }
  } catch (err) {
    console.error(err);
    return null;
  }
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

export async function convertUrlToStream(url: string): Promise<internal.PassThrough> {
  const res = await axios.get(url, { responseType: "stream" });
  return res.data;
}

export async function convertPathToStream(filePath: string): Promise<internal.Readable> {
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

async function findValidFile(dir: string, base: string) {
  const files = await readdir(dir);
  return files.find((x) => x.split(".")[0] === base);
}

export const stop = (ms: number = 500) => new Promise((res) => setTimeout(res, ms));

export const isExtensionValid = (p: string) => {
  const extensionRegex = /\.(mp4|jpg|jpeg|png|gif|pdf|wav|mp3|docx)/i;
  return extensionRegex.test(p);
};

export const notify = (message: string, ms: number = 500) =>
  new Promise((res) => {
    console.log(message);
    setTimeout(res, ms);
  });

export async function openFile(filePath: string) {
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
}
