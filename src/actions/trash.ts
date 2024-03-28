import { googleDrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
import { notify } from "../utils/utils.js";

export const processTrashActions = async () => {
  try {
    const trashItems = await googleDrive.listTrashFiles();
    if (trashItems.length === 0) {
      await notify("Trash is empty!", 500);
      await processMainActions();
    }

    const { selectedItems, action } = await questions.trash_questions(trashItems);
    if (selectedItems.length === trashItems.length) {
      if (action === "DELETE") await googleDrive.emptyTrash();
    } else {
      for (const item of selectedItems) {
        switch (action) {
          case "RECOVER":
            await googleDrive.recoverTrashItem(item.id);
            break;
          case "DELETE":
            await googleDrive.deleteItem(item.id);
            break;
        }
      }
    }

    await processMainActions();
  } catch (error) {
    await processMainActions();
  }
};
