import { gdrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
import { initProgressBar, notify } from "../utils/utils.js";

export const processTrashActions = async () => {
  try {
    const trashItems = await gdrive.listTrashFiles();
    if (trashItems.length === 0) {
      await notify("Trash is empty!", 500);
      await processMainActions();
    }

    const { selectedItems, action } = await questions.trash_questions(trashItems);
    const progressBar = initProgressBar(selectedItems.length);

    if (selectedItems.length === trashItems.length && action === "DELETE") {
      await gdrive.emptyTrash();
    } else {
      const processes = selectedItems.map(async ({ id }) => {
        if (action === "RECOVER") {
          await gdrive.recoverTrashItem(id);
        } else if (action === "DELETE") {
          await gdrive.deleteItem(id);
        }
        progressBar.increment();
      });
      await Promise.all(processes);
      progressBar.stop();
    }

    await processMainActions();
  } catch (error) {
    await processMainActions();
  }
};
