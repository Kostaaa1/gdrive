import {
  DeleteOpts,
  FileActions,
  FolderActions,
  ItemOperations,
  MainActions,
  ScrapingOpts,
  TFile,
  TFolder,
  TrashActions,
  UploadActions,
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

  public async input(message: string, validate?: () => boolean): Promise<string> {
    const { answer } = await inquirer.prompt([
      {
        type: "input",
        name: "answer",
        message,
        validate,
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
      sufix: chalk.gray("Press <ESC> to return"),
    });
    if (action == "EVENT_INTERRUPTED") throw new Error(action);
    return { selectedItems: selected, action };
  }

  public async upload_questions(): Promise<UploadActions> {
    console.clear();
    const answer = await interactiveList<UploadActions>({
      message: "Your root folder/files: ",
      choices: [
        {
          name: "Upload from local machine",
          value: "PATH",
          description: "Provide the path to the folder/file that you want to upload",
        },
        {
          name: "Upload from url",
          value: "URL",
          description: "Upload from the url. Such as pdf documents, images, videos.",
        },
        {
          name: "Scrape the webpage via url",
          value: "SCRAPE",
          description: "Scrape content from webpage, such as images, videos, pdfs",
        },
      ],
      sufix: chalk.gray("Press <ESC> to return"),
    });
    if (answer === "EVENT_INTERRUPTED") throw new Error(answer);
    return answer;
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
          name: "Upload from your machine or from other sources",
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

    const answer = await interactiveList<TFile, FolderActions>({
      message,
      choices: [
        ...files.map((file) => ({
          name: `${file.name} ${isGdriveFolder(file.mimeType) ? chalk.gray("(folder)") : ""}`,
          value: file,
        })),
      ],
      actionMsg: "Folder actions:",
      actions: [
        {
          name: "Upload from your machine or from other sources",
          value: "UPLOAD",
          key: "u",
        },
        { name: "Download folder", value: "DOWNLOAD", key: "z" },
        { name: "Move folder", value: "MOVE", key: "m" },
        { name: "Rename folder", value: "RENAME", key: "r" },
        { name: "Operate with items", value: "ITEM_OPERATIONS", key: "o" },
        { name: "Delete folder", value: "DELETE", key: "d" },
        { name: "Move folder to trash", value: "TRASH", key: "t" },
        {
          name: "Create new empty folder",
          value: "CREATE",
          key: "n",
        },
      ],
      sufix: chalk.gray("Press <ESC> to return"),
    });

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
      sufix: chalk.gray("Press <ESC> to return"),
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
      sufix: chalk.gray("Press <ESC> to return"),
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
        { name: "Move", value: "MOVE" },
      ],
      sufix: chalk.gray("Press <ESC> to return"),
    });
    if (answer === "EVENT_INTERRUPTED") throw new Error(answer);
    return answer;
  }

  public async scraping_questions(): Promise<{
    url: string;
    types: ScrapingOpts[];
    name: string | null;
    duration: number | null;
  }> {
    const { url } = await inquirer.prompt({
      message: "Enter the URL of the webpage you want to scrape: ",
      name: "url",
      type: "input",
      validate: (input: any) => {
        try {
          new URL(input);
          return true;
        } catch (error) {
          console.log(`\n${chalk.red("Input is invalid. URL input is needed.")}`);
          return false;
        }
      },
    });
    const { bool } = await inquirer.prompt([
      {
        message: "Do you want to create new folder for scraped files?",
        type: "confirm",
        name: "bool",
      },
    ]);
    let name: string | null = null;
    if (bool) {
      const res = await inquirer.prompt({
        message: "The name for new folder: ",
        name: "name",
        type: "input",
      });
      name = res.name;
    }
    const durationType = await interactiveList<"LIMIT" | "FULL">({
      message: "Select: ",
      choices: [
        {
          name: "Limited scrape",
          value: "LIMIT",
          description: "You will be asked to provide a duration of scraping process (seconds).",
        },
        {
          name: "Full scrape",
          value: "FULL",
          description: "Full scrape. Scrape all URLs from page.",
        },
      ],
      sufix: null,
      includeSeperators: false,
    });
    let duration: number | null = null;
    if (durationType === "LIMIT") {
      const res = await inquirer.prompt({
        message: `Enter the duration of the scraping action ${chalk.gray(
          "(in seconds, recommended 5-15 seconds)"
        )}: `,
        name: "duration",
        type: "input",
        default: () => {},
        validate: (input: any) => {
          if (!isNaN(input)) {
            return true;
          } else {
            console.log(`\n${chalk.red("Incorrect input. Please provide a number")}`);
            return false;
          }
        },
      });
      duration = res.duration;
    }

    const selectMedia = async () => {
      const data = await checkboxPrompt<ScrapingOpts>({
        message: "Select the media you want to get: ",
        choices: [
          { name: "Images", value: "IMAGE" },
          { name: "Videos", value: "VIDEO" },
        ],
      });
      return data;
    };

    const selected = await selectMedia();
    if (selected.length === 0) {
      await notify("No items selected, make sure you have selected items in order to proceed.");
      await selectMedia();
    }
    if (durationType === "EVENT_INTERRUPTED") throw new Error(durationType);
    return { url, duration: duration ? duration * 1000 : null, name, types: selected };
  }

  public async move_questions(folders: TFolder[]) {
    console.clear();
    const res = await interactiveList({
      message: "Where do you want to move the item: ",
      choices: folders.map((x) => ({ ...x, name: x.path, value: x })),
      sufix: chalk.gray("Press <ESC> to return"),
    });
    if (res === "EVENT_INTERRUPTED") throw new Error(res);
    return res;
  }

  public async batch_item_operation(
    files: TFile[]
  ): Promise<{ selected: TFile[]; operation: ItemOperations; cpath?: string }> {
    const selected = await this.checkbox("Select item: ", files);
    const operation = await this.item_operation();
    let cpath: string | undefined = undefined;

    if (operation === "DOWNLOAD") {
      cpath = await this.input_path("Provide a path where to store the items: ");
    }

    return { selected, operation, cpath };
  }
}
