import { googleDrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
export const processTrashActions = async () => {
    try {
        const trashItems = await googleDrive.listTrashFiles();
        const { selectedItems, action } = await questions.trash_questions(trashItems);
        for (const item of selectedItems) {
            switch (action) {
                case "RECOVER":
                    await googleDrive.recoverTrashItem(item.id);
                    break;
                case "DELETE":
                    await googleDrive.deleteItem(item.id);
                    break;
                default:
                    break;
            }
        }
        await processMainActions();
    }
    catch (error) {
        await processMainActions();
    }
};
//# sourceMappingURL=trash.js.map