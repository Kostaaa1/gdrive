import axios from "axios";
import { Readable } from "stream";
import fs from "fs";
import mime from "mime";
export function getMimeType(file_path) {
    if (fs.existsSync(file_path)) {
        const mime_type = mime.getType(file_path);
        return mime_type || "image/jpg";
    }
    else {
        return null;
    }
}
export async function getUrlMimeType(url) {
    try {
        const response = await axios.head(url);
        const contentType = response.headers["content-type"];
        console.log("MIME Type:", contentType);
        return contentType;
    }
    catch (error) {
        console.error("Error fetching MIME Type:", error);
        return undefined;
    }
}
export async function convertUrlToStream(url) {
    const response = await axios.get(url, { responseType: "stream" });
    const stream = response.data;
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