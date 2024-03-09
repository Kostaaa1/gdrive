import "dotenv/config";
import { GoogleDriveService } from "./service/googleDriveService.js";
import open from "open";
import { ClientQuestions } from "./service/clientQuestions.js";
import { checkIfFolder, convertPathToStream, getMimeType, openFile } from "./utils/utils.js";
import internal from "stream";
import chalk from "chalk";
import { drive_v3 } from "googleapis";
import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import { Separator } from "@inquirer/core";
import { mkdir } from "fs/promises";
import { SingleBar } from "cli-progress";
import { getPathItems } from "./custom/pathPrompt.mjs";

const googleDrive = new GoogleDriveService();
const {
  folder_questions,
  folder_questions_1,
  new_folder_questions,
  file_questions_1,
  rename,
  upload_questions,
  input_path,
  delete_questions,
  confirm,
  main_questions,
  trash_questions,
  input,
  trash_file_question,
} = new ClientQuestions();

const notify = (ms: number = 500) => new Promise((res) => setTimeout(res, ms));

const processNewFolder = async () => {
  const choice = await new_folder_questions();
  switch (choice) {
    case "CREATE":
      const newFolder = await input("Enter new folder name: ");
      await googleDrive.createFolder(newFolder);
      await processMainActions();
      break;
    case "UPLOAD":
      const fpath = await input_path("Provide folder path: ");
      await processSingleUploadFolder(fpath);
      break;
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
      },
      TRASH: async () => {
        const confirmed = await confirm(
          `Are you sure? ${chalk.gray(
            "(in the next 30 days you will be able to recover it from)"
          )}`
        );

        if (confirmed) {
          await googleDrive.moveToTrash(folderId);
        }
      },
    };
    await actions[choice]();
    await processMainActions();
  } catch (error) {
    processFolderActions(folderName);
  }
};

const processSelectedFile = async (
  file: drive_v3.Schema$File,
  folder?: { name: string; id: string }
) => {
  try {
    let { id, name, mimeType } = file;
    const fileAnswer = await file_questions_1(name!);

    const backFunc = async (file: drive_v3.Schema$File) => {
      await processSelectedFile(file, folder);
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
        folder ? await processFolderActions(folder.name) : await processMainActions();
        break;
      case "INFO":
        await googleDrive.printFileInfo(id!);
        const choice = await confirm("Go back?");
        if (choice) await processSelectedFile(file, folder);
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
        await backFunc(file);
        break;
      case "DOWNLOAD":
        let path = await input_path("Provide a destination where to store file: ");
        const hasFileExtension = /\.(mp4|jpg|jpeg|png|gif|pdf|docx)$/i;

        if (!fs.existsSync(path)) {
          console.log(
            "File path is invalid. Please check if you have entered the correct file path."
          );
          await backFunc(file);
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
        folder ? await processFolderActions(folder.name) : await processMainActions();
        break;
      case "OPEN":
        await open(`https://drive.google.com/file/d/${id}/view`);
        await processSelectedFile(file, folder);
        break;
    }
  } catch (error) {
    if (folder) processFolderActions(folder.name);
  }
};

const processSingleUploadFolder = async (resPath: string, name?: string, parentId?: string) => {
  if (fs.existsSync(resPath)) {
    const folderName = path.basename(resPath);
    const folderId = name
      ? await googleDrive.createFolder(folderName, parentId)
      : await googleDrive.getFolderIdWithName(folderName);

    const files = fs.readdirSync(resPath).reverse();
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      const fullPath = path.join(resPath, fileName);
      const mimeType = getMimeType(fullPath);

      if (mimeType) {
        const stream = await convertPathToStream(fullPath);
        await googleDrive.uploadSingleFile(fileName, stream, mimeType!, folderId);
      } else {
        const isFolder = await checkIfFolder(fullPath);
        if (isFolder) await processSingleUploadFolder(fullPath, fileName, folderId);
      }
    }
  } else {
    console.log("Folder path was invalid. Make sure you enter the correct path!");
  }
};

