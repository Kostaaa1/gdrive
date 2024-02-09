import {
  DeleteOpts,
  FileActions,
  FolderActions,
  MainActions,
  NewFolderActions,
  TrashActions,
  TrashItemActions,
  UploadOpts,
} from "../types/types.js";
import chalk from "chalk";
import type { drive_v3 } from "googleapis";
import inquirer from "inquirer";
import InterruptedPrompt from "inquirer-interrupted-prompt";

// @ts-ignore
import prompt from "inquirer-interactive-list-prompt";

InterruptedPrompt.fromAll(inquirer);

export class ClientQuestions {
  public async confirm(message: string): Promise<boolean> {
    console.clear();
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
        prefix: chalk.gray(" Press <ESC> to return back\n"),
      },
    ]);
    return answer.trim();
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
    }[]
  ): Promise<string> {
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

  public async folder_questions_2(folder_name: string): Promise<FolderActions> {
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
    return answer.trim() as FolderActions;
  }

  public async new_folder_questions(): Promise<NewFolderActions> {
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

  public async file_questions_1(folder_content: string): Promise<FileActions> {
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
    return answer.trim() as FileActions;
  }

  public async select_file(files: drive_v3.Schema$File[]): Promise<drive_v3.Schema$File> {
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
    return answer.trim() as DeleteOpts;
  }

  public async upload_questions(): Promise<UploadOpts> {
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
    return answer.trim() as UploadOpts;
  }

  public async select_trash_file(files: drive_v3.Schema$File[]): Promise<TrashActions> {
    console.clear();
    const { answer } = await inquirer.prompt([
      {
        type: "list",
        pageSize: 10,
        message: `Choose ${chalk.blueBright("Trash")} Action: `,
        prefix: chalk.gray(" Press <ESC> to return back\n"),
        name: "answer",
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
    return answer.trim() as TrashActions;
  }

  public async trash_file_actions(): Promise<TrashItemActions> {
    console.clear();
    const { answer } = await inquirer.prompt([
      {
        type: "list",
        name: "answer",
        message: "Restore the item or delete it forever",
        prefix: chalk.gray(" Press <ESC> to return back\n"),
        choices: [
          { name: "Restore item", value: "RESTORE" },
          { name: "Delete it forever", value: "DELETE" },
        ],
      },
    ]);
    return answer;
  }

  public async test(files: drive_v3.Schema$File[]) {
    console.clear();
    const answer = await prompt({
      message: "Select an option:",
      choices: [
        ...files.map((file, id) => ({
          name: `${file.name} ${
            file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""
          }`,
          value: file,
        })),
        { name: "Restore all items", value: "run", key: "r" },
        { name: "Delete all items forever", value: "delete", key: "d" },
      ],
      renderSelected: (choice: any) =>
        `${chalk.blueBright(` ❯ ${choice.name}  ${choice.key ? "(" + choice.key + ")" : ""}`)}`,
      renderUnselected: (choice: any) =>
        ` ${choice.name}  ${choice.key ? "(" + choice.key + ")" : ""}`,
    });

    console.log(answer);
    return answer;
  }

  public async trash_questions(): Promise<TrashActions> {
    console.clear();
    const { answer } = await inquirer.prompt([
      {
        type: "list",
        pageSize: 10,
        message: `Choose ${chalk.blueBright("Trash")} Action: `,
        prefix: chalk.gray(" Press <ESC> to return back\n"),
        name: "answer",
        choices: [
          { type: "separator" },
          {
            name: "List items",
            value: "LIST",
          },
          {
            name: "Delete all forever",
            value: "DELETE",
          },
          {
            name: "Restore all items",
            value: "RESTORE",
          },
        ],
      },
    ]);
    return answer.trim() as TrashActions;
  }
}
