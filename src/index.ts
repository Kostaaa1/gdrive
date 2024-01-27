import "dotenv/config";
import { GoogleDriveService } from "./service/googleDriveService";
import select, { Separator } from "@inquirer/select";
import { input } from "@inquirer/prompts";
import Choice from "inquirer/lib/objects/choice";
import { FolderActions, SpecifiedFolderActions } from "./types/types";

const googleDrive = new GoogleDriveService();
(async () => {
  await googleDrive.authorize();

  const answer = await select<FolderActions>({
    message: "Choose Action:",
    choices: [
      {
        name: "Create new folder",
        value: "CREATE",
      },
      {
        name: "Read all folders",
        value: "READ",
      },
    ],
  });

  switch (answer) {
    case "CREATE":
      const a = await input({ message: "Enter new folder name: " });
      console.log("now Should create folder with name: ", a);
      break;
    case "READ":
      const folders = await googleDrive.getFolders();
      console.log("List folders: ", folders);

      if (!folders || folders.length === 0) return;
      const selected_folder = await select({
        message: "Folders: ",
        choices: folders,
      });

      const folder_action = await select<SpecifiedFolderActions>({
        message: "Choose action:",
        choices: [
          { name: "Edit Folder Name", value: "RENAME" },
          { name: "Read Files", value: "READ" },
          { name: "Delete Folder", value: "DELETE" },
          { name: "Create Folder", value: "CREATE" },
          { name: "Back", value: "BACK" },
        ],
      });

      switch (folder_action) {
        case "RENAME":
          console.log("Update the folder");
          break;
        case "READ":
          console.log("List files");
          const folderId = await googleDrive.getFolderIdWithName(selected_folder);
          const files = await googleDrive.getFolderFiles(folderId);

          const fAnswer = select({
            message: "Select File",
            choices: files as any,
          });
          break;
        case "DELETE":
          console.log("delete folder");
          break;
        case "CREATE":
          console.log("Create new folder");
          break;
      }
      break;
  }
})();