const processUploadActions = async (folderId: string, folderName: string) => {
  try {
    const choice = await upload_questions();
    switch (choice) {
      case "FILE":
        let stream: internal.Readable | undefined;
        let mimeType: string | undefined;

        const filePath = await input_path("Provide the location of the file on your machine: ");
        const fileName = path.basename(filePath);
        const type = getMimeType(filePath);

        if (!type) {
          console.log(
            "File path is invalid. Please check if you have entered the correct file path."
          );
          await processFolderActions(folderName);
          break;
        } else {
          mimeType = type;
          stream = await convertPathToStream(filePath);
        }

        await googleDrive.uploadSingleFile(fileName, stream, mimeType, folderId);
        await processFolderActions(folderName);
        break;
      case "FOLDER":
        const folderPath = await input_path("Provide folder path: ");
        await processSingleUploadFolder(folderPath);
        break;
    }
  } catch (error) {
    processFolderActions(folderName);
  }
};

const processDownloadFolder = async (
  folderName: string,
  files: drive_v3.Schema$File[],
  repeatData: any
) => {
  if (repeatData) {
    console.clear();
    console.log(
      `The folder ${chalk.cyanBright(
        folderName
      )}, already exists on the provided path (${chalk.gray(repeatData.data)}).`
    );
  }

  const folderPath = await input_path("Provide a path where to store the folder: ");
  const progressBar = new SingleBar({
    format: "Progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}",
  });

  progressBar.start(files.length, 0);
  const newPath = path.join(folderPath, folderName);
  if (!fs.existsSync(newPath)) {
    await mkdir(newPath);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await googleDrive.downloadFile(path.join(newPath, file.name!), file.id!);
      progressBar.increment();
      if (i === files.length - 1) {
        progressBar.stop();
      }
    }

    await processFolderActions(folderName);
  } else {
    await processFolderActions(folderName, { action: "DOWNLOAD", data: newPath });
  }
};

// const processFolderActions = async (folderName: string, action?: string) => {
const processFolderActions = async (
  folderName: string,
  repeatData?: { action: string; data: string }
) => {
  const folderId = await googleDrive.getFolderIdWithName(folderName);

  const selectedFolder = { name: folderName, id: folderId };
  const files = await googleDrive.listFolderFiles(folderId);
  try {
    const res = repeatData?.action || (await folder_questions(files, selectedFolder.name));
    switch (res) {
      case "RENAME":
        try {
          const new_name = await input(`Rename folder ${chalk.cyan(selectedFolder.name)}: `);
          await googleDrive.rename(new_name, selectedFolder.id);
          await processFolderActions(new_name);
        } catch (error) {
          await processFolderActions(selectedFolder.name);
        }
        break;
      case "DOWNLOAD":
        await processDownloadFolder(folderName, files, repeatData);
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
      default:
        if (typeof res !== "string") {
          const { name, mimeType } = res;
          mimeType === "application/vnd.google-apps.folder"
            ? await processFolderActions(name!)
            : await processSelectedFile(res, { id: folderId, name: folderName });
        }
        break;
    }
  } catch (error) {
    // processFolderActions(folderName);
    await processMainActions();
  }
};

const processTrashFile = async (fileId: string) => {
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
            await processTrashFile(file.id!);
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
    const folders = await googleDrive.getRootItems();
    const answer = await main_questions(folders);
    switch (answer) {
      case "CREATE":
        const { res } = await inquirer.prompt([
          {
            message: "Create new folder/file at root position",
            name: "res",
            type: "list",
            choices: [
              new Separator(),
              { name: "📂New Folder", value: "FOLDER" },
              { name: "📁New File", value: "FILE" },
            ],
          },
        ]);

        if (res === "FOLDER") {
          await processNewFolder();
        } else if ("FILE") {
          const filePath = await input_path("Enter the path for the file you want to open: ");
          if (fs.existsSync(filePath)) {
            const stream = await convertPathToStream(filePath);
            const mimeType = getMimeType(filePath);
            const name = path.basename(filePath);
            await googleDrive.uploadSingleFile(name, stream, mimeType!);
          } else {
            console.error("The path that you provided is incorrect.");
          }
        }
        await processMainActions();
        break;
      case "OPEN":
        const filePath = await input_path("Enter the path for the file you want to open: ");
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
          const { mimeType } = answer;
          if (mimeType === "application/vnd.google-apps.folder") {
            await processFolderActions(answer.name);
          } else {
            // await processSelectedFile(answer as drive_v3.Schema$File);
          }
          break;
        }
    }
  } catch (error) {
    processMainActions();
  }
};

(async () => {
  // await googleDrive.authorize();
  // await processMainActions();
  const s = await input_path("Path: ");
  console.log(s);
  // const a = await getPathItems("/mnt/c/Users/kosta/OneDrive/Desktop/keystrokes/ATT86239.env/");
  // console.log(a);
})();
