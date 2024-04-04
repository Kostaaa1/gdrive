import { ClientQuestions } from "../service/ClientQuestions.js";
import { GoogleDriveService } from "../service/GoogleDriveService.js";
import NodeCache from "node-cache";

const cache = new NodeCache();
const questions = new ClientQuestions();
const gdrive = new GoogleDriveService();

export { questions, gdrive, cache };
