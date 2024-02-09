import { createWriteStream, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { drive_v3, google } from "googleapis";
import readline from "readline-sync";
import {
  convertBytes,
  convertUrlToStream,
  formatDate,
  parseFileExtension,
} from "../utils/utils.js";

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
      q: "mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
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

  public async listFolderFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
    try {
      const res = await this.drive_client.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: "files(id, name, mimeType, size)",
      });
      return res.data.files || [];
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  private async getFileCountInFolder(folderId: string): Promise<number> {
    const files = await this.listFolderFiles(folderId);
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

  public async createFolder(folder_name: string, folder_id?: string): Promise<string> {
    // Returns created folder id (if needed, change the return data)
    const requestBody: { name: string; mimeType: string; parents?: string[] } = {
      name: folder_name,
      mimeType: "application/vnd.google-apps.folder",
    };
    if (folder_id) requestBody.parents = [folder_id];
    const response = await this.drive_client.files.create({
      requestBody,
      fields: "id",
    });
    return response.data.id as string;
  }

  public async moveFile(file_id: string, folder_id: string) {
    try {
      const file = await this.drive_client.files.get({
        fileId: file_id,
        fields: "parents",
      });
      const previousParents = file?.data.parents!!.join(",");
      const files = await this.drive_client.files.update({
        fileId: file_id,
        addParents: folder_id,
        removeParents: previousParents,
        fields: "id, parents",
      });

      console.log(files.status);
      return files.status;
    } catch (error) {
      console.log(error);
    }
  }

  public async downloadFile(
    path: string,
    driveFileId: string
    // fileName: string,
    // mimeType: string
  ) {
    try {
      const fileStream = createWriteStream(path);
      const file = await this.drive_client.files.get(
        { fileId: driveFileId, alt: "media" },
        { responseType: "stream" }
      );

      file.data.pipe(fileStream);
    } catch (error) {
      throw new Error(`Download failed: ${error}`);
    }
  }

  public async rename(new_name: string, id: string): Promise<void> {
    try {
      await this.drive_client.files.update({
        fileId: id,
        requestBody: {
          name: new_name,
        },
      });
    } catch (error) {
      throw new Error(`Error while renaming a folder: ${error}`);
    }
  }

  public async deleteFolder(folderId: string): Promise<void> {
    try {
      await this.drive_client.files.delete({
        fileId: folderId,
      });
    } catch (error) {
      console.error(error);
    }
  }

  public async moveToTrash(fileId: string): Promise<void> {
    try {
      await this.drive_client.files.update({
        fileId,
        requestBody: {
          trashed: true,
        },
      });
    } catch (err) {
      console.error(err);
    }
  }

  public async uploadSingleFile(
    file_name: string,
    stream: any,
    folderId: string | null,
    mimeType: string
  ): Promise<void> {
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

  public async printFileInfo(id: string) {
    const res = await this.drive_client.files.get({
      fileId: id,
      fields: "name, mimeType, size, createdTime",
    });
    const file = res.data;
    const { name, mimeType, size, createdTime } = file;
    const convertedSize = convertBytes(size!);

    console.log(
      "Info:\n",
      "Id:",
      `${id}\n`,
      "Name:",
      `${name}\n`,
      "Size:",
      `${convertedSize}\n`,
      "Type:",
      `${mimeType}\n`,
      "Created time:",
      `${formatDate(createdTime!)}\n`
    );
  }

  // TRASH:
  public async deleteAllForever() {
    const response = await this.drive_client.files.emptyTrash({});
    return response;
  }

  public async untrashAll(files: drive_v3.Schema$File[]) {
    console.log(files);
    // for (const file in files) {
    //   console.log(file);
    // }
    for (const file of files) {
      await this.drive_client.files.update({ fileId: file.id!, requestBody: { trashed: false } });
    }
  }

  public async listFilesInTrash(): Promise<drive_v3.Schema$File[]> {
    const res = await this.drive_client.files.list({
      q: "trashed=true",
      fields: "files(id, name, mimeType)",
    });

    const files = res.data.files;
    return files && files.length > 0 ? files : [];
  }
}
