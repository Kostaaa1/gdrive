import "dotenv/config";
import { GoogleDriveService } from "./service/googleDriveService.js";
import open from "open";
import { ClientQuestions } from "./service/clientQuestions.js";
import { checkIfFolder, convertPathToStream, convertUrlToStream, getMimeType, } from "./utils/utils.js";
import { exec, spawn } from "child_process";
import chalk from "chalk";
import fs from "fs";
const googleDrive = new GoogleDriveService();
const { file_questions_1, new_folder_questions, select_file, upload_questions, delete_questions, confirm, folder_questions_1, folder_questions_2, trash_questions, main_questions, input, trash_file_question, } = new ClientQuestions();
const { log, error } = console;
const handleSelectedFile = async (file, folder) => {
    try {
        let { id, name, mimeType } = file;
        const fileAnswer = await file_questions_1(name);
        const backFunc = (file) => {
            handleSelectedFile(file, folder);
            return;
        };
        switch (fileAnswer) {
            case "DELETE":
                await processDeleteActions(name, id);
                break;
            case "RENAME":
                const newName = await input("Enter new name: ");
                await googleDrive.rename(newName, id);
                file.name = newName;
                backFunc(file);
                break;
            case "INFO":
                await googleDrive.printFileInfo(id);
                const choice = await confirm("Go back?");
                if (choice)
                    await handleSelectedFile(file, folder);
                break;
            case "DOWNLOAD":
                let path = await input("Provide a destination where to store file: ");
                const hasFileExtension = /\.[a-z]{3,4}$/i;
                if (!fs.existsSync(path)) {
                    log("File path is invalid. Please check if you have entered the correct file path.");
                    backFunc(file);
                    return;
                }
                if (!path.endsWith("/"))
                    path += "/";
                if (name && hasFileExtension.test(name)) {
                    name = path + name;
                }
                else {
                    const suffix = "." + mimeType?.split("/")[1];
                    name = path + name + suffix;
                }
                await googleDrive.downloadFile(name, id);
                processFileActions(folder);
                break;
        }
    }
    catch (error) {
        processFileActions(folder);
    }
};
const processFileActions = async (folder) => {
    try {
        const { id: folderId, name: folderName } = folder;
        const files = await googleDrive.listFolderFiles(folderId);
        if (files.length === 0) {
            log("This folder is empty!");
            processFolderActions(folderName);
            return;
        }
        const file = await select_file(files);
        const { name, mimeType } = file;
        if (mimeType === "application/vnd.google-apps.folder") {
            await processFolderActions(name);
        }
        else {
            await handleSelectedFile(file, folder);
        }
    }
    catch (error) {
        processFolderActions(folder.name);
    }
};
const handleSingleUploadFolder = async (path, name, parentId) => {
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
                await googleDrive.uploadSingleFile(fileName, stream, folderId, mimeType);
            }
            else {
                const isFolder = await checkIfFolder(fullPath);
                if (isFolder)
                    await handleSingleUploadFolder(fullPath, fileName, folderId);
            }
        }
    }
    else {
        log("Folder path was invalid. Make sure you enter the correct path!");
    }
};
const processDeleteActions = async (folderName, folderId) => {
    try {
        const choice = await delete_questions();
        const actions = {
            DELETE: async () => {
                const confirmed = await confirm("Are you sure you want to delete forever the selected item?");
                if (confirmed)
                    await googleDrive.deleteFolder(folderId);
            },
            TRASH: async () => {
                const confirmed = await confirm(`Are you sure? ${chalk.gray("(in the next 30 days you will be able to recover it from)")}`);
                if (confirmed) {
                    await googleDrive.moveToTrash(folderId);
                    processFolderActions(folderName);
                }
            },
        };
        await actions[choice]();
    }
    catch (error) {
        processFolderActions(folderName);
    }
};
const processUploadActions = async (folderId, folderName) => {
    try {
        const choice = await upload_questions();
        switch (choice) {
            case "FILE":
                let stream;
                let mimeType;
                const fileName = await input("Provide the name of the new file: ");
                const filePath = await input("Provide the location of the file on your machine: ");
                const type = getMimeType(filePath);
                if (!type) {
                    log("File path is invalid. Please check if you have entered the correct file path.");
                    processFolderActions(folderName);
                    break;
                }
                else {
                    mimeType = type;
                    stream = await convertPathToStream(filePath);
                }
                await googleDrive.uploadSingleFile(fileName, stream, folderId, mimeType);
                processFolderActions(folderName);
                break;
            case "FOLDER":
                const path = await input("Provide folder path: ");
                await handleSingleUploadFolder(path);
                break;
        }
    }
    catch (error) {
        processFolderActions(folderName);
    }
};
const processFolderActions = async (name) => {
    let folderName = name;
    if (!folderName) {
        const folders = await googleDrive.getRootFolders();
        if (!folders || folders.length === 0)
            return;
        try {
            folderName = await folder_questions_1(folders);
        }
        catch (error) {
            processMainActions();
        }
    }
    if (!folderName)
        return;
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
                }
                catch (error) {
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
    }
    catch (error) {
        processFolderActions();
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
const handleTrashFile = async (fileId) => {
    try {
        const choice = await trash_file_question();
        const data = {
            RESTORE: () => {
                googleDrive.drive_client.files.update({
                    fileId,
                    requestBody: { trashed: false },
                });
            },
            DELETE: () => {
                googleDrive.drive_client.files.delete({ fileId: fileId });
            },
        };
        await data[choice]();
        processTrashActions();
    }
    catch (error) {
        processTrashActions();
    }
};
const processTrashActions = async () => {
    const items = await googleDrive.listFilesInTrash();
    if (items.length === 0) {
        log("Trash is empty!");
        await processMainActions();
    }
    else {
        const answer = await trash_questions(items);
        switch (answer) {
            case "DELETE":
                await googleDrive.deleteAllForever();
                break;
            case "RESTORE":
                await googleDrive.untrashAll(items);
                break;
            case "BACK":
                processMainActions();
                break;
            default:
                const file = answer;
                await handleTrashFile(file.id);
                break;
        }
    }
};
const processMainActions = async () => {
    try {
        const answer = await main_questions();
        switch (answer) {
            case "LIST":
                await processFolderActions();
                break;
            case "CREATE":
                await handleNewFolder();
                break;
            case "OPEN":
                const path = await input("Enter the path for the file you want to open: ");
                const os = process.platform;
                if (os === "win32") {
                    open(path);
                }
                else if (os === "linux") {
                    exec(`xdg-open ${path}`);
                }
                break;
            case "TRASH":
                await processTrashActions();
                break;
            case "OPEN_DRIVE":
                open("https://drive.google.com/drive/u/0/my-drive");
                processMainActions();
                break;
            case "EXIT":
                process.exit();
        }
    }
    catch (error) {
        processMainActions();
    }
};
const scrapeVideos = async () => {
    const url = await input("Enter the url to scrape videos from: ");
    const script = spawn("python3", ["scraper.py", "iframe", url]);
    script.stdout.on("data", (data) => {
        log("Recieved data: ", data.toString());
        const s = spawn("python3", ["scraper.py", "video", `https:${data.toString()}`]);
        s.stdout.on("data", async (data) => {
            log("Video url", data.toString());
            const url = JSON.parse(data.toString())[2];
            const stream = await convertUrlToStream(url);
            const folderId = await googleDrive.getFolderIdWithName("Ablum_1");
            await googleDrive.uploadSingleFile(url, stream, folderId, "video/mp4");
        });
        s.stderr.on("data", (data) => {
            error("Stdout error: ", data);
        });
    });
    script.stderr.on("data", (data) => {
        error("Stdout error: ", data);
    });
};
(async () => {
    await googleDrive.authorize();
    processMainActions();
    // scrapeVideos();
})();
//# sourceMappingURL=index.js.map