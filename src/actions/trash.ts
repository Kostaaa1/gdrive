import pLimit from "p-limit";
import { cache, gdrive, questions } from "../config/config.js";
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
    const cancel = { value: false };
    const { progressBar } = initProgressBar(selectedItems.length, cancel);

    const limit = pLimit(8);
    if (selectedItems.length === trashItems.length && action === "DELETE") {
      await gdrive.emptyTrash();
    } else {
      const tasks = selectedItems.map(({ id }) => {
        return limit(async () => {
          if (cancel.value) throw new Error("Process terminated");
          if (action === "RECOVER") {
            await gdrive.recoverTrashItem(id);
            cache.flushAll();
          } else if (action === "DELETE") {
            await gdrive.deleteItem(id);
          }
          progressBar.increment();
        });
      });
      await Promise.all(tasks);
      progressBar.stop();
    }

    await processMainActions();
  } catch (error) {
    await processMainActions();
  }
};
