import { ClientQuestions } from "../service/ClientQuestions.js";
import { GoogleDriveService } from "../service/GoogleDriveService.js";

const questions = new ClientQuestions();
const googleDrive = new GoogleDriveService();

export { questions, googleDrive };
