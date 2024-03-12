import {
  DeleteOpts,
  FileActions,
  NewFolderActions,
  TrashActions,
  UploadOpts,
} from "../types/types.js";
import chalk from "chalk";
import type { drive_v3 } from "googleapis";
import inquirer from "inquirer";
import { isExtensionValid } from "../utils/utils.js";
import InterruptedPrompt from "inquirer-interrupted-prompt";
// @ts-ignore
import { PathPrompt } from "inquirer-path";
import interactiveList from "../custom/InteractiveList.mjs";
import { Separator } from "../custom/Separator.mjs";
import stringWidth from "string-width";

inquirer.registerPrompt("path", PathPrompt);
InterruptedPrompt.fromAll(inquirer);

export class ClientQuestions {
  private static instance: ClientQuestions | null = null;

  public static getInstance(): ClientQuestions {
    if (!this.instance) {
      this.instance = new ClientQuestions();
    }
    return this.instance;
  }

  public async input_path(message: string): Promise<string> {
    console.clear();
    const { path } = await inquirer.prompt([
      { type: "path", name: "path", message, default: process.cwd() },
    ]);
    return path;
  }

  public async confirm(message: string): Promise<boolean> {
    const { bool } = await inquirer.prompt([{ message, type: "confirm", name: "bool" }]);
    return bool;
  }

  public async input(message: string) {
    const { answer } = await inquirer.prompt([
      {
        type: "input",
        name: "answer",
        message,
      },
    ]);
    return answer.trim();
  }

  public async rename(previousName: string) {
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

  public async main_questions(
    items: { name: string; value: string; mimeType: string }[],
    storageSize: { totalStorage: number; usedStorage: number } | null
  ) {
    console.clear();
    const answer = await interactiveList({
      message: "Your root folder/files: ",
      sufix: `Used ${storageSize?.usedStorage}MB of ${storageSize?.totalStorage}GB`,
      choices: [
        ...items.map((file) => ({
          name: `${file.name} ${
            file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""
          }`,
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
        name: "fileName",
        type: "list",
        pageSize: 10,
        // choices: [{ type: "separator" }, ...folders],
        choices: folders,
      },
    ]);
    return fileName;
  }

  public async folder_questions(
    files: drive_v3.Schema$File[],
    folderName: string
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

    if (files.length > 0) {
      const answer = await interactiveList({
        message: `Select file or choose the action (keys) for folder ${chalk.blueBright.underline(
          folderName
        )}: `,
        pageSize: 10,
        choices: [
          ...files.map((file) => ({
            name: `${file.name} ${
              file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""
            }`,
            value: file,
          })),
        ],
        actionMsg: `Folder actions:`,
        actions: keyActions,
      });
      return answer;
    } else {
      const { res } = await inquirer.prompt([
        {
          message: `The folder ${chalk.blueBright(
            folderName
          )} is empty. Choose action for folder:\n`,
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
    return answer.trim() as FileActions;
  }

  public async delete_questions(): Promise<DeleteOpts> {
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
    return answer.trim() as DeleteOpts;
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
    const answer = await interactiveList({
      message: "Select trash action or select action: ",
      pageSize: 12,
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

  public async item_operation() {
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
