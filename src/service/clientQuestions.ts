import { input, select } from "@inquirer/prompts";
import {
  DeleteOpts,
  FileActions,
  FolderActions,
  MainActions,
  TrashActions,
  UploadOpts,
} from "../types/types.js";
import chalk from "chalk";

export class ClientQuestions {
  public async question(data: Parameters<typeof input>[0]) {
    const choice = await input(data);
    return choice.trim();
  }

  public async delete_questions(): Promise<DeleteOpts> {
    const answer = await select<DeleteOpts>({
      message: "Do you want to permanently delete seleceted or move it to trash",
      choices: [
        {
          name: "Move it to trash",
          value: "TRASH",
          description:
            "The selected will be relocated from current location to trash (The selected will be automatically deleted after 30 days.)",
        },
        { name: "Permanently delete", value: "DELETE", description: "Permanently delete." },
        { name: "Back", value: "BACK" },
      ],
    });
    return answer.trim() as DeleteOpts;
  }

  public async main_questions(): Promise<MainActions> {
    const answer = await select<MainActions>({
      message: "Choose Action:",
      choices: [
        {
          name: "List all folders",
          value: "LIST",
          description: "Get a list of all root folders",
        },
        {
          name: "New folder",
          value: "CREATE",
          description: "Create new folder at root",
        },

        {
          name: "Manage Trash",
          value: "TRASH",
          description: "Manage Trash (clear trash, restore folder/files, get list of items)",
        },
        {
          name: "Open Google Drive",
          value: "OPEN_DRIVE",
          description: "Opens Google Drive in your default browser",
        },
        {
          name: "Exit",
          value: "EXIT",
        },
      ],
    });
    return answer.trim() as MainActions;
  }

  public async trash_questions(): Promise<TrashActions> {
    const choice = await select<TrashActions>({
      message: "Choose Trash Action",
      choices: [
        {
          name: "List Content",
          value: "LIST",
          description: "Lists folder/files that are in trash",
        },
        { name: "Empty trash", value: "EMPTY_ALL", description: "Removes all items from trash" },
        {
          name: "Empty selected item",
          value: "EMPTY",
          description: "Removes selected item from trash",
        },
        {
          name: "Restore selected item",
          value: "RESTORE",
          description: "Restores selected item",
        },
        { name: "Restore All items", value: "RESTORE_ALL", description: "Restores all items." },
      ],
    });
    return choice.trim() as TrashActions;
  }

  public async uplooad_questions(): Promise<UploadOpts> {
    const choice = await select<UploadOpts>({
      message: `Upload:`,
      choices: [
        {
          name: "📁 File",
          value: "FILE",
          description: "Upload single file (file path required)",
        },
        {
          name: "📂 Folder",
          value: "FOLDER",
          description: "Upload folder with files (Folder path required)",
        },
        { name: "Back", value: "BACK" },
      ],
    });
    return choice.trim() as UploadOpts;
  }

  public async folder_questions(folder_name: string): Promise<FolderActions> {
    const action = await select<FolderActions>({
      message: `📂 Choose action for folder ${chalk.cyan.underline(folder_name)}: `,
      choices: [
        { name: "Get Folder Content", value: "LIST" },
        { name: "Rename Folder", value: "RENAME" },
        {
          name: "Delete Folder",
          value: "DELETE",
          description: "Permanently delete or move to trash.",
        },
        {
          name: "Create folder",
          value: "CREATE",
          description: "Creates new folder with the selected folder as root",
        },
        { name: "Upload folder/file", value: "UPLOAD", description: "Upload a folder/file" },
        { name: "Back", value: "BACK" },
      ],
    });
    return action.trim() as FolderActions;
  }

  public async file_questions(folder_content: string): Promise<FileActions> {
    const file_action = await select<FileActions>({
      message: `📁 Choose action for file ${chalk.cyan.underline(folder_content)}: `,
      choices: [
        { name: "Rename file", value: "RENAME" },
        { name: "Delete file", value: "DELETE", description: "Delete selected file." },
        { name: "Download file", value: "DOWNLOAD" },
        { name: "Get file information", value: "INFO" },
        // { name: "Open File", value: "OPEN" },
        // { name: "Move File", value: "MOVE" },
        { name: "Back", value: "BACK" },
      ],
    });
    return file_action.trim() as FileActions;
  }
}
