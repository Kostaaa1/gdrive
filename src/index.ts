import "dotenv/config";
import { GoogleDriveService } from "./service/googleDriveService.js";
import open from "open";
import { ClientQuestions } from "./service/clientQuestions.js";
import {
  checkIfFolder,
  convertPathToStream,
  convertUrlToStream,
  getMimeType,
  openFile,
} from "./utils/utils.js";
import internal from "stream";
import { exec, spawn } from "child_process";
import chalk from "chalk";
import { drive_v3 } from "googleapis";
import fs from "fs";
import path from "path";
import inquirer from "inquirer";

const googleDrive = new GoogleDriveService();
const {
  file_questions_1,
  new_folder_questions,
  folder_questions_3,
  rename,
  select_file,
  upload_questions,
  delete_questions,
  confirm,
  folder_questions_1,
  folder_questions_2,
  trash_questions,
  main_questions,
  input,
  trash_file_question,
} = new ClientQuestions();

const stop = (ms: number = 500) => new Promise((res) => setTimeout(res, ms));

const handleSelectedFile = async (
  file: drive_v3.Schema$File,
  folder: { name: string; id: string }
) => {
  try {
    let { id, name, mimeType } = file;
    const fileAnswer = await file_questions_1(name!);

    const backFunc = (file: drive_v3.Schema$File) => {
      handleSelectedFile(file, folder);
      return;
    };

    switch (fileAnswer) {
      case "DELETE":
        await processDeleteActions(name!, id!);
        break;
      case "RENAME":
        const newName = await rename(name!);
        await googleDrive.rename(newName, id!);
        file.name = newName;
        processFileActions(folder);
        break;
      case "INFO":
        await googleDrive.printFileInfo(id!);
        const choice = await confirm("Go back?");
        if (choice) await handleSelectedFile(file, folder);
        break;
      case "MOVE":
        const folders = await googleDrive.getRootFolders();
        if (folders.length > 0 && id) {
          const message = `Select the folder where you want to move the file: ${chalk.blueBright(
            file.name
          )}`;
          const selectedFolder = await folder_questions_1(folders, message);
          const selectedFolderId = await googleDrive.getFolderIdWithName(selectedFolder);
          await googleDrive.moveFile(id, selectedFolderId);
        }
        backFunc(file);
        break;
      case "DOWNLOAD":
        let path = await input("Provide a destination where to store file: ");
        const hasFileExtension = /\.(mp4|jpg|jpeg|png|gif|pdf|docx)$/i;

        if (!fs.existsSync(path)) {
          console.log(
            "File path is invalid. Please check if you have entered the correct file path."
          );
          backFunc(file);
          return;
        }

        if (!path.endsWith("/")) path += "/";
        if (name && hasFileExtension.test(name)) {
          path = path + name;
        } else {
          const suffix = "." + mimeType?.split("/")[1];
          path += name + suffix;
        }

        await googleDrive.downloadFile(path, id!);
        processFileActions(folder);
        break;
    }
  } catch (error) {
    processFileActions(folder);
  }
};

const processFileActions = async (folder: { name: string; id: string }) => {
  try {
    const { id: folderId, name: folderName } = folder;
    const files = await googleDrive.listFolderFiles(folderId);

    if (files.length === 0) {
      console.log("This folder is empty!");
      processFolderActions(folderName);
      return;
    }

    const file = await select_file(files);
    const { name, mimeType } = file;

    if (mimeType === "application/vnd.google-apps.folder") {
      await processFolderActions(name!);
    } else {
      await handleSelectedFile(file, folder);
    }
  } catch (error) {
    processFolderActions(folder.name);
  }
};

const handleSingleUploadFolder = async (path: string, name?: string, parentId?: string) => {
  if (fs.existsSync(path)) {
    const folderName = name ? name : await input("Enter the name of the new folder: ");

    const folderId = name
      ? await googleDrive.createFolder(folderName, parentId)
      : await googleDrive.getFolderIdWithName(folderName);

    const files = fs.readdirSync(path);
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      const fullPath = path.endsWith("/") ? path + fileName : path + "/" + fileName;
      const mimeType = getMimeType(fullPath);

      if (mimeType) {
        const stream = await convertPathToStream(fullPath);
        await googleDrive.uploadSingleFile(fileName, stream, folderId, mimeType!);
      } else {
        const isFolder = await checkIfFolder(fullPath);
        if (isFolder) await handleSingleUploadFolder(fullPath, fileName, folderId);
      }
    }
  } else {
    console.log("Folder path was invalid. Make sure you enter the correct path!");
  }
};

const processDeleteActions = async (folderName: string, folderId: string) => {
  try {
    const choice = await delete_questions();
    const actions = {
      DELETE: async () => {
        const confirmed = await confirm(
          "Are you sure that you want to delete selceted item forver?"
        );
        if (confirmed) await googleDrive.deleteFolder(folderId);
        await processFolderActions();
      },
      TRASH: async () => {
        const confirmed = await confirm(
          `Are you sure? ${chalk.gray(
            "(in the next 30 days you will be able to recover it from)"
          )}`
        );

        if (confirmed) {
          await googleDrive.moveToTrash(folderId);
          await processFolderActions();
        }
      },
    };
    await actions[choice]();
  } catch (error) {
    processFolderActions(folderName);
  }
};

