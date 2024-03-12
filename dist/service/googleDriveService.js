import { createWriteStream, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { google } from "googleapis";
import readline from "readline-sync";
import { convertBytes, formatDate } from "../utils/utils.js";
const { GOOGLE_CLIENT_ID = "", GOOGLE_CLIENT_SECRET = "", GOOGLE_REDIRECT_URL = "", } = process.env;
const { refresh_token } = JSON.parse(readFileSync("./token.json", "utf-8"));
export class GoogleDriveService {
    constructor() {
        const { clientId, clientSecret, redirectUri, refreshToken } = GoogleDriveService;
        this.oauth2Client = this.createOAuthClient(clientId, clientSecret, redirectUri);
        this.drive_client = this.createDriveClient(refreshToken);
        this.authorize();
    }
    createOAuthClient(clientId, clientSecret, redirectUri) {
        const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        return client;
    }
    createDriveClient(refresh_token) {
        this.oauth2Client.setCredentials({ refresh_token });
        return google.drive({ version: "v3", auth: this.oauth2Client });
    }
    async isAccessGranted() {
        try {
            const token = await this.oauth2Client.getAccessToken();
            return token.res?.status === 200;
        }
        catch (err) {
            return false;
        }
    }
    async authorize() {
        const isGranted = await this.isAccessGranted();
        if (!isGranted) {
            const authUrl = this.oauth2Client.generateAuthUrl({
                access_type: "offline",
                scope: ["https://www.googleapis.com/auth/drive"],
            });
            console.log("Visit this URL, and copy Authorization code: \n", authUrl);
            const code = readline.question("Paste authorization code here: ");
            const { tokens } = await this.oauth2Client.getToken(code);
            await writeFile("./token.json", JSON.stringify(tokens));
            this.oauth2Client.setCredentials(tokens);
        }
    }
    static getInstance() {
        if (!GoogleDriveService.instance) {
            GoogleDriveService.instance = new GoogleDriveService();
        }
        return GoogleDriveService.instance;
    }
    async getRootItems() {
        const res = await this.drive_client.files.list({
            q: "((mimeType='application/vnd.google-apps.folder' and 'root' in parents) or ('root' in parents and mimeType!='application/vnd.google-apps.folder')) and trashed=false",
            fields: "files(id, name, mimeType)",
        });
        const folders = res.data.files;
        if (folders && folders?.length > 0) {
            return folders.map((x) => x.name && { name: x.name, value: x.name, mimeType: x.mimeType, id: x.id });
        }
        else {
            return [];
        }
    }
    async getRootFolders() {
        const res = await this.drive_client.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
            fields: "files(id, name)",
        });
        const folders = res.data.files;
        if (folders && folders?.length > 0) {
            return folders.map((x) => x.name && { name: x.name, value: x.name });
        }
        else {
            return [];
        }
    }
    async listFolderFiles(folderId) {
        try {
            const res = await this.drive_client.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                fields: "files(id, name, mimeType, size)",
            });
            return res.data.files || [];
        }
        catch (error) {
            console.log(error);
            return [];
        }
    }
    async getFileCountInFolder(folderId) {
        const files = await this.listFolderFiles(folderId);
        return files.length;
    }
    async fileExists(folderId, name) {
        try {
            const folder = await this.drive_client.files.list({
                q: `'${folderId}' in parents and name='${name}'`,
                fields: "files(id)",
            });
            const { files } = folder.data;
            return files.length > 0;
        }
        catch (error) {
            throw new Error("Error at fileExists");
        }
    }
    async getFolderIdWithName(folderName) {
        try {
            const response = await this.drive_client.files.list({
                q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
                fields: "files(id)",
            });
            const folder = response.data.files?.[0];
            if (folder && folder.id) {
                return folder.id;
            }
            else {
                console.log(`No folder found with name ${folderName}, creating it...`);
                const id = await this.createFolder(folderName);
                return id;
            }
        }
        catch (err) {
            console.error(`Error searching for folder: ${err}`);
            throw new Error(`Error searching for folder: ${err}`);
        }
    }
    async getFolderNameWithId(id) {
        const res = await this.drive_client.files.get({ fileId: id, fields: "name" });
        return res.data.name;
    }
    async getAllFolders() {
        const res = await this.drive_client.files.list({
            q: "mimeType='application/vnd.google-apps.folder'",
            fields: "files(id, name, parents)",
        });
        const files = res.data.files;
        const stack = [];
        for (const file of files) {
            const parents = file.parents;
            let base = "";
            for (const parentId of parents) {
                const name = await this.getFolderNameWithId(parentId);
                base += "/" + (name === "My Drive" ? "" : name);
            }
            delete file.parents;
            stack.push({
                id: file.id,
                name: file.name,
                path: base + (base.endsWith("/") ? file.name : `/${file.name}`),
            });
        }
        return stack;
    }
    async createFolder(folder_name, folder_id) {
        const requestBody = {
            name: folder_name,
            mimeType: "application/vnd.google-apps.folder",
        };
        if (folder_id)
            requestBody.parents = [folder_id];
        const response = await this.drive_client.files.create({
            requestBody,
            fields: "id",
        });
        return response.data.id;
    }
    async moveFile(file_id, folder_id) {
        try {
            const file = await this.drive_client.files.get({
                fileId: file_id,
                fields: "parents",
            });
            const previousParents = file?.data.parents.join(",");
            await this.drive_client.files.update({
                fileId: file_id,
                addParents: folder_id,
                removeParents: previousParents,
                fields: "id, parents",
            });
        }
        catch (error) {
            console.log(error);
        }
    }
    async downloadFile(path, driveFileId) {
        try {
            const fileStream = createWriteStream(path);
            const file = await this.drive_client.files.get({ fileId: driveFileId, alt: "media" }, { responseType: "stream" });
            file.data.pipe(fileStream);
        }
        catch (error) {
            throw new Error(`Download failed: ${error}`);
        }
    }
    async rename(new_name, id) {
        try {
            await this.drive_client.files.update({
                fileId: id,
                requestBody: {
                    name: new_name,
                },
            });
        }
        catch (error) {
            throw new Error(`Error while renaming a folder: ${error}`);
        }
    }
    async deleteItem(folderId) {
        try {
            await this.drive_client.files.delete({
                fileId: folderId,
            });
        }
        catch (error) {
            console.error(error);
        }
    }
    async moveToTrash(fileId) {
        try {
            await this.drive_client.files.update({
                fileId,
                requestBody: {
                    trashed: true,
                },
            });
        }
        catch (err) {
            console.error(err);
        }
    }
    async uploadSingleFile(name, stream, mimeType, folderId) {
        try {
            // const name = mimeType ? parseFileExtension(file_name, mimeType) : file_name;
            // const exists = await this.fileExists(folderId, file_name); // Avoid duplicats ?
            await this.drive_client.files.create({
                requestBody: {
                    name,
                    mimeType,
                    parents: folderId ? [folderId] : null,
                },
                media: {
                    body: stream,
                    mimeType,
                },
            });
        }
        catch (error) {
            console.error(error);
        }
    }
    async printFileInfo(id) {
        const res = await this.drive_client.files.get({
            fileId: id,
            fields: "name, mimeType, size, createdTime",
        });
        const file = res.data;
        const { name, mimeType, size, createdTime } = file;
        const convertedSize = convertBytes(size);
        console.log("Info:\n", "Id:", `${id}\n`, "Name:", `${name}\n`, "Size:", `${convertedSize}\n`, "MimeType:", `${mimeType}\n`, "Created time:", `${formatDate(createdTime)}\n`);
    }
    // TRASH:
    async deleteTrashForever() {
        const response = await this.drive_client.files.emptyTrash({});
        return response;
    }
    async untrashAll(files) {
        for (const file of files) {
            await this.drive_client.files.update({ fileId: file.id, requestBody: { trashed: false } });
        }
    }
    async listTrashFiles() {
        const res = await this.drive_client.files.list({
            q: "trashed=true",
            fields: "files(id, name, mimeType)",
        });
        const files = res.data.files;
        return files && files.length > 0 ? files : [];
    }
    async getDriveStorageSize() {
        try {
            const driveInfo = await this.drive_client.about.get({
                fields: "storageQuota",
            });
            // @ts-ignore
            const { limit, usage } = driveInfo.data.storageQuota;
            const totalStorage = parseFloat(limit) / (1024 * 1024 * 1024);
            const usedStorage = +(parseFloat(usage) / (1024 * 1024)).toFixed(2);
            return { usedStorage, totalStorage };
        }
        catch (err) {
            console.log(err);
            return null;
        }
    }
}
GoogleDriveService.clientId = GOOGLE_CLIENT_ID;
GoogleDriveService.clientSecret = GOOGLE_CLIENT_SECRET;
GoogleDriveService.redirectUri = GOOGLE_REDIRECT_URL;
GoogleDriveService.refreshToken = refresh_token;
GoogleDriveService.instance = null;
//# sourceMappingURL=googleDriveService.js.map