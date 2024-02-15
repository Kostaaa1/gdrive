import { Separator } from "@inquirer/core";
import chalk from "chalk";
import inquirer from "inquirer";
import InterruptedPrompt from "inquirer-interrupted-prompt";
import interactivePrompt from "../custom/interactivePrompt.js";
InterruptedPrompt.fromAll(inquirer);
export class ClientQuestions {
    async confirm(message) {
        const { bool } = await inquirer.prompt([{ message, type: "confirm", name: "bool" }]);
        return bool;
    }
    async input(message) {
        console.clear();
        const { answer } = await inquirer.prompt([
            {
                type: "input",
                name: "answer",
                message,
                prefix: chalk.gray(" Press <ESC> to return to previous page\n"),
            },
        ]);
        return answer.trim();
    }
    async rename(previousName) {
        let { newName } = await inquirer.prompt({
            type: "input",
            name: "newName",
            prefix: chalk.gray(" Press <ESC> to return to previous page\n"),
            message: "Provide new name of the selected: ",
        });
        const hasFileExtension = /\.(mp4|jpg|jpeg|png|gif|pdf|docx)$/i;
        if (hasFileExtension.test(previousName)) {
            const base = previousName.split(".").slice(-1);
            newName += `.${base}`;
        }
        return newName;
    }
    async main_questions() {
        console.clear();
        const { answer } = await inquirer
            .prompt([
            {
                type: "list",
                pageSize: 10,
                message: "Select Action: ",
                name: "answer",
                choices: [
                    { type: "separator" },
                    {
                        name: "List root folders",
                        value: "LIST",
                    },
                    // {
                    //   name: "New folder",
                    //   value: "NEW_FOLDER ",
                    // },
                    // {
                    //   name: "New file",
                    //   value: "NEW_FILE",
                    // },
                    // {
                    //   name: "Open Google Drive in your browser",
                    //   value: "OPEN_DRIVE",
                    // },
                    // {
                    //   name: "Manage Trash",
                    //   value: "TRASH",
                    // },
                    // {
                    //   name: "Open File from your machine",
                    //   value: "OPEN",
                    // },
                    {
                        name: "Exit",
                        value: "EXIT",
                    },
                ],
            },
        ])
            .catch((error) => {
            if (error === InterruptedPrompt.EVENT_INTERRUPTED) {
                process.exit();
            }
        });
        return answer.trim();
    }
    async test() {
        const answer = await interactivePrompt({
            message: "Select an option:",
            choices: [
                { name: "img1", value: "img1" },
                { name: "img2", value: "img1" },
                { name: "img3", value: "img1" },
                { name: "img4", value: "img1" },
                { name: "img5", value: "img1" },
                { name: "img6", value: "img1" },
                new Separator(),
                { name: "Delete", value: "dsa", key: "x" },
                { name: "Upload", value: "dsa", key: "y" },
            ],
            // renderSelected: (choice) => `❯ ${choice.name} (${choice.key})`,
            // renderUnselected: (choice) => `  ${choice.name} (${choice.key})`,
        });
        console.log(`Selected option: ${answer}`);
    }
    async folder_questions_1(folders, message) {
        console.clear();
        const { fileName } = await inquirer.prompt([
            {
                message,
                prefix: chalk.gray(" Press <ESC> to return to previous page\n"),
                name: "fileName",
                type: "list",
                pageSize: 10,
                choices: [{ type: "separator" }, ...folders],
            },
        ]);
        return fileName;
    }
    async folder_questions_2(folder_name) {
        console.clear();
        const { answer } = await inquirer.prompt([
            {
                message: `📂 Choose folder operation for ${chalk.blueBright.underline(folder_name)}: `,
                prefix: chalk.gray(" Press <ESC> to return to previous page\n"),
                type: "list",
                pageSize: 10,
                name: "answer",
                choices: [
                    { type: "separator" },
                    { name: "List items", value: "LIST" },
                    { name: "Rename", value: "RENAME" },
                    {
                        name: "Delete/Trash",
                        value: "DELETE",
                    },
                    {
                        name: "Create empty folder",
                        value: "CREATE",
                    },
                    { name: "Upload folder/file", value: "UPLOAD" },
                ],
            },
        ]);
        return answer.trim();
    }
    async new_folder_questions() {
        const { answer } = await inquirer.prompt([
            {
                message: "Create / Upload folder: ",
                prefix: chalk.gray(" Press <ESC> to return to previous page\n"),
                name: "answer",
                type: "list",
                pageSize: 10,
                choices: [
                    { type: "separator" },
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
                message: `📁 Choose file operation for ${chalk.blueBright.underline(folder_content)}: `,
                prefix: chalk.gray(" Press <ESC> to return to previous page\n"),
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
                    { name: "Information about file", value: "INFO" },
                ],
            },
        ]);
        return answer.trim();
    }
    async folder_questions_3(files) {
        console.clear();
        const { file } = await inquirer.prompt([
            {
                message: "Select File: ",
                prefix: chalk.gray(" Press <ESC> to return to previous page\n"),
                name: "file",
                type: "list",
                pageSize: 10,
                choices: [
                    { type: "separator" },
                    ...files.map((file) => ({
                        name: file.path,
                        value: file,
                    })),
                ],
            },
        ]);
        return file;
    }
    async select_file(files) {
        console.clear();
        const { file } = await inquirer.prompt([
            {
                message: "Select File: ",
                prefix: chalk.gray(" Press <ESC> to return to previous page\n"),
                name: "file",
                type: "list",
                pageSize: 10,
                choices: [
                    { type: "separator" },
                    ...files.map((file) => ({
                        name: `${file.name} ${file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""}`,
                        value: file,
                    })),
                ],
            },
        ]);
        return file;
    }
    async delete_questions() {
        console.clear();
        const { answer } = await inquirer.prompt([
            {
                type: "list",
                pageSize: 10,
                message: "Do you want to permanently delete seleceted item or move it to trash",
                prefix: chalk.gray(" Press <ESC> to return to previous page\n"),
                name: "answer",
                choices: [
                    { type: "separator" },
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
                prefix: chalk.gray(" Press <ESC> to return to previous page\n"),
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
        const { answer } = await inquirer.prompt({
            message: "Select trash action: ",
            name: "answer",
            type: "list",
            pageSize: 12,
            choices: [
                ...files.map((file) => ({
                    name: `${file.name} ${file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""}`,
                    value: file.name,
                })),
                { type: "separator" },
                { name: "Restore all items", value: "RESTORE" },
                { name: "Delete all items forever", value: "DELETE" },
                { type: "separator" },
            ],
        });
        return files.find((x) => x.name === answer) || answer;
    }
}
//# sourceMappingURL=clientQuestions.js.map