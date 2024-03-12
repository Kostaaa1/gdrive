import chalk from "chalk";
import inquirer from "inquirer";
import { isExtensionValid } from "../utils/utils.js";
import InterruptedPrompt from "inquirer-interrupted-prompt";
// @ts-ignore
import { PathPrompt } from "inquirer-path";
import interactiveList from "../custom/InteractiveList.mjs";
inquirer.registerPrompt("path", PathPrompt);
InterruptedPrompt.fromAll(inquirer);
export class ClientQuestions {
    static getInstance() {
        if (!this.instance) {
            this.instance = new ClientQuestions();
        }
        return this.instance;
    }
    async input_path(message) {
        console.clear();
        const { path } = await inquirer.prompt([
            { type: "path", name: "path", message, default: process.cwd() },
        ]);
        return path;
    }
    async confirm(message) {
        const { bool } = await inquirer.prompt([{ message, type: "confirm", name: "bool" }]);
        return bool;
    }
    async input(message) {
        const { answer } = await inquirer.prompt([
            {
                type: "input",
                name: "answer",
                message,
            },
        ]);
        return answer.trim();
    }
    async rename(previousName) {
        console.clear();
        let { newName } = await inquirer.prompt({
            type: "input",
            name: "newName",
            message: "Provide new name of the selected: ",
        });
        const isValid = isExtensionValid(previousName);
        if (isValid) {
            const base = previousName.split(".").slice(-1);
            newName += `.${base}`;
        }
        return newName;
    }
    async main_questions(items, storageSize) {
        console.clear();
        const answer = await interactiveList({
            message: "Your root folder/files: ",
            sufix: `Used ${storageSize?.usedStorage}MB of ${storageSize?.totalStorage}GB`,
            choices: [
                ...items.map((file) => ({
                    name: `${file.name} ${file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""}`,
                    value: file,
                })),
            ],
            actions: [
                { name: "Manage Trash", value: "TRASH", key: "t" },
                {
                    name: "Upload root folder/file",
                    value: "UPLOAD",
                    key: "v",
                },
                {
                    name: "Create empty folder",
                    value: "CREATE",
                    key: "z",
                },
                {
                    name: "Open Google Drive in your browser",
                    value: "OPEN_DRIVE",
                    key: "o",
                },
                {
                    name: "Preview file from your local machine",
                    value: "OPEN",
                    key: "p",
                },
                {
                    name: "Operate with multiple files",
                    value: "CHECKBOX",
                    key: "w",
                },
                {
                    name: "Exit",
                    value: "EXIT",
                    key: "q",
                },
            ],
        });
        return answer;
    }
    async folder_questions_1(folders, message) {
        console.clear();
        const { fileName } = await inquirer.prompt([
            {
                message,
                name: "fileName",
                type: "list",
                pageSize: 10,
                // choices: [{ type: "separator" }, ...folders],
                choices: folders,
            },
        ]);
        return fileName;
    }
    async folder_questions(files, folderName) {
        console.clear();
        const keyActions = [
            { name: "Rename Folder", value: "RENAME", key: "r" },
            { name: "Delete/Trash Folder", value: "DELETE", key: "d" },
            {
                name: "Download folder",
                value: "DOWNLOAD",
                key: "e",
            },
            {
                name: "Create empty folder",
                value: "CREATE",
                key: "v",
            },
            { name: "Upload folder/file", value: "UPLOAD", key: "u" },
        ];
        if (files.length > 0) {
            const answer = await interactiveList({
                message: `Select file or choose the action (keys) for folder ${chalk.blueBright.underline(folderName)}: `,
                pageSize: 10,
                choices: [
                    ...files.map((file) => ({
                        name: `${file.name} ${file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""}`,
                        value: file,
                    })),
                ],
                actionMsg: `Folder actions:`,
                actions: keyActions,
            });
            return answer;
        }
        else {
            const { res } = await inquirer.prompt([
                {
                    message: `The folder ${chalk.blueBright(folderName)} is empty. Choose action for folder:\n`,
                    name: "res",
                    type: "list",
                    choices: keyActions,
                },
            ]);
            return res;
        }
    }
    async new_folder_questions() {
        console.clear();
        const { answer } = await inquirer.prompt([
            {
                message: "Create / Upload folder: ",
                name: "answer",
                type: "list",
                pageSize: 10,
                choices: [
                    { name: "📁 Create empty folder", value: "CREATE" },
                    {
                        name: "📁 Upload folder from your machine",
                        value: "UPLOAD",
                    },
                ],
            },
        ]);
        return answer;
    }
    async file_questions_1(folder_content) {
        console.clear();
        const { answer } = await inquirer.prompt([
            {
                message: `Choose file operation for ${chalk.blueBright.underline(folder_content)}: `,
                name: "answer",
                type: "list",
                pageSize: 10,
                choices: [
                    // { type: "separator" },
                    { name: "Rename", value: "RENAME" },
                    {
                        name: "Delete/Trash",
                        value: "DELETE",
                    },
                    {
                        name: "Move file",
                        value: "MOVE",
                    },
                    {
                        name: "Download",
                        value: "DOWNLOAD",
                    },
                    { name: "Open file in browser", value: "OPEN" },
                    { name: "Information about file", value: "INFO" },
                ],
            },
        ]);
        return answer.trim();
    }
    async delete_questions() {
        console.clear();
        const { answer } = await inquirer.prompt([
            {
                type: "list",
                pageSize: 10,
                message: "Do you want to permanently delete seleceted item or move it to trash",
                name: "answer",
                choices: [
                    {
                        name: "Move it to trash",
                        value: "TRASH",
                    },
                    { name: "Delete forever", value: "DELETE" },
                ],
            },
        ]);
        return answer.trim();
    }
    async trash_file_question() {
        console.clear();
        const { answer } = await inquirer.prompt([
            {
                type: "list",
                message: `Choose ${chalk.blueBright.underline("Trash")} Action: `,
                prefix: chalk.gray(" Press <ESC> to return to previous page.\n"),
                name: "answer",
                choices: [
                    { name: "Delete selected", value: "DELETE" },
                    { name: "Restore selected", value: "RESTORE" },
                ],
            },
        ]);
        return answer;
    }
    async trash_questions(files) {
        console.clear();
        const answer = await interactiveList({
            message: "Select trash action or select action: ",
            pageSize: 12,
            choices: [
                ...files.map((file) => ({
                    name: `${file.name} ${file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""}`,
                    value: file.name,
                })),
            ],
            actions: [
                { name: "Restore all items", value: "RESTORE", key: "r" },
                { name: "Delete all items forever", value: "DELETE", key: "d" },
            ],
        });
        return files.find((x) => x.name === answer) || answer;
    }
    async item_operation() {
        console.clear();
        const msg = "Choose operation for item/s: ";
        const { operation } = await inquirer.prompt([
            {
                message: msg,
                type: "list",
                name: "operation",
                pageSize: 12,
                choices: [
                    { name: "Move", value: "MOVE" },
                    { name: "Delete", value: "DELETE" },
                    { name: "Trash", value: "TRASH" },
                ],
            },
        ]);
        return operation;
    }
}
ClientQuestions.instance = null;
//# sourceMappingURL=clientQuestions.js.map