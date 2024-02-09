import { createWriteStream, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { google } from "googleapis";
import readline from "readline-sync";
import { convertBytes, formatDate, parseFileExtension, } from "../utils/utils.js";
const { GOOGLE_CLIENT_ID = "", GOOGLE_CLIENT_SECRET = "", GOOGLE_REDIRECT_URL = "", } = process.env;
const { refresh_token } = JSON.parse(readFileSync("./token.json", "utf-8"));
export class GoogleDriveService {
    constructor() {
        const { clientId, clientSecret, redirectUri, refreshToken } = GoogleDriveService;
        this.oatuh2Client = this.createOAuthClient(clientId, clientSecret, redirectUri);
        this.drive_client = this.createDriveClient(refreshToken);
    }
    createOAuthClient(clientId, clientSecret, redirectUri) {
        const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        return client;
    }
    createDriveClient(refresh_token) {
        this.oatuh2Client.setCredentials({ refresh_token });
        return google.drive({ version: "v3", auth: this.oatuh2Client });
    }
    async isAccessGranted() {
        try {
            const token = await this.oatuh2Client.getAccessToken();
            return token.res?.status === 200;
        }
        catch (err) {
            return false;
        }
    }
    async authorize() {
        const isGranted = await this.isAccessGranted();
        if (!isGranted) {
            const authUrl = this.oatuh2Client.generateAuthUrl({
                access_type: "offline",
                scope: ["https://www.googleapis.com/auth/drive"],
            });
            console.log("Visit this URL, and copy Authorization code: \n", authUrl);
            const code = readline.question("Paste authorization code here: ");
            const { tokens } = await this.oatuh2Client.getToken(code);
            await writeFile("./token.json", JSON.stringify(tokens));
            this.oatuh2Client.setCredentials(tokens);
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
            const file = response.data.files?.[0];
            if (file && file.id) {
                return file.id;
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
    async createFolder(folder_name, folder_id) {
        // Returns created folder id (if needed, change the return data)
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
            const files = await this.drive_client.files.update({
                fileId: file_id,
                addParents: folder_id,
                removeParents: previousParents,
                fields: "id, parents",
            });
            console.log(files.status);
            return files.status;
        }
        catch (error) {
            console.log(error);
        }
    }
    async downloadFile(path, driveFileId
    // fileName: string,
    // mimeType: string
    ) {
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
    async deleteFolder(folderId) {
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
    async uploadSingleFile(file_name, stream, folderId, mimeType) {
        const name = mimeType ? parseFileExtension(file_name, mimeType) : file_name;
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
    async printFileInfo(id) {
        const res = await this.drive_client.files.get({
            fileId: id,
            fields: "name, mimeType, size, createdTime",
        });
        const file = res.data;
        const { name, mimeType, size, createdTime } = file;
        const convertedSize = convertBytes(size);
        console.log("Info:\n", "Id:", `${id}\n`, "Name:", `${name}\n`, "Size:", `${convertedSize}\n`, "Type:", `${mimeType}\n`, "Created time:", `${formatDate(createdTime)}\n`);
    }
    // TRASH:
    async deleteAllForever() {
        const response = await this.drive_client.files.emptyTrash({});
        return response;
    }
    async untrashAll(files) {
        console.log(files);
        // for (const file in files) {
        //   console.log(file);
        // }
        for (const file of files) {
            await this.drive_client.files.update({ fileId: file.id, requestBody: { trashed: false } });
        }
    }
    async listFilesInTrash() {
        const res = await this.drive_client.files.list({
            q: "trashed=true",
            fields: "files(id, name, mimeType)",
        });
        const files = res.data.files;
        return files && files.length > 0 ? files : [];
    }
}
GoogleDriveService.clientId = GOOGLE_CLIENT_ID;
GoogleDriveService.clientSecret = GOOGLE_CLIENT_SECRET;
GoogleDriveService.redirectUri = GOOGLE_REDIRECT_URL;
GoogleDriveService.refreshToken = refresh_token;
//# sourceMappingURL=googleDriveService.js.map