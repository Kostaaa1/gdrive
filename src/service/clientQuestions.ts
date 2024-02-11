import {
  DeleteOpts,
  Folder1,
  FileActions,
  FolderActions,
  MainActions,
  NewFolderActions,
  TrashActions,
  UploadOpts,
} from "../types/types.js";
import chalk from "chalk";
import type { drive_v3 } from "googleapis";
import inquirer from "inquirer";
import InterruptedPrompt from "inquirer-interrupted-prompt";
import path from "path";

InterruptedPrompt.fromAll(inquirer);

export class ClientQuestions {
  public async confirm(message: string): Promise<boolean> {
    const { bool } = await inquirer.prompt([{ message, type: "confirm", name: "bool" }]);
    return bool;
  }

  public async input(message: string) {
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

  public async rename(previousName: string) {
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

  public async main_questions(): Promise<MainActions> {
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
            {
              name: "New folder",
              value: "NEW_FOLDER ",
            },
            {
              name: "New file",
              value: "NEW_FILE",
            },
            {
              name: "Open Google Drive in your browser",
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
      .catch((error: any) => {
        if (error === InterruptedPrompt.EVENT_INTERRUPTED) {
          process.exit();
        }
      });
    return answer.trim() as MainActions;
  }

  public async folder_questions_1(
    folders: {
      name: string;
      value: string;
    }[],
    message: string
  ): Promise<string> {
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

  public async folder_questions_2(folder_name: string): Promise<FolderActions> {
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
    return answer.trim() as FolderActions;
  }

  public async new_folder_questions(): Promise<NewFolderActions> {
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
          { name: "📁 Upload folder from your machine", value: "UPLOAD" },
        ],
      },
    ]);
    return answer;
  }

  public async file_questions_1(folder_content: string): Promise<FileActions> {
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
    return answer.trim() as FileActions;
  }

  public async folder_questions_3(files: Folder1[]) {
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

  public async select_file(files: drive_v3.Schema$File[]): Promise<drive_v3.Schema$File> {
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
            name: `${file.name} ${
              file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""
            }`,
            value: file,
          })),
        ],
      },
    ]);
    return file;
  }

  public async delete_questions(): Promise<DeleteOpts> {
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
    return answer.trim() as DeleteOpts;
  }

  public async upload_questions(): Promise<UploadOpts> {
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
    return answer.trim() as UploadOpts;
  }

  public async trash_file_question(): Promise<TrashActions> {
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
    return answer as TrashActions;
  }

  public async trash_questions(
    files: drive_v3.Schema$File[]
  ): Promise<drive_v3.Schema$File | "RESTORE" | "DELETE"> {
    console.clear();
    const { answer } = await inquirer.prompt({
      message: "Select trash action: ",
      name: "answer",
      type: "list",
      choices: [
        ...files.map((file) => ({
          name: `${file.name} ${
            file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""
          }`,
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

// public async trash_questions(
//   files: drive_v3.Schema$File[]
// ): Promise<drive_v3.Schema$File | "RESTORE" | "DELETE" | "BACK"> {
// console.clear();
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
