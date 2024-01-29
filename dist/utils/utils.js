import axios from "axios";
import { Readable, Stream } from "stream";
import fs from "fs";
export async function convertUrlToStream(url) {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const imgBuffer = Buffer.from(response.data);
    const readable = new Stream.PassThrough();
    readable.end(imgBuffer);
    return readable;
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