import "dotenv/config";
import { gdrive, questions } from "./config/config.js";
import { isGdriveFolder, openFile } from "./utils/utils.js";
import { processFolderActions } from "./actions/folder.js";
import { processSelectedFile } from "./actions/file.js";
import { processTrashActions } from "./actions/trash.js";
import open from "open";
import { processUploadActions } from "./actions/upload.js";
import { processMultipleItems } from "./actions/batch.js";
import { addCacheItem, getItems, getStorageSize } from "./store/store.js";
const { input_path, input } = questions;

export const processMainActions = async () => {
  try {
    const storageSizeMsg = await getStorageSize();
    const { historyId, items } = await getItems("root", () => gdrive.getRootItems());
    const answer = await questions.main_questions(items, storageSizeMsg, historyId);
    switch (answer) {
      case "ITEM_OPERATIONS":
        await processMultipleItems(items);
        break;
      case "UPLOAD":
        await processUploadActions();
        await processMainActions();
        break;
      case "CREATE":
        const newFolder = await input("Enter new folder name: ");
        const folder = await gdrive.createFolder(newFolder);
        addCacheItem("root", folder);
        await processMainActions();
        break;
      case "OPEN":
        const filePath = await input_path("Enter the path for the file you want to preview: ");
        await openFile(filePath);
        await processMainActions();
        break;
      case "TRASH":
        await processTrashActions();
        break;
      case "OPEN_DRIVE":
        await open("https://drive.google.com/drive/u/0/my-drive");
        await processMainActions();
        break;
      case "EXIT":
        process.exit();
      default:
        if (typeof answer !== "string") {
          isGdriveFolder(answer.mimeType)
            ? await processFolderActions(answer.id)
            : await processSelectedFile(answer);
          break;
        }
    }
  } catch (error) {
    await processMainActions();
  }
};

