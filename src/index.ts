import "dotenv/config";
import select from "@inquirer/select";
import { input } from "@inquirer/prompts";
import { FolderActions, MainActions } from "./types/types.js";
import { GoogleDriveService } from "./service/googleDriveService.js";
import open from "open";
import { createSpinner } from "nanospinner";
import { ClientQuestions } from "./service/clientQuestions.js";

const googleDrive = new GoogleDriveService();
const clientQuestions = new ClientQuestions();

const handleFileActions = async (selected_folder: { name: string; id: string }) => {
  console.clear();
  const { id } = selected_folder;
  const files = await googleDrive.getFolderContent(id);
  const file_actions = await select({
    message: "Select File",
    choices: [
      ...files.map((file) => ({ name: file.name, value: file })),
      { name: "👈Back", value: { name: "BACK" } },
    ],
  });
  if (file_actions.name === "BACK") {
    handleFolderActions();
    return;
  }

  if (file_actions.mimeType === "application/vnd.google-apps.folder") {
    handleFolderActions(file_actions.name);
  } else {
    console.log("Handle file");
    const file_action_choice = await clientQuestions.askFileQuestions(file_actions.name);
    console.log(file_action_choice);
  }
};

const handleFolderActions = async (name?: string) => {
  console.clear();
  let folder_name;

  if (!name) {
    const folders = await googleDrive.getFolders();
    if (!folders || folders.length === 0) return;
    folder_name = await select({
      message: "Folders: ",
      choices: [...folders, { name: "👈Back", value: "BACK" }],
    });

    if (folder_name === "BACK") {
      handleMainActions();
      return;
    }
  } else {
    folder_name = name;
  }

  const folder_id = await googleDrive.getFolderIdWithName(folder_name);
  const selected_folder = { name: folder_name, id: folder_id };
  const folder_action = await select({
    message: `Choose action for folder ${selected_folder.name}: `,
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

  switch (folder_action as FolderActions) {
    case "RENAME":
      const new_name = await input({ message: `Rename folder ${selected_folder.name}: ` });
      await googleDrive.renameFolder(new_name, selected_folder.id);
      handleFolderActions();
      break;
    case "READ":
      handleFileActions(selected_folder);
      break;
    case "UPLOAD_FILE":
      const file_name = await input({ message: "Provide the name of the new file: " });
      const file_path = await input({
        message: "Provide the location of the file on your machine: ",
      });
      await googleDrive.uploadSingleFile(file_name.trim(), file_path.trim(), selected_folder.id);
      handleFolderActions();
      break;
    case "DELETE":
      console.log("Deleting folder...");
      await googleDrive.deleteFolder(selected_folder.id);
      handleFolderActions();
      break;
    case "CREATE":
      const new_folder = await input({ message: "Enter new folder name: " });
      await googleDrive.createFolder(new_folder.trim(), selected_folder.id);
      handleFolderActions();
      break;
    case "BACK":
      handleMainActions();
      break;
    default:
  }
};
// /mnt/c/Users/kosta/OneDrive/Desktop/imgs/4b0a345f-59b0-4084-b55d-87277db3bdf5_OmariJazz_holy_sword_wielded_by_hooded_scion_mage_thrusting_while_t-posing_in_the_air_with_a_full_moon_behind_.png
const handleMainActions = async () => {
  console.clear();
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

  switch (init_action as MainActions) {
    case "CREATE":
      const new_folder = await input({ message: "Enter new folder name: " });
      await googleDrive.createFolder(new_folder.trim());
      handleMainActions();
      break;
    case "READ":
      handleFolderActions();
      break;
    case "OPEN_DRIVE":
      handleMainActions();
      open("https://drive.google.com/drive/u/0/my-drive");
      break;
    case "EXIT":
      process.exit();
  }
};

(async () => {
  await googleDrive.authorize();
  handleMainActions();
})();
