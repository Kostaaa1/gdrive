import { ClientQuestions } from "../service/ClientQuestions.js";
import { GoogleDriveService } from "../service/GoogleDriveService.js";
import NodeCache from "node-cache";

const expiryCache = new NodeCache({ stdTTL: 240 });
const cache = new NodeCache();
const questions = new ClientQuestions();
const gdrive = new GoogleDriveService();

export { questions, gdrive, cache, expiryCache };
