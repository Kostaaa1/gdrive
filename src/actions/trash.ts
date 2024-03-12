import type { drive_v3 } from "googleapis";
import { TrashActions } from "../types/types.js";
import { notify } from "../utils/utils.js";
import type { GoogleDriveService } from "../service/googleDriveService.js";
import { googleDrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";

const processTrashFile = async (
  fileId: string,
  googleDrive: GoogleDriveService,
  trash_file_question: () => Promise<TrashActions>
) => {
  try {
    const choice = await trash_file_question();
    const data = {
      RESTORE: async () => {
        await googleDrive.drive_client.files.update({
          fileId,
          requestBody: { trashed: false },
        });
      },
      DELETE: async () => {
        await googleDrive.drive_client.files.delete({ fileId: fileId });
      },
    };
    await data[choice]();
    await processTrashActions();
  } catch (error) {
    await processTrashActions();
  }
};

export const processTrashActions = async () => {
  try {
    const { trash_questions, trash_file_question } = questions;

    const items = await googleDrive.listTrashFiles();
    if (items.length === 0) {
      await notify("Trash is empty!");
      await processMainActions();
    } else {
      const answer = await trash_questions(items);
      if (answer) {
        switch (answer) {
          case "DELETE":
            await googleDrive.deleteTrashForever();
            await processMainActions();
            break;
          case "RESTORE":
            await googleDrive.untrashAll(items);
            await processMainActions();
            break;
          default:
            const file: drive_v3.Schema$File = answer;
            await processTrashFile(file.id!, googleDrive, trash_file_question);
            break;
        }
      } else {
        await processMainActions();
      }
    }
  } catch (error) {
    await processMainActions();
  }
};
