import chalk from "chalk";
import inquirer from "inquirer";
import InterruptedPrompt from "inquirer-interrupted-prompt";
InterruptedPrompt.fromAll(inquirer);
export class ClientQuestions {
    async confirm(message) {
        console.clear();
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
                prefix: chalk.gray(" Press <ESC> to return back\n"),
            },
        ]);
        return answer.trim();
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
                        name: "List all folders",
                        value: "LIST",
                    },
                    {
                        name: "New folder",
                        value: "CREATE",
                    },
                    {
                        name: "Open Google Drive",
                        value: "OPEN_DRIVE",
                    },
                    {
                        name: "Manage Trash",
                        value: "TRASH",
                    },
                    {
                        name: "Open File from your machine",
                        value: "OPEN",
                    },
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
    async folder_questions_1(folders) {
        console.clear();
        const { fileName } = await inquirer.prompt([
            {
                message: "Your Drive Folders: ",
                prefix: chalk.gray(" Press <ESC> to return back\n"),
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
                prefix: chalk.gray(" Press <ESC> to return back\n"),
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
                message: "Create or Upload folder: ",
                prefix: chalk.gray(" Press <ESC> to return back\n"),
                name: "answer",
                type: "list",
                pageSize: 10,
                choices: [
                    { type: "separator" },
                    { name: "📁 Create empty folder", value: "CREATE" },
                    { name: "📁 Upload folder with the files to drive", value: "UPLOAD" },
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
                prefix: chalk.gray(" Press <ESC> to return back\n"),
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
                        name: "Download",
                        value: "DOWNLOAD",
                    },
                    { name: "Information about file", value: "INFO" },
                ],
            },
        ]);
        return answer.trim();
    }
    async select_file(files) {
        console.clear();
        const { file } = await inquirer.prompt([
            {
                message: "Select File: ",
                prefix: chalk.gray(" Press <ESC> to return back\n"),
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
                prefix: chalk.gray(" Press <ESC> to return back\n"),
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
                prefix: chalk.gray(" Press <ESC> to return back\n"),
                name: "answer",
                choices: [
                    {
                        name: "📁 File",
                        value: "FILE",
                        description: "Upload file (file path required)",
                    },
                    {
                        name: "📂 Folder",
                        value: "FOLDER",
                        description: "Upload folder with files (folder path required)",
                    },
                    { name: "Back", value: "BACK" },
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
                message: `Choose ${chalk.blueBright("Trash")} Action: `,
                prefix: chalk.gray(" Press <ESC> to return back\n"),
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
    // public async trash_questions(
    //   files: drive_v3.Schema$File[]
    // ): Promise<drive_v3.Schema$File | "RESTORE" | "DELETE" | "BACK"> {
    //   console.clear();
    //   const answer = await prompt({
    //     message: "Select an option:",
    //     choices: [
    //       ...files.map((file, id) => ({
    //         name: ` ${file.name} ${
    //           file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""
    //         }`,
    //         value: file.name,
    //       })),
    //       { name: " Restore all items", value: "RESTORE", key: "r" },
    //       { name: " Delete all items forever", value: "DELETE", key: "d" },
    //       { name: " Go back", value: "BACK", key: "b" },
    //     ],
    //     renderSelected: (choice: any) =>
    //       `${chalk.blueBright(`❯${choice.name}  ${choice.key ? "(" + choice.key + ")" : ""}`)}`,
    //     renderUnselected: (choice: any) =>
    //       ` ${choice.name}  ${choice.key ? "(" + choice.key + ")" : ""}`,
    //   });
    //   return files.find((x) => x.name === answer) || answer;
    // }
    async trash_questions(files) {
        console.clear();
        const { answer } = await inquirer.prompt({
            message: "Select trash action: ",
            name: "answer",
            type: "list",
            choices: [
                ...files.map((file, id) => ({
                    name: `${file.name} ${file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""}`,
                    value: file.name,
                })),
                { type: "separator" },
                { name: "Restore all items", value: "RESTORE" },
                { name: "Delete all items forever", value: "DELETE" },
            ],
        });
        return files.find((x) => x.name === answer) || answer;
    }
}
//# sourceMappingURL=clientQuestions.js.map