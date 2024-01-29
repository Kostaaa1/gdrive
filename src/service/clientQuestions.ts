import { input, select } from "@inquirer/prompts";

export class ClientQuestions {
  public async askQuestion(message) {
    const res = await input({ message });
    return res.trim();
  }

  public async askMainQuestions() {
    const init_action = await select({
      message: "Choose Action:",
      choices: [
        {
          name: "New folder",
          value: "CREATE",
          description: "Create new folder at root",
        },
        {
          name: "Read all folders",
          value: "READ",
          description: "Get all root folders",
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
    return init_action.trim();
  }

  public async askFolderQuestions(folder_name: string) {
    const folder_action = await select({
      message: `Choose action for folder ${folder_name}: `,
      choices: [
        { name: "Rename Folder", value: "RENAME" },
        { name: "Get Folder Content", value: "READ" },
        { name: "Delete Folder", value: "DELETE" },
        {
          name: "New Folder",
          value: "CREATE",
          description: "Creates new folder inside selected folder",
        },
        {
          name: "Upload file",
          value: "UPLOAD_FILE",
          description: "Upload single file (file path required)",
        },
        {
          name: "Upload folder",
          value: "UPLOAD_FOLDER",
          description: "Upload folder with files (Folder path required)",
        },
        { name: "👈Back", value: "BACK" },
      ],
    });
    return folder_action.trim();
  }

  public async askFileQuestions(folder_content: string) {
    const folder_action = await select({
      message: `Choose action for folder ${folder_content}: `,
      choices: [
        { name: "Rename File", value: "RENAME" },
        { name: "Delete File", value: "DELETE", description: "Delete selected file." },
        // { name: "Open File", value: "OPEN" },
        { name: "Move File", value: "MOVE" },
        { name: "👈Back", value: "BACK" },
      ],
    });
    return folder_action.trim();
  }
}
