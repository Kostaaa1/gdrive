import axios from "axios";
import internal, { Readable, Stream } from "stream";
import fs, { readdirSync } from "fs";
import mime from "mime";

export function parseMimeType(mime_type: string) {
  switch (mime_type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "video/mp4":
      return "mp4";
    case "application/vnd.google-apps.folder":
      return "folder";
    default:
      console.log("mime_type", mime_type);
      return "Undefined type ??? (handle this)";
  }
}

export function getMimeType(file_path: string): string | null {
  try {
    const lastSlashIndex = file_path.lastIndexOf("/");
    const paths = file_path.slice(0, lastSlashIndex);
    const image_name = file_path.slice(lastSlashIndex + 1);

    if (fs.existsSync(paths)) {
      const files = readdirSync(paths);
      if (files.includes(image_name)) {
        const mime_type = mime.getType(file_path);
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
    console.log("MIME Type:", contentType);
    return contentType;
  } catch (error) {
    console.error("Error fetching MIME Type:", error);
    return undefined;
  }
}

export async function convertUrlToStream(url: string): Promise<internal.PassThrough> {
  const res = await axios.get(url, { responseType: "stream" });
  const stream = res.data;
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
