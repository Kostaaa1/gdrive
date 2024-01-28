import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { google } from "googleapis";
import readline from "readline-sync";
import { convertUrlToStream } from "../utils/utils.js";
const { GOOGLE_CLIENT_ID = "", GOOGLE_CLIENT_SECRET = "", GOOGLE_REDIRECT_URL = "", GOOGLE_TOKEN_ENDPOINT = "", } = process.env;
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
    async getFolders() {
        const res = await this.drive_client.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and 'root' in parents",
            fields: "files(id, name)",
        });
        const folders = res.data.files;
        if (folders && folders?.length > 0) {
            return folders.map((x) => x.name && { name: x.name, value: x.name });
        }
    }
    async createChildFolder(new_name, folder_id) { }
    async getFolderContent(folderId) {
        try {
            const res = await this.drive_client.files.list({
                q: `'${folderId}' in parents`,
                // fields: "files(id)",
            });
            const content = res.data.files;
            if (!content)
                throw new Error("Error occured!");
            return content;
        }
        catch (error) {
            console.log(error);
            throw new Error(`Error while getting folder files: ${error}`);
        }
    }
    async getFileCountInFolder(folderId) {
        const files = await this.getFolderContent(folderId);
        return files.length;
    }
    async fileExists(folder_name, name) {
        try {
            const folderId = await this.getFolderIdWithName(folder_name);
            const folder = await this.drive_client.files.list({
                q: `'${folderId}' in parents and name='${name}'`,
                fields: "files(id)",
            });
            return folder.data.files && folder.data.files.length > 0;
        }
        catch (error) {
            console.log(error);
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
                const { id } = await this.createFolder(folderName);
                if (id) {
                    return id;
                }
                else {
                    throw new Error("Failed to create folder or get folder ID");
                }
            }
        }
        catch (err) {
            console.error(`Error searching for folder: ${err}`);
            throw new Error(`Error searching for folder: ${err}`);
        }
    }
    async createFolder(folderName, parentFolderId) {
        const requestBody = {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
        };
        if (parentFolderId) {
            requestBody.parents = [parentFolderId];
        }
        const response = await this.drive_client.files.create({
            requestBody,
            fields: "id",
        });
        return response.data;
    }
    async renameFolder(new_name, folder_id) {
        try {
            const res = await this.drive_client.files.update({
                fileId: folder_id,
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
        if (folderId) {
            const response = await this.drive_client.files.delete({
                fileId: folderId,
            });
            return response;
        }
        else {
            return null;
        }
    }
    async emptyTrash() {
        const response = await this.drive_client.files.emptyTrash({});
        console.log("Deleted trash", response);
        return response;
    }
    async uploadSingleFile(name, stream, folderId) {
        console.log("Uploading: ", name);
        return await this.drive_client.files.create({
            requestBody: {
                name,
                mimeType: "image/jpg",
                parents: [folderId],
            },
            media: {
                mimeType: "image/jpg",
                body: stream,
            },
        });
    }
    // TUserPost[]
    async uploadMultipleFiles(posts, folderId) {
        return new Promise(async (resolve, reject) => {
            try {
                for (let i = 0; i < posts.length; i++) {
                    const { url, id: fileName } = posts[i];
                    const data = await convertUrlToStream(url);
                    await this.uploadSingleFile(fileName, data, folderId);
                    resolve(true);
                }
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
GoogleDriveService.clientId = GOOGLE_CLIENT_ID;
GoogleDriveService.clientSecret = GOOGLE_CLIENT_SECRET;
GoogleDriveService.redirectUri = GOOGLE_REDIRECT_URL;
GoogleDriveService.refreshToken = refresh_token;
//# sourceMappingURL=googleDriveService.js.map