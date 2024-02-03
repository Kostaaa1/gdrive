import "dotenv/config";
import select from "@inquirer/select";
import { confirm } from "@inquirer/prompts";
import { GoogleDriveService } from "./service/googleDriveService.js";
import open from "open";
import { ClientQuestions } from "./service/clientQuestions.js";
import { convertPathToStream, getMimeType, parseMimeType } from "./utils/utils.js";
import chalk from "chalk";
const googleDrive = new GoogleDriveService();
const { uplooad_questions, trash_questions, file_questions, delete_questions, folder_questions, main_questions, question, } = new ClientQuestions();
const processFileActions = async (selected_folder) => {
    const { id } = selected_folder;
    const files = await googleDrive.listFolderFiles(id);
    if (files.length === 0) {
        console.log("This folder is empty! Feel free to upload content.");
        processFolderActions(selected_folder.name);
        return;
    }
    // name: file.name!!,
    const selected_file = await select({
        message: "Select File",
        choices: [
            ...files.map((file) => ({
                name: `${file.name} ${chalk.gray(`[${parseMimeType(file.mimeType)}]`)}` || "",
                value: file,
            })),
            { name: "Back", value: { name: "BACK" } },
        ],
    });
    const { name, mimeType } = selected_file;
    if (name === "BACK") {
        processFolderActions(selected_folder.name);
        return;
    }
    if (mimeType === "application/vnd.google-apps.folder") {
        processFolderActions(name);
    }
    else {
        const file_action_choice = await file_questions(name);
        if (file_action_choice === "BACK") {
            processFileActions(selected_folder);
            return;
        }
        console.log("WE NEED TO HANDLE FILE ACTIONS: ", file_action_choice);
    }
};
const processUploadActions = async (choice, folder_id, folder_name) => {
    switch (choice) {
        case "FILE":
            let stream;
            let mime_type;
            const file_name = await question({ message: "Provide the name of the new file: " });
            const file_path = await question({
                message: "Provide the location of the file on your machine: ",
            });
            const type = getMimeType(file_path);
            if (!type) {
                console.log("File path is invalid. Please check if you have entered the correct file path.");
                // processUploadActions(choice, folder_id, folder_name);
                processFolderActions(folder_name);
                return;
            }
            else {
                mime_type = type;
                stream = await convertPathToStream(file_path);
            }
            if (file_name && mime_type && stream && folder_id) {
                await googleDrive.uploadSingleFile(file_name, stream, folder_id, mime_type);
            }
            processFolderActions(folder_name);
            break;
        case "FOLDER":
            console.log("Handle uploading folder.");
            break;
        case "BACK":
            processFolderActions(folder_name);
            break;
    }
};
const processDeleteActions = async (choice, folder_id) => {
    const actions = {
        DELETE: async () => {
            const confirmed = await confirm({
                message: "Are you sure you want to permanently delete?",
            });
            if (confirmed)
                await googleDrive.deleteFolder(folder_id);
            actions["BACK"];
        },
        TRASH: async () => {
            const confirmed = await confirm({
                message: "Are you sure you want to permanently delete?",
            });
            // if (confirmed) await googleDrive.moveToTrash
            // console.log("Answer for TRASH: ", answer);
            actions["BACK"];
        },
        BACK: () => processFolderActions(),
    };
    actions[choice];
};
const processFolderActions = async (name) => {
    let folder_name = name;
    if (!folder_name) {
        const folders = await googleDrive.getRootFolders();
        if (!folders || folders.length === 0)
            return;
        folder_name = await select({
            message: "Your Drive folders: ",
            choices: [...folders, { name: "Back", value: "BACK" }],
        });
        if (folder_name === "BACK") {
            processMainActions();
            return;
        }
    }
    const folder_id = await googleDrive.getFolderIdWithName(folder_name);
    const selected_folder = { name: folder_name, id: folder_id };
    const folder_answer = await folder_questions(selected_folder.name);
    switch (folder_answer) {
        case "RENAME":
            const new_name = await question({ message: `Rename folder ${selected_folder.name}: ` });
            await googleDrive.renameFolder(new_name, selected_folder.id);
            processFolderActions();
            break;
        case "LIST":
            processFileActions(selected_folder);
            break;
        case "DELETE":
            const answer = await delete_questions();
            processDeleteActions(answer, folder_id);
            //   message: `Are you sure you want to delete folder: ${chalk.cyan.underline(folder_name)}?`,
            // });
            // if (isSure) await googleDrive.deleteFolder(selected_folder.id);
            // processFolderActions();
            break;
        case "CREATE":
            const newName = await question({ message: "Enter new folder name: " });
            await googleDrive.createFolder(newName, selected_folder.id);
            processFolderActions();
            break;
        case "UPLOAD":
            const choice = await uplooad_questions();
            processUploadActions(choice, folder_id, folder_name);
            break;
        case "BACK":
            selected_folder.name ? processFolderActions() : processMainActions();
            break;
    }
};
const processTrashActions = async () => {
    const answer = await trash_questions();
    console.log("TODO: answer for trash: ", answer);
};
const processMainActions = async () => {
    console.clear();
    const answer = await main_questions();
    switch (answer) {
        case "CREATE":
            const new_folder = await question({ message: "Enter new folder name: " });
            await googleDrive.createFolder(new_folder);
            processMainActions();
            break;
        case "LIST":
            processFolderActions();
            break;
        case "TRASH":
            const action = await trash_questions();
            console.log("You should do: ", action);
            break;
        case "OPEN_DRIVE":
            open("https://drive.google.com/drive/u/0/my-drive");
            processMainActions();
            break;
        case "EXIT":
            process.exit();
    }
};
(async () => {
    await googleDrive.authorize();
    processMainActions();
})();
//# sourceMappingURL=index.js.map