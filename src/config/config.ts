import { ClientQuestions } from "../service/ClientQuestions.js";
import { GoogleDriveService } from "../service/GoogleDriveService.js";

const questions = new ClientQuestions();
const gdrive = new GoogleDriveService();

export { questions, gdrive };
