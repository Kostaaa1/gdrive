import axios from "axios";
import https from "https";
import puppeteer from "puppeteer";
import { PassThrough, Readable } from "stream";
import "dotenv/config";
import ffmpeg from "fluent-ffmpeg";

type PublicAccessToken = {
  value: string;
  signature: string;
};

type ParsedUrlData = {
  id: string;
  username: string;
  title: string;
  url: string;
  mediaType: "videos" | "clips";
};

type TWVod = {
  quality: string;
  resolution: string;
  url: string;
};

const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_BEARER_TOKEN } = process.env;
const stop = async (ms?: 1000) => new Promise((res) => setTimeout(res, ms));

export default class Twitch {
  private clientId = "kimne78kx3ncx6brgo4mv6wki5h1ko";
  private sha256Hash = "0828119ded1c13477966434e15800ff57ddacf13ba1911c129dc2200705b0712";

  // public async test(username: string) {
  //   try {
  //     const response = await axios.post(
  //       `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
  //     );

  //     console.log("GET ACCESS TOKEN ", response.data);
  //     const accessToken = response.data.access_token;
  //     const headers = {
  //       "Client-ID": TWITCH_CLIENT_ID,
  //       Authorization: `Bearer ${accessToken}`,
  //     };

  //     const res = await axios.get(`https://api.twitch.tv/helix/users?login=${username}`, {
  //       headers,
  //     });

  //     const userId = res.data.data[0].id;
  //     const vods = await axios.get(
  //       `https://api.twitch.tv/helix/videos?user_id=${userId}?type=archive`,
  //       {
  //         headers,
  //       }
  //     );

  //     const clips = await axios.get(
  //       `https://api.twitch.tv/helix/clips?broadcaster_id=${userId}`,
  //       { headers }
  //     );
  //     console.log(res.data);
  //     console.log(vods.data.data);
  //     console.log(clips.data.data);
  //   } catch (error) {
  //     console.error("Failed to get access token:", error);
  //     return null;
  //   }
  // }

  public async getClipStream(url: string): Promise<Readable> {
    const { mediaId } = this.extractUrlInfo(url);
    const postData = [
      {
        operationName: "VideoAccessToken_Clip",
        variables: {
          slug: mediaId,
        },
        extensions: {
          persistedQuery: {
            version: 1,
            // sha256Hash: "36b89d2507fce29e5ca551df756d27c1cfe079e2609642b4390aa4c35796eb11",
            sha256Hash: this.sha256Hash,
          },
        },
      },
    ];

    const res = await axios.post("https://gql.twitch.tv/gql", postData, {
      headers: {
        "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko",
      },
    });

    const data = res.data[0].data;
    const urlBase = data.clip.videoQualities[0].sourceURL;
    const { signature, value } = data.clip.playbackAccessToken;

    const newUrl = `${urlBase}?sig=${encodeURIComponent(signature)}&token=${encodeURIComponent(
      value
    )}`;

    const { data: stream } = await axios.get(newUrl, { responseType: "stream" });
    return stream;
  }