(async () => {
  /////////////////////////////
  await gdrive.authorize();
  await processMainActions();
  /////////////////////////////

  // const res = await axios.get("https://kick.com/video/a505540c-69f0-41af-a1d6-2fdf66e763df");
  // const url = "https://kick.com/6741eecb-edf3-47d8-867c-83ea336946e7";
  // const urls = await scrapeMedia(url, ["VIDEO"], null);
  // console.log(urls);
  // const media = new Twitch();
  // const s = await media.getKickVIdeo(url);
  // console.log(s);
  // Step 1: Listen for Key Presses
  // const id = await gdrive.getFolderIdWithName("Water");
  // await gdrive.deleteItem(id);
  // const { duration, name, types, url } = await questions.scraping_questions();
  // let parentId: string;
  // if (name) {
  //   const res = await gdrive.createFolder(name);
  //   parentId = res.id;
  // }
  // const urls = await scrapeMedia(url, types, duration);
  // const { progressBar, cancelled } = initProgressBar(urls.length);
  // const limit = pLimit(50);
  // const processes = urls.map((url) => {
  //   try {
  //     return limit(async () => {
  //       if (cancelled.value) return;
  //       const stream = await convertUrlToStream(url);
  //       if (stream) {
  //         await gdrive.uploadSingleFile({ name: extractFileNameFromUrl(url), stream, parentId });
  //         if (!cancelled.value) progressBar.increment();
  //       }
  //     });
  //   } catch (error) {
  //     console.log(error);
  //   }
  // });
  // await Promise.all(processes);
  // const url = "https://el.phncdn.com/pics/gifs/018/886/621/18886621a.mp4";
  // const res = await axios.get(url, { responseType: "stream" });
  // await gdrive.uploadSingleFile({ name: "Test.mp4", stream: res.data });
  // const urls = await scrapeMedia(url, ["IMAGE", "VIDEO"], 16000);
  // console.log(urls);
  // const ulr =
  //   "https://v.redd.it/yla8tn8kb0nc1/HLSPlaylist.m3u8?f=hd%2CsubsAll%2ChlsSpecOrder&v=1&a=1715124847%2CODljOTViMzVkZjNiMjNlMzAyYzQ2OWNkM2FlOWZjMTNlOWYyMTYyMGFjZmZkZTUyMGZlNjYyZWZkYjUyMmExZA%3D%3D";
  // const stream = new PassThrough();
  // ffmpeg(ulr)
  //   .outputOptions(["-c copy", "-preset ultrafast", "-f mpegts"])
  //   .pipe(stream, { end: true });
  //   await gdrive.
  // const parsed = new URL(url);
  // if (parsed.pathname.endsWith(".m3u8")) {
  //   const stream = new PassThrough();
  //   // const { data: m3u8 } = await axios.get(url);
  //   // console.log(m3u8);
  //   // const outputPath = "./tmp/Cinna.mp4";
  //   ffmpeg(url)
  //     .format("mp4")
  //     .outputOptions(["-c copy", "-preset ultrafast", "-f mpegts"])
  //     .on("progress", (progress) => {
  //       console.log("Progress ", progress.chunk + "%");
  //     })
  //     .on("end", () => {
  //       console.log("Conversion finished!");
  //     })
  //     .on("error", () => {
  //       console.log("Conversion failed!");
  //     })
  //     .pipe(stream, { end: true });
  //   await gdrive.uploadSingleFile({ name: "Reddit.mp4", stream });
  // }
  // const startTime = process.hrtime();
  // const url = "https://dksoakdksaodkosa.com";
  // const urls = await scrapeMedia(url, ["IMAGE"], 24000);
  // const endTime = process.hrtime(startTime);
  // console.log("Elapsed: ", endTime[0] + endTime[1] / 1e9, urls.length);
  // "https://www.twitch.tv/mellooow_/clip/CrazyBlueCookiePermaSmug-gOKwhWbVkl7DFo4G?filter=clips&range=30d&sort=time";
  // const { id, mimeType, stream, username, title } = await twitch.getTwitchVideo(url);
  // await gdrive.uploadSingleFile({ name: title, stream, mimeType });
  // console.log(data);
  // const folderId = await gdrive.getFolderIdWithName("hyoon");
  // const items = await gdrive.getFolderItems(folderId);
  // console.log(items);
  // const data = await gdrive.getFileCountInFolder(folderId);
  // console.log(data);
  // const url = "https://fapello.com/hyoon/";
  // const url = await input("Provide url to scrape: ");
  // const data: { name: string; sources: { name: string; url: string }[] } = await scrapeImages(
  //   url
  // );
  // console.log(data, data.sources.length);
  // const parentId = await gdrive.getFolderIdWithName(data.name);
  // const folderName = await questions.input("Name for the new folder: ");
  // const twitch = new TwitchDownloader();
  // const { id, mimeType, stream, username } = await twitch.getUrlReadableStream(url);
  // const data = await twitch.scrapeVodUrl(url);
  ///////////////////////////////////
  // Working code of converting m3u8 to mpegts format by piping it to passthrough stream, and uplaoding it to google drive
  // console.time("action");
  // const url = KICK_URLS.CLIP_URL_2;
  // const outStream = new PassThrough();
  // ffmpeg(url)
  //   .outputOptions(["-c copy", "-preset ultrafast", "-movflags +faststart", "-f mpegts"])
  //   .on("end", async () => {
  //     console.log("Succesfully converted. Uploading to google drive..");
  //     console.timeEnd("action");
  //   })
  //   .on("progress", (progress) => {
  //     console.log("Processing: " + progress.percent + "% ");
  //   })
  //   .on("error", (error: any) => {
  //     console.log("Conversion failed..", error);
  //     outStream.end();
  //     outStream.destroy();
  //   })
  //   .pipe(outStream, { end: true });
  // await gdrive.uploadSingleFile({
  //   name: "Erica.mp4",
  //   stream: outStream,
  // });
})();
