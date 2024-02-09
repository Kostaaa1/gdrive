import axios from "axios";
import { Readable } from "stream";
import fs, { readdirSync } from "fs";
import mime from "mime";
// export function parseMimeType(mime_type: string): string {
//   if (mime_type === "application/vnd.google-apps.folder") {
//     return "folder";
//   } else {
//     return mime_type.split("/")[1];
//   }
// }
// export function openFile(path: string) {
// }
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
export const checkIfFolder = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.stat(filePath, (err, stats) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(stats.isDirectory());
        });
    });
};
export function parseFileExtension(name, mimeType) {
    const fileExt = mime.getExtension(mimeType);
    const hasFileExtension = /\.[a-z]{3,4}$/i.test(name);
    return !hasFileExtension ? `${name}.${fileExt}` : name;
}
export function getMimeType(filePath) {
    try {
        const lastSlashIndex = filePath.lastIndexOf("/");
        const dest = filePath.slice(0, lastSlashIndex);
        const fileName = filePath.slice(lastSlashIndex + 1);
        if (fs.existsSync(dest)) {
            const files = readdirSync(dest);
            if (files.includes(fileName)) {
                const mime_type = mime.getType(filePath);
                return mime_type;
            }
            else {
                return null;
            }
        }
        else {
            return null;
        }
    }
    catch (err) {
        console.error(err);
        return null;
    }
}
export async function getUrlMimeType(url) {
    try {
        const res = await axios.head(url);
        const contentType = res.headers["content-type"];
        console.log("MIME Type:", contentType);
        return contentType;
    }
    catch (error) {
        console.error("Error fetching MIME Type:", error);
        return undefined;
    }
}
export async function convertUrlToStream(url) {
    const res = await axios.get(url, { responseType: "stream" });
    const stream = res.data;
    return stream;
}
export async function convertPathToStream(path) {
    const stream = new Readable();
    const fileStream = fs.createReadStream(path);
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
    stream._read = function () {
        fileStream.resume();
    };
    return stream;
}
//# sourceMappingURL=utils.js.map