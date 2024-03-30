import "dotenv/config";
import { gdrive, questions } from "./config/config.js";
import {
  createFolder,
  parsePathName,
  isGdriveFolder,
  openFile,
  initProgressBar,
} from "./utils/utils.js";
import { processFolderActions, selectItemToMove } from "./actions/folder.js";
import { processSelectedFile } from "./actions/file.js";
import { processTrashActions } from "./actions/trash.js";
import open from "open";
import path from "path";
import { TFile } from "./types/types.js";
import { processUploadActions } from "./actions/upload.js";
const { checkbox, areYouSure, item_operation, input_path, input } = questions;

const downloadDriveItems = async (item: TFile, folderPath: string) => {
  const { id, mimeType, name, value } = item;
  if (isGdriveFolder(mimeType)) {
    const { files } = await gdrive.getFolderItems(id);
    const bar = initProgressBar(files.length);

    const newPath = await createFolder(path.join(folderPath, name));
    for (let i = 0; i < files.length; i++) {
      bar.increment();
      const file = files[i];
      await downloadDriveItems(file, newPath);

      if (i === files.length - 1) bar.stop();
    }
  } else {
    const pathname = await parsePathName(path.join(folderPath, name));
    await gdrive.downloadFile(pathname, id);
  }
};

export const processMultipleItems = async (files: TFile[], parentId?: string) => {
  try {
    // const selected = await checkbox("Select file: ", files);
    // const operation = await item_operation();
    // let cpath: string | undefined = undefined;

    // if (operation === "DOWNLOAD") {
    //   cpath = await input_path("Provide a path where to store the items: ");
    // }
    let { operation, selected, cpath } = await questions.batch_item_operation(files);

    const proceedMsgs: { [key in "TRASH" | "DELETE"]: string } = {
      DELETE: "Confirm deletion of items?",
      TRASH: "Confirm moving items to trash?",
    };

    let proceed: boolean = false;
    if (operation !== "DOWNLOAD" && operation !== "MOVE") {
      proceed = await areYouSure(proceedMsgs[operation]);
    }

    if (operation === "MOVE") {
      console.log(operation);
      const { id } = await selectItemToMove();
      cpath = id;
    }

    const progressBar = initProgressBar(selected.length);
    for (let i = 0; i < selected.length; i++) {
      progressBar.increment();
      const item = selected[i];
      switch (operation) {
        case "DELETE":
          if (proceed) await gdrive.deleteItem(item.id);
          break;
        case "TRASH":
          await gdrive.moveToTrash(item.id);
          break;
        case "DOWNLOAD":
          if (cpath) await downloadDriveItems(item, cpath);
          break;
        case "MOVE":
          if (cpath) await gdrive.moveFile(item.id, cpath);
          break;
      }
      if (i === selected.length - 1) progressBar.stop();
    }

    parentId
      ? await processFolderActions({
          id: parentId,
          files: files.filter((x) => !selected.includes(x)),
        })
      : await processMainActions();
  } catch (error) {
    parentId ? await processFolderActions({ id: parentId, files }) : await processMainActions();
  }
};

export const processMainActions = async () => {
  try {
    const storageSizeMsg = await gdrive.getDriveStorageSize();
    const items = await gdrive.getRootItems();
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
            ? await processFolderActions({ id: answer.id })
            : await processSelectedFile(answer);
          break;
        }
    }
  } catch (error) {
    await processMainActions();
  }
};

(async () => {
  await gdrive.authorize();
  await processMainActions();

  ////////////////////////////////////////
  // const folders = await gdrive.getDriveFolders();
  // console.log("FOlders: ", folders);

  // const id = await gdrive.getFolderIdWithName("fanfan");
  // console.log(id);
  // const stream = fs.createReadStream(
  //   "/mnt/c/Users/kosta/OneDrive/Desktop/imgs/55348c85-93ff-4f5d-92d9-8783b0334edd_OrenjiSoul_robed_man_holding_an_ancient_source_of_exploding_cosmic_light_by_hayao_miyazaki_Ian_Mcque_Peleng_Rem.png"
  // );
  // await gdrive.uploadSingleFile({ name: "niggers.png", stream, parentId: id });

  /////////////////////////////////////////
  // await processUploadActions();
  // const url =
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