  private async getPlaybackAccessToken(id: string) {
    const data = {
      operationName: "PlaybackAccessToken",
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: this.sha256Hash,
        },
      },
      variables: {
        isLive: false,
        login: "",
        isVod: true,
        vodID: id,
        playerType: "embed",
      },
    };

    const headers = {
      "Client-id": this.clientId,
      "Content-Type": "application/json",
    };

    try {
      const response = await axios.post("https://gql.twitch.tv/gql", data, { headers });

      if (response.status !== 200) {
        throw new Error(`${response.data.message}`);
      }

      console.log(response.data.data);
      return response.data.data.videoPlaybackAccessToken;
      // return isVod
      //   ? response.data.data.videoPlaybackAccessToken
      //   : response.data.data.streamPlaybackAccessToken;
    } catch (error) {
      throw error;
    }
  }

  private getPlaylist(id: string, accessToken: PublicAccessToken): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = `https://usher.ttvnw.net/vod/${id}.m3u8?client_id=${this.clientId}&token=${accessToken.value}&sig=${accessToken.signature}&allow_source=true`;

      const req = https
        .get(url, (response) => {
          let data: any = {};
          data.statusCode = response.statusCode;
          data.body = [];
          response.on("data", (chunk) => data.body.push(chunk));
          response.on("end", () => {
            data.body = data.body.join("");
            switch (data.statusCode) {
              case 200:
                resolve(data.body);
                break;
              case 404:
                reject(new Error("Transcode does not exist - the stream is probably offline"));
                break;
              default:
                reject(new Error(`Twitch returned status code ${data.statusCode}`));
                break;
            }
          });
        })
        .on("error", (error) => reject(error));

      req.end();
    });
  }

  private parsePlaylist(playlist: any): TWVod[] {
    const parsedPlaylist: TWVod[] = [];
    const lines = playlist.split("\n");
    for (let i = 4; i < lines.length; i += 3) {
      parsedPlaylist.push({
        quality: lines[i - 2].split('NAME="')[1].split('"')[0],
        resolution:
          lines[i - 1].indexOf("RESOLUTION") != -1
            ? lines[i - 1].split("RESOLUTION=")[1].split(",")[0]
            : null,
        url: lines[i],
      });
    }
    return parsedPlaylist;
  }

  // private extractType(url: string) {
  //   const parsed = new URL(url);
  //   const path = parsed.pathname;
  //   console.log(path.split("/"));
  //   return path.split("/")[0] === "videos" ? "videos" : "clip";
  // }

  // private extractIdFromUrl(url: string): string {
  //   const parsedUrl = new URL(url);
  //   const params = parsedUrl.pathname.split("/");
  //   return params[params.length - 1];
  // }

  private extractUrlInfo(url: string): { mediaId: string; mediaType: "videos" | "clips" } {
    const parsedUrl = new URL(url);
    const params = parsedUrl.pathname.split("/");
    return {
      mediaId: params[params.length - 1],
      mediaType: params[1] === "videos" ? "videos" : "clips",
    };
  }

  private async getMediaInfo(inputUrl: string): Promise<ParsedUrlData> {
    const { mediaId, mediaType } = this.extractUrlInfo(inputUrl);
    const res = await axios.get(`https://api.twitch.tv/helix/${mediaType}?id=${mediaId}`, {
      headers: {
        "Client-Id": TWITCH_CLIENT_ID,
        Authorization: `Bearer ${TWITCH_BEARER_TOKEN}`,
      },
    });

    const data = res.data.data[0];
    const { id, title, url } = data;

    return {
      id,
      title,
      mediaType,
      url,
      username: mediaType === "clips" ? data.broadcaster_name : data.user_name,
    };
  }

  // Example of scraping and listening to request that are returning m3u8 playlist i think
  // public async scrapeVodUrl(vodUrl: string): Promise<string> {
  //   // scrapes the vod page, scans for requests and fidsnt correct m3u8 url - SLower then getVodM3U8
  //   // in conclusion, it returns m3u8, same as getVodUrl
  //   const browser = await puppeteer.launch();
  //   const page = await browser.newPage();
  //   await page.setRequestInterception(true);
  //   let m3u8RequestUrl: string = "";
  //   let iterator = 0;
  //   page.on("request", (interceptedRequest) => {
  //     if (interceptedRequest.isInterceptResolutionHandled()) return;
  //     if (interceptedRequest.url().includes(".m3u8")) {
  //       iterator++;
  //       if (iterator === 2) {
  //         m3u8RequestUrl = interceptedRequest.url();
  //         // interceptedRequest.abort();
  //       }
  //     }
  //     interceptedRequest.continue();
  //   });
  //   await page.goto(vodUrl, { waitUntil: "networkidle2" });
  //   await browser.close();
  //   const split = m3u8RequestUrl.split("/");
  //   split[split.length - 2] = "chunks";
  //   const url = split.join("/");
  //   return url;
  // }

  private async getVideoM3U8Url(id: string): Promise<TWVod[]> {
    try {
      const accessToken = await this.getPlaybackAccessToken(id);
      const m3u8Playlist = await this.getPlaylist(id, accessToken);
      return this.parsePlaylist(m3u8Playlist);
      // return raw ? m3u8Playlist : this.parsePlaylist(m3u8Playlist);
    } catch (error) {
      throw new Error(`Error while getting the vod: ${error}`);
    }
  }

  private async getClipM3U8Url(url: string): Promise<string> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const videoUrl = await page.evaluate(() => {
      const videoTag = document.querySelector("video");
      return videoTag?.getAttribute("src");
    });

    if (!videoUrl) {
      throw new Error("No video source found");
    }

    await browser.close();
    return videoUrl;
  }

  public async getTwitchVideo(
    inputUrl: string
  ): Promise<ParsedUrlData & { stream: Readable; mimeType: string }> {
    const res = await this.getMediaInfo(inputUrl);
    const { id, mediaType, url } = res;

    const stream = new PassThrough();
    if (mediaType) {
      let m3u8 = url.endsWith(".m3u8") ? url : null;
      if (!m3u8) {
        m3u8 =
          mediaType === "videos"
            ? (await this.getVideoM3U8Url(id))[0].url
            : await this.getClipM3U8Url(url);
      }

      ffmpeg(m3u8)
        .outputOptions(["-c copy", "-preset ultrafast", "-f mpegts"])
        .on("progress", (progress) => {
          console.log("Progress ", progress.chunk + "%");
        })
        .on("end", () => {
          console.log("Conversion finished!");
        })
        .on("error", () => {
          console.log("Conversion failed!");
        })
        .pipe(stream, { end: true });
    } else {
      const clipStream = await this.getClipStream(url);
      clipStream.pipe(stream);
    }

    return { ...res, mimeType: "video/mp4", stream };
  }

  public async getKickVIdeo(vodUrl: string): Promise<string[]> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Enable request interception
    await page.setRequestInterception(true);
    const urls: string[] = [];

    // Listen for network requests
    page.on("request", (interceptedRequest) => {
      const url = interceptedRequest.url();
      if (url.endsWith(".m3u8")) {
        console.log("M3U8 Playlist URL:", url);
        urls.push(url);
      }
      interceptedRequest.continue();
    });

    await page.goto(vodUrl);
    await page.waitForSelector(
      "#main-view > div.relative.z-50 > div.fixed.inset-0.flex.items-center.justify-center.p-4 > div > div.dialog-actions > div > button.variant-action.size-sm.base-button"
    );

    await page.click(
      "#main-view > div.relative.z-50 > div.fixed.inset-0.flex.items-center.justify-center.p-4 > div > div.dialog-actions > div > button.variant-action.size-sm.base-button"
    );

    let checkedOnce: boolean = false;
    const checkUrlsLength = async () => {
      console.log("Called", urls);
      if (checkedOnce && urls.length === 0) {
        return true;
      }

      if (urls.length > 2) {
        return true;
      } else {
        checkedOnce = true;
        return new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    await checkUrlsLength();
    await browser.close();
    return urls;
  }
}
