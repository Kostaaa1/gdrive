import axios from "axios";
import { Stream } from "stream";
export async function convertUrlToStream(url) {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const imgBuffer = Buffer.from(response.data);
    const readable = new Stream.PassThrough();
    readable.end(imgBuffer);
    return readable;
}
//# sourceMappingURL=utils.js.map