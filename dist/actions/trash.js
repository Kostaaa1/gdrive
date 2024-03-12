import { notify } from "../utils/utils.js";
import { googleDrive, questions } from "../config/config.js";
import { processMainActions } from "../index.js";
const processTrashFile = async (fileId, googleDrive, trash_file_question) => {
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
    }
    catch (error) {
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
        }
        else {
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
                        const file = answer;
                        await processTrashFile(file.id, googleDrive, trash_file_question);
                        break;
                }
            }
            else {
                await processMainActions();
            }
        }
    }
    catch (error) {
        await processMainActions();
    }
};
//# sourceMappingURL=trash.js.map