import { ClientQuestions } from "../service/clientQuestions.js";
import { GoogleDriveService } from "../service/googleDriveService.js";

const questions = new ClientQuestions();
const googleDrive = new GoogleDriveService();

export { questions, googleDrive };
