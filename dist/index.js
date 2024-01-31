import "dotenv/config";
import select from "@inquirer/select";
import { input } from "@inquirer/prompts";
import { GoogleDriveService } from "./service/googleDriveService.js";
import open from "open";
import { ClientQuestions } from "./service/clientQuestions.js";
import { convertPathToStream, convertUrlToStream, getMimeType, getUrlMimeType, } from "./utils/utils.js";
const googleDrive = new GoogleDriveService();
const clientQuestions = new ClientQuestions();
const { ask_file_q, ask_folder_q, ask_main_q, ask_q, ask_upload_file_method } = clientQuestions;
const handleFileActions = async (selected_folder) => {
    console.clear();
    const { id } = selected_folder;
    const files = await googleDrive.getFolderContent(id);
    const selected_file = await select({
        message: "Select File",
        choices: [
            ...files.map((file) => ({ name: file.name || "", value: file })),
            { name: "👈Back", value: { name: "BACK" } },
        ],
    });
    const { name, mimeType } = selected_file;
    if (name === "BACK") {
        handleFolderActions();
        return;
    }
    if (mimeType === "application/vnd.google-apps.folder") {
        handleFolderActions(name);
    }
    else {
        const file_action_choice = await clientQuestions.ask_file_q(name);
        console.log("File actions for: ", file_action_choice);
    }
};
const handleFolderActions = async (name) => {
    console.clear();
    let folder_name = name;
    if (!folder_name) {
        const folders = await googleDrive.getRootFolders();
        if (!folders || folders.length === 0)
            return;
        folder_name = await select({
            message: "Folders: ",
            choices: [...folders, { name: "👈Back", value: "BACK" }],
        });
        if (folder_name === "BACK") {
            handleMainActions();
            return;
        }
    }
    const folder_id = await googleDrive.getFolderIdWithName(folder_name);
    const selected_folder = { name: folder_name, id: folder_id };
    const folder_action = await ask_folder_q(selected_folder.name);
    switch (folder_action) {
        case "RENAME":
            const new_name = await input({ message: `Rename folder ${selected_folder.name}: ` });
            await googleDrive.renameFolder(new_name, selected_folder.id);
            handleFolderActions();
            break;
        case "READ":
            handleFileActions(selected_folder);
            break;
        case "UPLOAD_FILE":
            const choice = await ask_upload_file_method();
            let stream;
            let file_name;
            let file_path;
            let mime_type;
            switch (choice) {
                case "LOCAL":
                    file_name = await ask_q("Provide the name of the new file: ");
                    file_path = await ask_q("Provide the location of the file on your machine: ");
                    const mime = getMimeType(file_path);
                    if (!mime) {
                        console.log("File path is invalid. Please check if you have entered the correct file path.");
                        ask_upload_file_method();
                        return;
                    }
                    mime_type = mime;
                    stream = await convertPathToStream(file_path);
                case "URL":
                    file_name = await ask_q("Provide the name of the new file: ");
                    file_path = await ask_q("Provide the URL: ");
                    mime_type = await getUrlMimeType(file_path);
                    stream = await convertUrlToStream(file_path);
            }
            await googleDrive.uploadSingleFile(file_name, stream, selected_folder.id, mime_type);
            // handleFolderActions();
            break;
        case "DELETE":
            console.log("Deleting folder...");
            const isSure = await ask_q("Are you sure?");
            if (isSure)
                await googleDrive.deleteFolder(selected_folder.id);
            handleFolderActions();
            break;
        case "CREATE":
            const newName = await input({ message: "Enter new folder name: " });
            await googleDrive.createFolder(newName);
            handleFolderActions();
            break;
        case "BACK":
            handleMainActions();
            break;
    }
};
const handleMainActions = async () => {
    console.clear();
    const init_action = await ask_main_q();
    switch (init_action) {
        case "CREATE":
            const new_folder = await input({ message: "Enter new folder name: " });
            await googleDrive.createFolder(new_folder.trim());
            handleMainActions();
            break;
        case "READ":
            handleFolderActions();
            break;
        case "OPEN_DRIVE":
            handleMainActions();
            open("https://drive.google.com/drive/u/0/my-drive");
            break;
        case "EXIT":
            process.exit();
    }
};
(async () => {
    await googleDrive.authorize();
    handleMainActions();
})();
//# sourceMappingURL=index.js.map