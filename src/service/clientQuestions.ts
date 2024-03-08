import {
  DeleteOpts,
  Folder1,
  FileActions,
  FolderActions,
  NewFolderActions,
  TrashActions,
  UploadOpts,
} from "../types/types.js";
import fs from "fs";
import { Separator, makeTheme } from "@inquirer/core";
import chalk from "chalk";
import type { drive_v3 } from "googleapis";
import inquirer from "inquirer";
import interactivePrompt from "../custom/interactivePrompt.mjs";
import { isExtensionValid } from "../utils/utils.js";
import InterruptedPrompt from "inquirer-interrupted-prompt";

InterruptedPrompt.fromAll(inquirer);

export class ClientQuestions {
  public async confirm(message: string): Promise<boolean> {
    const { bool } = await inquirer.prompt([{ message, type: "confirm", name: "bool" }]);
    return bool;
  }

  public async inputPath(): Promise<string> {
    const { path } = await inquirer.prompt([
      {
        type: "path",
        name: "path",
        message: "Enter the file path: ",
        default: process.cwd(),
        validate: (answer) => (fs.existsSync(answer) ? true : "The path does not exist."),
      },
    ]);
    return path;
  }

  public async input(message: string) {
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

  public async rename(previousName: string) {
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

  public async main_questions(items: { name: string; value: string; mimeType: string }[]) {
    console.clear();
    const answer = await interactivePrompt({
      message: "Your root folder/files: ",
      choices: [
        ...items.map((file) => ({
          name: `${file.name} ${
            file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""
          }`,
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
        prefix: chalk.gray("Press <ESC> to return to previous page\n"),
        name: "fileName",
        type: "list",
        pageSize: 10,
        choices: [{ type: "separator" }, ...folders],
      },
    ]);
    return fileName;
  }

  public async folder_questions(
    files: drive_v3.Schema$File[],
    folder_name: string
  ): Promise<string | drive_v3.Schema$File> {
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
        message: `Select file or choose the action (keys) for folder ${chalk.blueBright.underline(
          folder_name
        )}: `,
        prefix,
        pageSize: 10,
        choices: [
          ...files.map((file) => ({
            name: `${file.name} ${
              file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""
            }`,
            value: file,
          })),
        ],
        actionMsg: `Folder action ${chalk.underline.cyanBright(folder_name)}:`,
        actions: keyActions,
      });
      return answer;
    } else {
      const { res } = await inquirer.prompt([
        {
          message: `The folder ${chalk.blueBright(folder_name)} is empty. Choose folder action.`,
          prefix,
          name: "res",
          type: "list",
          choices: keyActions,
        },
      ]);
      return res;
    }
  }

  public async new_folder_questions(): Promise<NewFolderActions> {
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

  public async file_questions_1(folder_content: string): Promise<FileActions> {
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
    return answer.trim() as FileActions;
  }

  public async delete_questions(): Promise<DeleteOpts> {
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
    return answer.trim() as DeleteOpts;
  }

  public async upload_questions(): Promise<UploadOpts> {
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
    const answer = await interactivePrompt({
      message: "Select trash action or select action: ",
      pageSize: 12,
      prefix: chalk.gray("Press <ESC> to return to previous page.\n"),
      choices: [
        ...files.map((file) => ({
          name: `${file.name} ${
            file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""
          }`,
          value: file.name as string,
        })),
      ],
      actions: [
        { name: "Restore all items", value: "RESTORE", key: "r" },
        { name: "Delete all items forever", value: "DELETE", key: "d" },
      ],
    });
    return files.find((x) => x.name === answer) || (answer as "DELETE" | "RESTORE");
  }
}
