import axios from "axios";
import internal, { Readable, Stream } from "stream";
import fs from "fs";
import mime from "mime";

export function getMimeType(file_path: string): string | null {
  if (fs.existsSync(file_path)) {
    const mime_type = mime.getType(file_path);
    return mime_type || "image/jpg";
  } else {
    return null;
  }
}

export async function getUrlMimeType(url: string): Promise<string | undefined> {
  try {
    const response = await axios.head(url);
    const contentType = response.headers["content-type"];
    console.log("MIME Type:", contentType);
    return contentType;
  } catch (error) {
    console.error("Error fetching MIME Type:", error);
    return undefined;
  }
}

export async function convertUrlToStream(url: string): Promise<internal.PassThrough> {
  const response = await axios.get(url, { responseType: "stream" });
  const stream = response.data;
  return stream;
}

export async function convertPathToStream(path: string): Promise<internal.Readable> {
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
