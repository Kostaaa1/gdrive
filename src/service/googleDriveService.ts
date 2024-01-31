import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { GaxiosPromise } from "gaxios";
import { drive_v3, google } from "googleapis";
import readline from "readline-sync";
import { convertUrlToStream } from "../utils/utils.js";

const {
  GOOGLE_CLIENT_ID = "",
  GOOGLE_CLIENT_SECRET = "",
  GOOGLE_REDIRECT_URL = "",
} = process.env;

const { refresh_token } = JSON.parse(readFileSync("./token.json", "utf-8"));

export class GoogleDriveService {
  private drive_client: drive_v3.Drive;
  private oatuh2Client;

  private static clientId = GOOGLE_CLIENT_ID;
  private static clientSecret = GOOGLE_CLIENT_SECRET;
  private static redirectUri = GOOGLE_REDIRECT_URL;
  private static refreshToken = refresh_token;

  public constructor() {
    const { clientId, clientSecret, redirectUri, refreshToken } = GoogleDriveService;
    this.oatuh2Client = this.createOAuthClient(clientId, clientSecret, redirectUri);
    this.drive_client = this.createDriveClient(refreshToken);
  }

  createOAuthClient(clientId: string, clientSecret: string, redirectUri: string) {
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    return client;
  }

  createDriveClient(refresh_token: string) {
    this.oatuh2Client.setCredentials({ refresh_token });
    return google.drive({ version: "v3", auth: this.oatuh2Client });
  }

  private async isAccessGranted(): Promise<boolean> {
    try {
      const token = await this.oatuh2Client.getAccessToken();
      return token.res?.status === 200;
    } catch (err) {
      return false;
    }
  }

  public async authorize() {
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

  public async getRootFolders(): Promise<{ name: string; value: string }[] | undefined> {
    const res = await this.drive_client.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and 'root' in parents",
      fields: "files(id, name)",
    });
    const folders = res.data.files;
    if (folders && folders?.length > 0) {
      return folders.map((x) => x.name && { name: x.name, value: x.name }) as {
        name: string;
        value: string;
      }[];
    }
  }

  public async getFolderContent(folderId: string): Promise<drive_v3.Schema$File[]> {
    try {
      const res = await this.drive_client.files.list({
        q: `'${folderId}' in parents`,
        // fields: "files(id)",
      });

      const files = res.data.files;
      if (!files) throw new Error("Error occured when trying to get the folder content");

      return files;
    } catch (error) {
      console.log(error);
      throw new Error(`Error while getting folder files: ${error}`);
    }
  }

  private async getFileCountInFolder(folderId: string): Promise<number> {
    const files = await this.getFolderContent(folderId);
    return files.length;
  }

  public async fileExists(folderId: string, name: string): Promise<boolean> {
    try {
      const folder = await this.drive_client.files.list({
        q: `'${folderId}' in parents and name='${name}'`,
        fields: "files(id)",
      });

      const { files } = folder.data;
      return files!.length > 0;
    } catch (error) {
      throw new Error("Error at fileExists");
    }
  }

  public async getFolderIdWithName(folderName: string): Promise<string> {
    try {
      const response = await this.drive_client.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
        fields: "files(id)",
      });

      const file = response.data.files?.[0];
      if (file && file.id) {
        return file.id;
      } else {
        console.log(`No folder found with name ${folderName}, creating it...`);
        const id = await this.createFolder(folderName);
        return id;
      }
    } catch (err) {
      console.error(`Error searching for folder: ${err}`);
      throw new Error(`Error searching for folder: ${err}`);
    }
  }

  public async createFolder(folderName: string): Promise<string> {
    // Returns created folder id (if needed, change the return data)
    const response = await this.drive_client.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    return response.data.id as string;
  }

  public async renameFolder(new_name: string, folder_id: string): Promise<void> {
    try {
      const res = await this.drive_client.files.update({
        fileId: folder_id,
        requestBody: {
          name: new_name,
        },
      });
    } catch (error) {
      throw new Error(`Error while renaming a folder: ${error}`);
    }
  }

  public async deleteFolder(folderId: string): Promise<GaxiosPromise<void> | null> {
    const response = await this.drive_client.files.delete({
      fileId: folderId,
    });
    return response;
  }

  public async emptyTrash() {
    const response = await this.drive_client.files.emptyTrash({});
    return response;
  }

  public async uploadSingleFile(
    file_name: string,
    stream: any,
    folderId: string,
    mimeType?: string
  ): Promise<void> {
    const isIncluded = await this.fileExists(folderId, file_name);
    if (!isIncluded) {
      await this.drive_client.files.create({
        requestBody: {
          name: file_name,
          mimeType,
          parents: [folderId],
        },
        media: {
          body: stream,
          mimeType,
        },
      });
    }
  }

  // TUserPost[]
  public async uploadMultipleFiles(posts: any[], folderId: string) {
    return new Promise(async (resolve, reject) => {
      try {
        for (let i = 0; i < posts.length; i++) {
          const { url, id: fileName } = posts[i];
          const data = await convertUrlToStream(url);
          // await this.uploadSingleFile(fileName, data, folderId);
          resolve(true);
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}
