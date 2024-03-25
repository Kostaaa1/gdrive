import {
  DeleteOpts,
  FileActions,
  FolderActions,
  ItemOperations,
  MainActions,
  TFile,
  TrashActions,
} from "../types/types.js";
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
import type { KeyDescriptor } from "inquirer-press-to-continue";

inquirer.registerPrompt("path", PathPrompt);
inquirer.registerPrompt("press-to-continue", inquirerPressToContinue);
InterruptedPrompt.fromAll(inquirer);

export class ClientQuestions {
  public async input_path(message: string): Promise<string> {
    // if (clearConsole) console.clear();
    const { path } = await inquirer.prompt([
      { type: "path", name: "path", message, default: process.cwd() },
    ]);

    if (!existsSync(path)) {
      await notify(
        "The path that you provided is incorrect. Make sure you are providing valid path."
      );
      await this.input_path(message);
    }

    return path;
  }

  public async pressKeyToContinue() {
    await inquirer.prompt<{ key: KeyDescriptor }>({
      name: "key",
      type: "press-to-continue",
      anyKey: true,
      pressToContinueMessage: "Press any key to continue...",
    });
  }

  public async areYouSure(message: string): Promise<boolean> {
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

  public async checkbox(message: string, items: TFile[]): Promise<TFile[]> {
    console.clear();
    const selected = await checkboxPrompt({
      message,
      choices: items.map(
        (item) =>
          item && {
            ...item,
            name: `${item.name} ${isGdriveFolder(item.mimeType) ? chalk.gray("(folder)") : ""}`,
            value: item,
          }
      ),
    });

    if (selected.length === 0) {
      await notify("No items selected, make sure you have selected items in order to proceed.");
      await this.checkbox(message, items);
    }
    return selected;
  }

  public async trash_questions(
    items: TFile[]
  ): Promise<{ selectedItems: TFile[]; action: TrashActions }> {
    console.clear();
    const selected = await this.checkbox("Select items: ", items);
    const action = await interactiveList<TrashActions>({
      message: "Choose action for trash: ",
      choices: [
        { name: "Recover selected items", value: "RECOVER" },
        { name: "Delete selected items", value: "DELETE" },
      ],
    });
    if (action == "EVENT_INTERRUPTED") throw new Error(action);
    return { selectedItems: selected, action };
  }

  public async main_questions(
    items: TFile[],
    storageSizeMsg: string | undefined
  ): Promise<TFile | MainActions> {
    console.clear();
    const answer = await interactiveList<TFile, MainActions>({
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

    if (answer === "EVENT_INTERRUPTED") throw new Error(answer);
    return answer;
  }

  public async folder_questions(
    files: TFile[],
    folderName: string
  ): Promise<FolderActions | TFile> {
    console.clear();
    const folderMsg = `${chalk.blueBright.underline(folderName)}`;

    const message =
      files.length > 1
        ? `Choose file or choose the action for folder ${folderMsg}: `
        : files.length === 1
        ? `Choose action for folder ${folderMsg}: `
        : `The folder ${folderMsg} is empty. Choose action: `;

    let answer;
    if (files.length > 0) {
      answer = await interactiveList<TFile, FolderActions>({
        message,
        choices: [
          ...files.map((file) => ({
            name: `${file.name} ${
              file.mimeType === "application/vnd.google-apps.folder" ? chalk.gray("(folder)") : ""
            }`,
            value: file,
          })),
        ],
        actionMsg: `Folder actions:`,
        actions: [
          // { name: "Go to next page", value: "NEXT_PAGE", key: "a" },
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
    } else {
      answer = await interactiveList<FolderActions>({
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
    if (answer === "EVENT_INTERRUPTED") throw new Error(answer);
    return answer;
  }

  public async selected_item(folder_content: string): Promise<FileActions> {
    console.clear();
    const answer = await interactiveList<FileActions>({
      message: `Choose file operation for ${chalk.blueBright.underline(folder_content)}: `,
      choices: [
        { name: "Rename", value: "RENAME", description: "Change the name of the file." },
        {
          name: "Delete",
          value: "DELETE",
          description: "Deletes the file forever.",
        },
        {
          name: "Trash",
          value: "TRASH",
          description:
            "Moves the file to the trash. You will be able to recover it in the next 30 days.",
        },
        {
          name: "Download",
          value: "DOWNLOAD",
          description:
            "Download the file, you will be asked to provide the path where you want to store it.",
        },
        {
          name: "Open file in browser",
          value: "OPEN",
          description: "Opens the file in your default set browser.",
        },
        {
          name: "Information about file",
          value: "INFO",
          description:
            "Information about file. Such as size, name, id, mimeType, date of file creation",
        },
      ],
    });
    if (answer === "EVENT_INTERRUPTED") throw new Error(answer);
    return answer;
  }

  public async delete_questions(): Promise<DeleteOpts> {
    console.clear();
    const answer = await interactiveList<DeleteOpts>({
      message: "Do you want to permanently delete seleceted item or move it to trash",
      choices: [
        {
          name: "Move it to trash",
          value: "TRASH",
        },
        { name: "Delete forever", value: "DELETE" },
      ],
    });
    if (answer === "EVENT_INTERRUPTED") throw new Error(answer);
    return answer;
  }

  public async item_operation(): Promise<ItemOperations> {
    const answer = await interactiveList<ItemOperations>({
      message: "📁 Choose folder/file operation: ",
      choices: [
        { name: "Delete", value: "DELETE" },
        { name: "Trash", value: "TRASH" },
        { name: "Download", value: "DOWNLOAD" },
      ],
    });
    if (answer === "EVENT_INTERRUPTED") throw new Error(answer);
    return answer;
  }
}
