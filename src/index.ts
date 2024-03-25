import "dotenv/config";
import { googleDrive, questions } from "./config/config.js";
import {
  createFolder,
  parsePathName,
  isGdriveFolder,
  openFile,
  convertBytes,
  convertPathToStream,
  convertUrlToStream,
  stop,
} from "./utils/utils.js";
import { processFolderActions } from "./actions/folder.js";
import { processSelectedFile } from "./actions/file.js";
import { processTrashActions } from "./actions/trash.js";
import open from "open";
import path from "path";
import { TFile } from "./types/types.js";
import { SingleBar } from "cli-progress";
import { processUploadFromPath } from "./actions/upload.js";
import fs from "fs";
import { stat, rm } from "fs/promises";
// import twitch from "twitch-m3u8";
import axios from "axios";
import { KICK_URLS } from "./constants.js";
import { PassThrough, Readable } from "stream";
import { spawn } from "child_process";
import ffmpeg from "fluent-ffmpeg";
// @ts-ignore
import { scrapeImages } from "../../Igraliste/puppeteer/index.js";

const { checkbox, areYouSure, item_operation, input_path, input } = questions;
const downloadDriveFiles = async (item: TFile, folderPath: string) => {
  if (isGdriveFolder(item.mimeType)) {
    const { files } = await googleDrive.getFolderItems(item.id);
    const newPath = await createFolder(path.join(folderPath, item.name));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await downloadDriveFiles(file, newPath);
    }
  } else {
    const pathname = await parsePathName(path.join(folderPath, item.name));
    await googleDrive.downloadFile(pathname, item.id);
  }
};

export const processMultipleItems = async (items: TFile[], parentId?: string) => {
  try {
    const selected = await checkbox("Select items: ", items);
    const operation = await item_operation();
    let cpath: string | undefined = undefined;

    if (operation === "DOWNLOAD") {
      cpath = await input_path("Provide a path where to store the items: ");
    }

    const proceedMsgs: { [key in "TRASH" | "DELETE"]: string } = {
      DELETE: "Confirm deletion of items?",
      TRASH: "Confirm moving items to trash?",
    };

    let proceed: boolean = false;
    if (operation !== "DOWNLOAD") {
      proceed = await areYouSure(proceedMsgs[operation]);
    }

    const progressBar = new SingleBar({
      format: "Progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}",
    });
    progressBar.start(selected.length, 0);

    for (let i = 0; i < selected.length; i++) {
      progressBar.increment();

      const item = selected[i];
      switch (operation) {
        case "DELETE":
          if (proceed) await googleDrive.deleteItem(item.id);
          break;
        case "TRASH":
          await googleDrive.moveToTrash(item.id);
          break;
        case "DOWNLOAD":
          if (cpath) await downloadDriveFiles(item, cpath);
          break;
      }

      if (i === selected.length - 1) {
        progressBar.stop();
      }
    }

    parentId ? await processFolderActions(parentId) : await processMainActions();
  } catch (error) {
    parentId ? await processFolderActions(parentId) : await processMainActions();
  }
};

export const processMainActions = async () => {
  try {
    const storageSizeMsg = await googleDrive.getDriveStorageSize();
    const folders = await googleDrive.getRootItems();
    const answer = await questions.main_questions(folders, storageSizeMsg);

    switch (answer) {
      case "ITEM_OPERATIONS":
        await processMultipleItems(folders);
        break;
      case "UPLOAD":
        await processUploadFromPath();
        await processMainActions();
        break;
      case "CREATE":
        const newFolder = await input("Enter new folder name: ");
        await googleDrive.createFolder(newFolder);
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
  await googleDrive.authorize();
  await processMainActions();

  // const folderId = await googleDrive.getFolderIdWithName("hyoon");
  // const items = await googleDrive.getFolderItems(folderId);
  // console.log(items);

  // const data = await googleDrive.getFileCountInFolder(folderId);
  // console.log(data);

  // const url = "https://fapello.com/hyoon/";
  // const url = await input("Provide url to scrape: ");
  // const data: { name: string; sources: { name: string; url: string }[] } = await scrapeImages(
  //   url
  // );
  // console.log(data, data.sources.length);
  // const parentId = await googleDrive.getFolderIdWithName(data.name);
  // for (const img of data.sources) {
  //   const { name, url } = img;
  //   const stream = await convertUrlToStream(url);
  //   try {
  //     await googleDrive.uploadSingleFile({ name, stream, parentId });
  //   } catch (error) {
  //     console.log("ERROR OCURREDDDDDDDDD", error);
  //   }
  // }

  // const twitch = new TwitchDownloader();
  // const { id, mimeType, stream, username } = await twitch.getUrlReadableStream(url);
  // const data = await twitch.scrapeVodUrl(url);

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

  // await googleDrive.uploadSingleFile({
  //   name: "Erica.mp4",
  //   stream: outStream,
  // });
})();
