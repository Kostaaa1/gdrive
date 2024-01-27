import axios from "axios";
import internal, { Stream } from "stream";

export async function convertUrlToStream(url: string): Promise<internal.PassThrough> {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  const imgBuffer = Buffer.from(response.data);

  const readable = new Stream.PassThrough();
  readable.end(imgBuffer);
  return readable;
}
