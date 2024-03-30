import { createWriteStream, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { drive_v3, google } from "googleapis";
import readline from "readline-sync";
import { convertBytes, formatDate, formatStorageQuotaMessage, stop } from "../utils/utils.js";
import { TFile, TFolder, TUploadFile } from "../types/types.js";

const {
  GOOGLE_CLIENT_ID = "",
  GOOGLE_CLIENT_SECRET = "",
  GOOGLE_REDIRECT_URL = "",
} = process.env;

const { refresh_token } = JSON.parse(readFileSync("./token.json", "utf-8"));
// const itemFileds = "fields(id, name, mimeType)";

export class GoogleDriveService {
  public drive_client: drive_v3.Drive;
  private oauth2Client;

  private static clientId = GOOGLE_CLIENT_ID;
  private static clientSecret = GOOGLE_CLIENT_SECRET;
  private static redirectUri = GOOGLE_REDIRECT_URL;
  private static refreshToken = refresh_token;

  public constructor() {
    const { clientId, clientSecret, redirectUri, refreshToken } = GoogleDriveService;
    this.oauth2Client = this.createOAuthClient(clientId, clientSecret, redirectUri);
    this.drive_client = this.createDriveClient(refreshToken);
    this.authorize();
  }

  createOAuthClient(clientId: string, clientSecret: string, redirectUri: string) {
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    return client;
  }

  createDriveClient(refresh_token: string) {
    this.oauth2Client.setCredentials({ refresh_token });
    return google.drive({ version: "v3", auth: this.oauth2Client });
  }

  private async isAccessGranted(): Promise<boolean> {
    try {
      const token = await this.oauth2Client.getAccessToken();
      return token.res?.status === 200;
    } catch (err) {
      return false;
    }
  }

  public async authorize() {
    const isGranted = await this.isAccessGranted();
    if (!isGranted) {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive"],
      });
      console.log("Visit this URL, and copy Authorization code:\n", authUrl);
      const code = readline.question("Paste authorization code here: ");

      const { tokens } = await this.oauth2Client.getToken(code);
      await writeFile("./token.json", JSON.stringify(tokens));
      this.oauth2Client.setCredentials(tokens);
    }
  }

  public async getRootItems(): Promise<TFile[]> {
    const res = await this.drive_client.files.list({
      q: "((mimeType='application/vnd.google-apps.folder' and 'root' in parents) or ('root' in parents and mimeType!='application/vnd.google-apps.folder')) and trashed=false",
      fields: "files(id, name, mimeType)",
    });

    const folders = res.data.files as TFile[];
    return folders.length
      ? folders?.map((x) => ({ name: x.name, value: x.name, mimeType: x.mimeType, id: x.id }))
      : [];
  }

  // public async getRootFolders(): Promise<TFile[]> {
  //   const res = await this.drive_client.files.list({
  //     q: "mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
  //     fields: "files(id, name, mimeType)",
  //   });
  //   const folders = res.data.files as TFile[];
  //   return folders.length > 0
  //     ? folders.map((x) => ({ name: x.name, value: x.name, mimeType: x.mimeType, id: x.id }))
  //     : [];
  // }

  public async updateFileName(fileId: string, newName: string) {
    /// update name
  }

  public async getFolderItems(
    folderId: string,
    pageToken?: string,
    pageSize: number = 300
  ): Promise<{ files: TFile[]; nextPageToken: string | null | undefined }> {
    const res = await this.drive_client.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken,files(id, name, mimeType)",
      orderBy: "folder",
      pageSize,
      pageToken,
    });

    const nextPageToken = res.data.nextPageToken;
    const files = res.data.files;

    return { files: files as TFile[], nextPageToken };
  }

  public async getFileCountInFolder(folderId: string): Promise<number> {
    const res = await this.getFolderItems(folderId);
    return res.files.length;
  }

  // public async fileExists(folderId: string, name: string): Promise<boolean> {
  //   try {
  //     const folder = await this.drive_client.files.list({
  //       q: `'${folderId}' in parents and name='${name}'`,
  //       fields: "nextPageToken, files(id)",
  //     });
  //     const { files } = folder.data;
  //     return files!.length > 0;
  //   } catch (error) {
  //     throw new Error("Error at fileExists");
  //   }
  // }

  public async getFolderIdWithName(name: string, parentId?: string): Promise<string> {
    try {
      const res = await this.drive_client.files.list({
        q: parentId
          ? `'${parentId}' in parents and `
          : "" +
            `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`,

        fields: "files(id)",
      });
      const files = res.data.files;

      const folder = files?.[files.length - 1];
      if (folder && folder.id) {
        return folder.id;
      } else {
        console.log(`No folder found with name ${name}, creating it...`);
        const id = await this.createFolder(name);
        return id;
      }
    } catch (err) {
      console.error(`Error searching for folder: ${err}`);
      throw new Error(`Error searching for folder: ${err}`);
    }
  }

  public async recoverTrashItem(fileId: string): Promise<void> {
    try {
      await this.drive_client.files.update({
        fileId,
        requestBody: { trashed: false },
      });
    } catch (err) {
      console.log(err);
    }
  }

  public async getFolderNameWithId(id: string): Promise<string> {
    const res = await this.drive_client.files.get({ fileId: id, fields: "name" });
    if (!res.data.name) {
      throw new Error("Error while getting the name of the items: " + id);
    }
    return res.data.name;
  }

  public async getDriveFolders(filterId?: string) {
    const folders: { id: string; name: string; path: string }[] = [];

    const getSubFolders = async (folderId: string, prevPath: string = "") => {
      const res = await this.drive_client.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
      });
      const files = res.data.files!;

      await Promise.all(
        files.map(async (file) => {
          const { id, name } = file;
          if (!file || !id || !name || id === filterId) return;
          const newPath = prevPath + "/" + name;
          folders.push({ id, name, path: newPath });
          await getSubFolders(id, newPath);
        })
      );
    };

    await getSubFolders("root");
    folders.push({ id: "", name: "root", path: "/" });
    return folders;
  }

  /**
   * Creates a new folder in Google Drive.
   * @param folder_name The name of the folder to create.
   * @param folder_id The ID of the parent folder. Optional.
   * @returns The ID of the created folder.
   */
  public async createFolder(folder_name: string, folder_id?: string): Promise<string> {
    try {
      const requestBody: { name: string; mimeType: string; parents?: string[] } = {
        name: folder_name,
        mimeType: "application/vnd.google-apps.folder",
      };

      if (folder_id) requestBody.parents = [folder_id];
      const {
        data: { id },
      } = await this.drive_client.files.create({
        requestBody,
        fields: "id",
      });

      if (!id) throw new Error("Error while creating a folder!");
      return id;
    } catch (error) {
      throw new Error(`Error while creating a folder! ${error}`);
    }
  }

  public async moveFile(file_id: string, folder_id?: string) {
    try {
      const file = await this.drive_client.files.get({
        fileId: file_id,
        fields: "parents",
      });

      const previousParents = file?.data.parents!.join(",");
      await this.drive_client.files.update({
        fileId: file_id,
        addParents: folder_id,
        removeParents: previousParents,
        fields: "id, parents",
      });
    } catch (error: any) {
      throw new Error(error);
    }
  }

  public async downloadFile(path: string, fileId: string) {
    try {
      const fileStream = createWriteStream(path);
      const file = await this.drive_client.files.get(
        { fileId: fileId, alt: "media" },
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

  public async deleteItem(fileId: string): Promise<void> {
    try {
      await this.drive_client.files.delete({
        fileId,
      });
    } catch (error) {
      console.error("Error failed", error);
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
      console.error("Moving to trash failed: ", err);
    }
  }

  public async uploadSingleFile(uploadFile: TUploadFile) {
    try {
      const { name, stream, fileSize, parentId, mimeType } = uploadFile;
      await this.drive_client.files.create({
        requestBody: {
          name,
          mimeType,
          parents: parentId ? [parentId] : null,
        },
        media: {
          body: stream,
          mimeType,
        },
      });
    } catch (error) {
      console.log("Error while uploading to google drive", error);
    }
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
      "MimeType:",
      `${mimeType}\n`,
      "Created time:",
      `${formatDate(createdTime!)}\n`
    );
  }

  // TRASH:
  public async emptyTrash() {
    const response = await this.drive_client.files.emptyTrash({});
    return response;
  }

  public async untrashAll(files: TFile[]) {
    for (const file of files) {
      await this.drive_client.files.update({ fileId: file.id, requestBody: { trashed: false } });
    }
  }

  public async listTrashFiles(): Promise<TFile[]> {
    const res = await this.drive_client.files.list({
      q: "trashed=true",
      fields: "files(id, name, mimeType)",
    });

    const files = res.data.files;
    return files && files.length > 0 ? (files as TFile[]) : [];
  }

  public async getDriveStorageSize(): Promise<string | undefined> {
    try {
      const driveInfo = await this.drive_client.about.get({
        fields: "storageQuota",
      });
      const { limit, usage, usageInDrive, usageInDriveTrash } = driveInfo.data.storageQuota!!;

      if (limit && usage && usageInDrive && usageInDriveTrash) {
        const data = { limit, usage, usageInDrive, usageInDriveTrash };
        return formatStorageQuotaMessage(data);
      }

      return undefined;
    } catch (err) {
      console.log(err);
      return undefined;
    }
  }
}