const processUploadActions = async (folderId: string, folderName: string) => {
  try {
    const choice = await upload_questions();
    switch (choice) {
      case "FILE":
        let stream: internal.Readable | undefined;
        let mimeType: string | undefined;

        const filePath = await input("Provide the location of the file on your machine: ");
        const fileName = path.basename(filePath);
        const type = getMimeType(filePath);

        if (!type) {
          console.log(
            "File path is invalid. Please check if you have entered the correct file path."
          );
          processFolderActions(folderName);
          break;
        } else {
          mimeType = type;
          stream = await convertPathToStream(filePath);
        }

        await googleDrive.uploadSingleFile(fileName, stream, folderId, mimeType);
        processFolderActions(folderName);
        break;
      case "FOLDER":
        const folderPath = await input("Provide folder path: ");
        handleSingleUploadFolder(folderPath);
        break;
    }
  } catch (error) {
    processFolderActions(folderName);
  }
};

const handleNewFolder = async () => {
  const choice = await new_folder_questions();
  switch (choice) {
    case "CREATE":
      const newFolder = await input("Enter new folder name: ");
      await googleDrive.createFolder(newFolder);
      processMainActions();
      break;
    case "UPLOAD":
      const path = await input("Provide folder path: ");
      await handleSingleUploadFolder(path);
      break;
  }
};

const processFolderActions = async (name?: string) => {
  let folderName = name;
  if (!folderName) {
    const folders = await googleDrive.getRootFolders();
    if (!folders || folders.length === 0) return;
    try {
      const message = "Your drive folders: ";
      folderName = await folder_questions_1(folders, message);
    } catch (error) {
      processMainActions();
    }
  }

  if (!folderName) return;
  const folderId = await googleDrive.getFolderIdWithName(folderName);
  const selectedFolder = { name: folderName, id: folderId };

  try {
    const folder_answer = await folder_questions_2(selectedFolder.name);
    switch (folder_answer) {
      case "LIST":
        await processFileActions(selectedFolder);
        break;
      case "RENAME":
        try {
          const new_name = await input(`Rename folder ${chalk.cyan(selectedFolder.name)}: `);
          await googleDrive.rename(new_name, selectedFolder.id);
          await processFolderActions();
        } catch (error) {
          processFolderActions(selectedFolder.name);
        }
        break;
      case "DELETE":
        await processDeleteActions(folderName, folderId);
        break;
      case "CREATE":
        const newName = await input("Enter new folder name: ");
        await googleDrive.createFolder(newName, selectedFolder.id);
        await processFolderActions(selectedFolder.name);
        break;
      case "UPLOAD":
        await processUploadActions(folderId, folderName);
        break;
    }
  } catch (error) {
    processFolderActions();
  }
};

const handleTrashFile = async (fileId: string) => {
  try {
    const choice = await trash_file_question();
    const data = {
      RESTORE: async () => {
        await googleDrive.drive_client.files.update({
          fileId,
          requestBody: { trashed: false },
        });
      },
      DELETE: async () => {
        await googleDrive.drive_client.files.delete({ fileId: fileId });
      },
    };

    await data[choice]();
    await processTrashActions();
  } catch (error) {
    await processTrashActions();
  }
};

const processTrashActions = async () => {
  try {
    const items = await googleDrive.listTrashFiles();

    if (items.length === 0) {
      await stop();
      await processMainActions();
    } else {
      const answer = await trash_questions(items);
      if (answer) {
        switch (answer) {
          case "DELETE":
            await googleDrive.deleteTrashForever();
            await processMainActions();
            break;
          case "RESTORE":
            await googleDrive.untrashAll(items);
            await processMainActions();
            break;
          default:
            const file: drive_v3.Schema$File = answer;
            await handleTrashFile(file.id!);
            break;
        }
      } else {
        await processMainActions();
      }
    }
  } catch (error) {
    await processMainActions();
  }
};

const processMainActions = async () => {
  try {
    const answer = await main_questions();
    switch (answer) {
      case "LIST":
        await processFolderActions();
        break;
      // case "NEW_FOLDER":
      //   await handleNewFolder();
      //   break;
      // case "NEW_FILE":
      //   const folders = await googleDrive.getAllFolders();
      //   const answer = await folder_questions_3(folders);
      //   break;
      // case "OPEN":
      //   const path = await input("Enter the path for the file you want to open: ");
      //   await openFile(path);
      //   await processMainActions();
      //   break;
      case "TRASH":
        await processTrashActions();
        break;
      // case "OPEN_DRIVE":
      //   await open("https://drive.google.com/drive/u/0/my-drive");
      //   await processMainActions();
      //   break;
      case "EXIT":
        process.exit();
    }
  } catch (error) {
    processMainActions();
  }
};

(async () => {
  await googleDrive.authorize();
  await processMainActions();
})();

// const scrapeVideos = async () => {
//   const url = await input("Enter the url to scrape videos from: ");
//   const script = spawn("python3", ["scraper.py", "iframe", url]);

//   script.stdout.on("data", (data) => {
//     console.log("Recieved data: ", data.toString());
//     const s = spawn("python3", ["scraper.py", "video", `https:${data.toString()}`]);

//     s.stdout.on("data", async (data) => {
//       console.log("Video url", data.toString());
//       const url = JSON.parse(data.toString())[2];
//       const stream = await convertUrlToStream(url);
//       const folderId = await googleDrive.getFolderIdWithName("Ablum_1");
//       await googleDrive.uploadSingleFile(url, stream, folderId, "video/mp4");
//     });

//     s.stderr.on("data", (data) => {
//       console.error("Stdout error: ", data);
//     });
//   });

//   script.stderr.on("data", (data) => {
//     console.error("Stdout error: ", data);
//   });
// };
