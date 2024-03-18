import chalk from "chalk";
import inquirer from "inquirer";
import { isExtensionValid, isGdriveFolder, notify } from "../utils/utils.js";
import InterruptedPrompt from "inquirer-interrupted-prompt";
// @ts-ignore
import { PathPrompt } from "inquirer-path";
import interactiveList from "../custom/InteractiveList.mjs";
import { existsSync } from "fs";
import checkboxPrompt from "../custom/Checkbox.mjs";
import inquirerPressToContinue from "inquirer-press-to-continue";
inquirer.registerPrompt("path", PathPrompt);
inquirer.registerPrompt("press-to-continue", inquirerPressToContinue);
InterruptedPrompt.fromAll(inquirer);
export class ClientQuestions {
    async input_path(message) {
        // if (clearConsole) console.clear();
        const { path } = await inquirer.prompt([
            { type: "path", name: "path", message, default: process.cwd() },
        ]);
        if (!existsSync(path)) {
            await notify("The path that you provided is incorrect. Make sure you are providing valid path.");
            await this.input_path(message);
        }
        return path;
    }
    async pressKeyToContinue() {
        await inquirer.prompt({
            name: "key",
            type: "press-to-continue",
            anyKey: true,
            pressToContinueMessage: "Press any key to continue...",
        });
    }
    async areYouSure(message) {
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
    async trash_questions(items) {
        console.clear();
        const selected = await this.checkbox("Select items: ", items);
        const action = await interactiveList({
            message: "Choose action for trash: ",
            choices: [
                { name: "Recover selected items", value: "RECOVER" },
                { name: "Delete selected items", value: "DELETE" },
            ],
        });
        if (action == "EVENT_INTERRUPTED")
            throw new Error(action);
        return { selectedItems: selected, action };
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
        if (answer === "EVENT_INTERRUPTED")
            throw new Error(answer);
        return answer;
    }
    async folder_questions(files, folderName) {
        console.clear();
        const folderMsg = `${chalk.blueBright.underline(folderName)}`;
        const message = files.length > 1
            ? `Choose file or choose the action for folder ${folderMsg}: `
            : files.length === 1
                ? `Choose action for folder ${folderMsg}: `
                : `The folder ${folderMsg} is empty. Choose action: `;
        let answer;
        if (files.length > 0) {
            answer = await interactiveList({
                message,
                choices: [
                    ...files.map((file) => ({
                        name: `${file.name} ${file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""}`,
                        value: file,
                    })),
                ],
                actionMsg: `Folder actions:`,
                actions: [
                    { name: "Upload from your device", value: "UPLOAD", key: "u" },
                    { name: "Rename Folder", value: "RENAME", key: "r" },
                    { name: "Operate with items", value: "ITEM_OPERATIONS", key: "o" },
                    { name: "Delete folder", value: "DELETE", key: "d" },
                    { name: "Move folder to trash", value: "TRASH", key: "t" },
                    {
                        name: "Create new empty folder",
                        value: "CREATE",
                        key: "n",
                    },
                ],
            });
        }
        else {
            answer = await interactiveList({
                message,
                choices: [
                    { name: "Upload from your device", value: "UPLOAD" },
                    { name: "Rename Folder", value: "RENAME" },
                    // { name: "Operate with items", value: "ITEM_OPERATIONS" },
                    { name: "Delete folder", value: "DELETE" },
                    { name: "Move folder to trash", value: "TRASH" },
                    {
                        name: "Create new empty folder",
                        value: "CREATE",
                    },
                ],
            });
        }
        if (answer === "EVENT_INTERRUPTED")
            throw new Error(answer);
        return answer;
    }
    async selected_item(folder_content) {
        console.clear();
        const answer = await interactiveList({
            message: `Choose file operation for ${chalk.blueBright.underline(folder_content)}: `,
            choices: [
                { name: "Rename", value: "RENAME" },
                {
                    name: "Delete/Trash",
                    value: "DELETE",
                },
                {
                    name: "Download",
                    value: "DOWNLOAD",
                },
                { name: "Open file in browser", value: "OPEN" },
                { name: "Information about file", value: "INFO" },
            ],
        });
        if (answer === "EVENT_INTERRUPTED")
            throw new Error(answer);
        return answer;
    }
    async delete_questions() {
        console.clear();
        const answer = await interactiveList({
            message: "Do you want to permanently delete seleceted item or move it to trash",
            choices: [
                {
                    name: "Move it to trash",
                    value: "TRASH",
                },
                { name: "Delete forever", value: "DELETE" },
            ],
        });
        if (answer === "EVENT_INTERRUPTED")
            throw new Error(answer);
        return answer;
    }
    async item_operation() {
        const answer = await interactiveList({
            message: "📁 Choose folder/file operation: ",
            choices: [
                { name: "Delete", value: "DELETE" },
                { name: "Trash", value: "TRASH" },
                { name: "Download", value: "DOWNLOAD" },
            ],
        });
        if (answer === "EVENT_INTERRUPTED")
            throw new Error(answer);
        return answer;
    }
}
//# sourceMappingURL=clientQuestions.js.map