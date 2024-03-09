import chalk from "chalk";
import inquirer from "inquirer";
import interactivePrompt from "../custom/interactivePrompt.mjs";
import { isExtensionValid } from "../utils/utils.js";
import InterruptedPrompt from "inquirer-interrupted-prompt";
import pathPrompt from "../custom/pathPrompt.mjs";
InterruptedPrompt.fromAll(inquirer);
export class ClientQuestions {
    async input_path(message) {
        const data = pathPrompt({ message, default: process.cwd() });
        return data;
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
                prefix: chalk.gray("Press <ESC> to return to previous page\n"),
            },
        ]);
        return answer.trim();
    }
    async rename(previousName) {
        let { newName } = await inquirer.prompt({
            type: "input",
            name: "newName",
            prefix: chalk.gray("Press <ESC> to return to previous page\n"),
            message: "Provide new name of the selected: ",
        });
        const isValid = isExtensionValid(previousName);
        if (isValid) {
            const base = previousName.split(".").slice(-1);
            newName += `.${base}`;
        }
        return newName;
    }
    async main_questions(items) {
        console.clear();
        const answer = await interactivePrompt({
            message: "Your root folder/files: ",
            choices: [
                ...items.map((file) => ({
                    name: `${file.name} ${file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""}`,
                    value: file,
                })),
            ],
            actions: [
                {
                    name: "Manage Trash",
                    value: "TRASH",
                    key: "t",
                },
                {
                    name: "Create root folder/file",
                    value: "CREATE",
                    key: "v",
                },
                {
                    name: "Open Google Drive in your browser",
                    value: "OPEN_DRIVE",
                    key: "o",
                },
                {
                    name: "Open file from your local machine",
                    value: "OPEN",
                    key: "x",
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
                prefix: chalk.gray("Press <ESC> to return to previous page\n"),
                name: "fileName",
                type: "list",
                pageSize: 10,
                choices: [{ type: "separator" }, ...folders],
            },
        ]);
        return fileName;
    }
    async folder_questions(files, folder_name) {
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
        const prefix = chalk.gray("Press <ESC> to return to previous page\n");
        if (files.length > 0) {
            const answer = await interactivePrompt({
                message: `Select file or choose the action (keys) for folder ${chalk.blueBright.underline(folder_name)}: `,
                prefix,
                pageSize: 10,
                choices: [
                    ...files.map((file) => ({
                        name: `${file.name} ${file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""}`,
                        value: file,
                    })),
                ],
                actionMsg: `Action for folder: ${chalk.underline.cyanBright(folder_name)}:`,
                actions: keyActions,
            });
            return answer;
        }
        else {
            const { res } = await inquirer.prompt([
                {
                    message: `The folder ${chalk.blueBright(folder_name)} is empty. Choose action for folder.`,
                    prefix,
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
                prefix: chalk.gray("Press <ESC> to return to previous page\n"),
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
                prefix: chalk.gray("Press <ESC> to return to previous page\n"),
                name: "answer",
                type: "list",
                pageSize: 10,
                choices: [
                    { type: "separator" },
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
                prefix: chalk.gray("Press <ESC> to return to previous page\n"),
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
    async upload_questions() {
        console.clear();
        const { answer } = await inquirer.prompt([
            {
                type: "list",
                pageSize: 10,
                message: "Upload: ",
                prefix: chalk.gray("Press <ESC> to return to previous page\n"),
                name: "answer",
                choices: [
                    {
                        name: "📁 File",
                        value: "FILE",
                    },
                    {
                        name: "📂 Folder",
                        value: "FOLDER",
                    },
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
                    { type: "separator" },
                    { name: "Delete selected", value: "DELETE" },
                    { name: "Restore selected", value: "RESTORE" },
                ],
            },
        ]);
        return answer;
    }
    async trash_questions(files) {
        console.clear();
        const answer = await interactivePrompt({
            message: "Select trash action or select action: ",
            pageSize: 12,
            prefix: chalk.gray("Press <ESC> to return to previous page.\n"),
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
}
//# sourceMappingURL=clientQuestions.js.map