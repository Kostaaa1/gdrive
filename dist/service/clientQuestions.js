import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
export class ClientQuestions {
    async question(data) {
        const choice = await input(data);
        return choice.trim();
    }
    async delete_questions() {
        const answer = await select({
            message: "Do you want to permanently delete seleceted or move it to trash",
            choices: [
                {
                    name: "Move it to trash",
                    value: "TRASH",
                    description: "The selected will be relocated from current location to trash (The selected will be automatically deleted after 30 days.)",
                },
                { name: "Permanently delete", value: "DELETE", description: "Permanently delete." },
                { name: "Back", value: "BACK" },
            ],
        });
        return answer.trim();
    }
    async main_questions() {
        const answer = await select({
            message: "Choose Action:",
            choices: [
                {
                    name: "List all folders",
                    value: "LIST",
                    description: "Get a list of all root folders",
                },
                {
                    name: "New folder",
                    value: "CREATE",
                    description: "Create new folder at root",
                },
                {
                    name: "Manage Trash",
                    value: "TRASH",
                    description: "Manage Trash (clear trash, restore folder/files, get list of items)",
                },
                {
                    name: "Open Google Drive",
                    value: "OPEN_DRIVE",
                    description: "Opens Google Drive in your default browser",
                },
                {
                    name: "Exit",
                    value: "EXIT",
                },
            ],
        });
        return answer.trim();
    }
    async trash_questions() {
        const choice = await select({
            message: "Choose Trash Action",
            choices: [
                {
                    name: "List Content",
                    value: "LIST",
                    description: "Lists folder/files that are in trash",
                },
                { name: "Empty trash", value: "EMPTY_ALL", description: "Removes all items from trash" },
                {
                    name: "Empty selected item",
                    value: "EMPTY",
                    description: "Removes selected item from trash",
                },
                {
                    name: "Restore selected item",
                    value: "RESTORE",
                    description: "Restores selected item",
                },
                { name: "Restore All items", value: "RESTORE_ALL", description: "Restores all items." },
            ],
        });
        return choice.trim();
    }
    async uplooad_questions() {
        const choice = await select({
            message: `Upload:`,
            choices: [
                {
                    name: "📁 File",
                    value: "FILE",
                    description: "Upload single file (file path required)",
                },
                {
                    name: "📂 Folder",
                    value: "FOLDER",
                    description: "Upload folder with files (Folder path required)",
                },
                { name: "Back", value: "BACK" },
            ],
        });
        return choice.trim();
    }
    async folder_questions(folder_name) {
        const action = await select({
            message: `📂 Choose action for folder ${chalk.cyan.underline(folder_name)}: `,
            choices: [
                { name: "Get Folder Content", value: "LIST" },
                { name: "Rename Folder", value: "RENAME" },
                {
                    name: "Delete Folder",
                    value: "DELETE",
                    description: "Permanently delete or move to trash.",
                },
                {
                    name: "Create folder",
                    value: "CREATE",
                    description: "Creates new folder with the selected folder as root",
                },
                { name: "Upload folder/file", value: "UPLOAD", description: "Upload a folder/file" },
                { name: "Back", value: "BACK" },
            ],
        });
        return action.trim();
    }
    async file_questions(folder_content) {
        const file_action = await select({
            message: `📁 Choose action for file ${chalk.cyan.underline(folder_content)}: `,
            choices: [
                { name: "Rename file", value: "RENAME" },
                { name: "Delete file", value: "DELETE", description: "Delete selected file." },
                { name: "Download file", value: "DOWNLOAD" },
                { name: "Get file information", value: "INFO" },
                // { name: "Open File", value: "OPEN" },
                // { name: "Move File", value: "MOVE" },
                { name: "Back", value: "BACK" },
            ],
        });
        return file_action.trim();
    }
}
//# sourceMappingURL=clientQuestions.js.map