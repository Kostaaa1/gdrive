import chalk from "chalk";
import inquirer from "inquirer";
import { isExtensionValid, isGdriveFolder, notify } from "../utils/utils.js";
import InterruptedPrompt from "inquirer-interrupted-prompt";
// @ts-ignore
import { PathPrompt } from "inquirer-path";
import interactiveList from "../custom/InteractiveList.mjs";
import { existsSync } from "fs";
import checkboxPrompt from "../custom/Checkbox.mjs";
inquirer.registerPrompt("path", PathPrompt);
InterruptedPrompt.fromAll(inquirer);
export class ClientQuestions {
    async input_path(message, clearConsole = true) {
        if (clearConsole)
            console.clear();
        const { path } = await inquirer.prompt([
            { type: "path", name: "path", message, default: process.cwd() },
        ]);
        if (existsSync(path)) {
            return path;
        }
        else {
            await notify("The path that you provided is incorrect. Make sure you are providing valid path.");
            return undefined;
        }
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
    async checkbox(message, items) {
        console.clear();
        const selected = await checkboxPrompt({
            message,
            choices: items.map((item) => item && {
                ...item,
                name: `${item.name} ${isGdriveFolder(item.mimeType) ? chalk.gray("(folder)") : ""}`,
                value: item,
            }),
        });
        if (selected.length === 0) {
            await notify("No items selected, make sure you have selected items in order to proceed.");
            await this.checkbox(message, items);
        }
        return selected;
    }
    async main_questions(items, storageSizeMsg) {
        console.clear();
        const answer = await interactiveList({
            message: "Your root folder/files: ",
            sufix: storageSizeMsg,
            choices: [
                ...items.map((file) => ({
                    name: `${file.name} ${isGdriveFolder(file.mimeType) ? chalk.gray("(folder)") : ""}`,
                    value: file,
                })),
            ],
            actions: [
                { name: "Manage Trash", value: "TRASH", key: "t" },
                {
                    name: "Upload from your device",
                    value: "UPLOAD",
                    key: "u",
                },
                {
                    name: "Create new empty folder",
                    value: "CREATE",
                    key: "n",
                },
                {
                    name: "Operate with items",
                    value: "ITEM_OPERATIONS",
                    key: "o",
                },
                {
                    name: "Open Google Drive in your browser",
                    value: "OPEN_DRIVE",
                    key: "g",
                },
                {
                    name: "Preview file from your local machine",
                    value: "OPEN",
                    key: "p",
                },
                {
                    name: "Exit",
                    value: "EXIT",
                    key: "x",
                },
            ],
        });
        return answer;
    }
    async folder_questions(files, folderName) {
        console.clear();
        const keyActions = [
            { name: "Upload from your device", value: "UPLOAD", key: "u" },
            { name: "Rename Folder", value: "RENAME", key: "r" },
            { name: "Operate with items", value: "ITEM_OPERATIONS", key: "o" },
            {
                name: "Create new empty folder",
                value: "CREATE",
                key: "n",
            },
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
    async selected_item(folder_content) {
        console.clear();
        const { answer } = await inquirer.prompt([
            {
                message: `Choose file operation for ${chalk.blueBright.underline(folder_content)}: `,
                name: "answer",
                type: "list",
                pageSize: 10,
                choices: [
                    { name: "Rename", value: "RENAME" },
                    {
                        name: "Delete/Trash",
                        value: "DELETE",
                    },
                    // {
                    //   name: "Move file",
                    //   value: "MOVE",
                    // },
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
    async item_operation() {
        const { operation } = await inquirer.prompt([
            {
                message: "📁 Choose folder/file operation: ",
                type: "list",
                name: "operation",
                pageSize: 12,
                choices: [
                    { name: "Delete", value: "DELETE" },
                    { name: "Trash", value: "TRASH" },
                    { name: "Download", value: "DOWNLOAD" },
                ],
            },
        ]);
        return operation;
    }
    async trash(files) {
        console.clear();
        const selected = await this.checkbox("Select items: ", files);
        return selected;
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
}
// public async folder_questions_1(
//   folders: {
//     name: string;
//     value: string;
//   }[],
//   message: string
// ): Promise<string> {
// console.clear();
//   const { fileName } = await inquirer.prompt([
//     {
//       message,
//       name: "fileName",
//       type: "list",
//       pageSize: 10,
//       // choices: [{ type: "separator" }, ...folders],
//       choices: folders,
//     },
//   ]);
//   return fileName;
// }
//# sourceMappingURL=clientQuestions.js.map