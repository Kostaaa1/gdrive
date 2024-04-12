import pLimit from "p-limit";
import { cache, gdrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
import { initProgressBar, notify } from "../utils/utils.js";
import { addCacheItem } from "../store/store.js";

export const processTrashActions = async () => {
  try {
    const trashItems = await gdrive.listTrashFiles();
    if (trashItems.length === 0) {
      await notify("Trash is empty!", 500);
      await processMainActions();
    }

    const { selectedItems, action } = await questions.trash_questions(trashItems);
    const {
      progressBar,
      cancel: { value },
    } = initProgressBar(selectedItems.length);

    const limit = pLimit(4);
    if (selectedItems.length === trashItems.length && action === "DELETE") {
      await gdrive.emptyTrash();
    } else {
      const processes = selectedItems.map(({ id }) => {
        return limit(async () => {
          if (value) return;
          if (action === "RECOVER") {
            const parentId = await gdrive.recoverTrashItem(id);
            cache.del(parentId);
          } else if (action === "DELETE") {
            await gdrive.deleteItem(id);
          }
          if (!value) progressBar.increment();
        });
      });
      await Promise.all(processes);
      progressBar.stop();
    }

    await processMainActions();
  } catch (error) {
    await processMainActions();
  }
};
