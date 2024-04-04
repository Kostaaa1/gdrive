import "dotenv/config";
import { gdrive, questions, cache } from "./config/config.js";
import { isGdriveFolder, openFile } from "./utils/utils.js";
import { processFolderActions } from "./actions/folder.js";
import { processSelectedFile } from "./actions/file.js";
import { processTrashActions } from "./actions/trash.js";
import open from "open";
import { processUploadActions } from "./actions/upload.js";
import { processMultipleItems } from "./actions/batch.js";
import { getItems } from "./store/store.js";

const { input_path, input } = questions;

export const processMainActions = async () => {
  try {
    const storageSizeMsg = await gdrive.getDriveStorageSize();
    const items = await getItems("root", () => gdrive.getRootItems());
    const answer = await questions.main_questions(items, storageSizeMsg);

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
        await gdrive.createFolder(newFolder);
        await processMainActions();
        break;
      case "OPEN":
        const filePath = await input_path("Enter the path for the file you want to preview: ");
        if (filePath) await openFile(filePath);
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

  //   "https://www.twitch.tv/mellooow_/clip/CrazyBlueCookiePermaSmug-gOKwhWbVkl7DFo4G?filter=clips&range=30d&sort=time";
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
