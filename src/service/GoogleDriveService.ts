import { createWriteStream, readFileSync } from "fs";
import { writeFile, readFile } from "fs/promises";
import { drive_v3, google } from "googleapis";
import readline from "readline-sync";
import { convertBytes, formatDate, formatStorageQuotaMessage, stop } from "../utils/utils.js";
import { TFile, TFolder, TUploadFile } from "../types/types.js";
import pLimit from "p-limit";
import InteractiveList from "../custom/InteractiveList.mjs";

const {
  GOOGLE_CLIENT_ID = "",
  GOOGLE_CLIENT_SECRET = "",
  GOOGLE_REDIRECT_URL = "",
} = process.env;

type Token = {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
};

// const { refresh_token } = JSON.parse(readFileSync("./tokens/googleDriveToken.json", "utf-8"));
// const itemFileds = "fields(id, name, mimeType)";

export class GoogleDriveService {
  public drive_client: drive_v3.Drive;
  private oauth2Client;
  private tokens: string = "";

  private static clientId = GOOGLE_CLIENT_ID;
  private static clientSecret = GOOGLE_CLIENT_SECRET;
  private static redirectUri = GOOGLE_REDIRECT_URL;

  public constructor() {
    const { clientId, clientSecret, redirectUri } = GoogleDriveService;
    this.oauth2Client = this.createOAuthClient(clientId, clientSecret, redirectUri);
    this.drive_client = google.drive({ version: "v3", auth: this.oauth2Client });
  }

  createOAuthClient(clientId: string, clientSecret: string, redirectUri: string) {
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    return client;
  }

  private async isAccessGranted(): Promise<boolean> {
    try {
      const token = await this.oauth2Client.getAccessToken();
      return token.res?.status === 200;
    } catch (err) {
      return false;
    }
  }

  public async authorize(user: string) {
    let isGranted: boolean = false;
    if (user) {
      const { refresh_token }: Token = JSON.parse(this.tokens)[user];
      this.oauth2Client.setCredentials({ refresh_token });
      isGranted = await this.isAccessGranted();
    }

    if (!isGranted) {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive"],
      });

      console.log("Visit this URL, and copy Authorization code:\n", authUrl);
      const code = readline.question("Paste authorization code here: ");
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      const {
        data: { user },
      } = await this.drive_client.about.get({
        fields: "user(emailAddress)",
      });

      if (user) {
        const data: { [key: string]: typeof tokens } = { ...JSON.parse(this.tokens) };
        data[user.emailAddress ?? user.displayName!] = tokens;
        await writeFile("./tokens/googleDriveToken.json", JSON.stringify(data));
      }
    }
  }

  public async logIn() {
    console.clear();
    const userTokens = await readFile("./tokens/googleDriveToken.json", "utf-8");
    let selectedUser: string = "";
    this.tokens = userTokens || JSON.stringify({});

    if (userTokens) {
      const parsed = JSON.parse(userTokens);
      selectedUser = await InteractiveList({
        message: "Choose action for trash: ",
        choices: [
          ...Object.keys(parsed).map((username) => ({
            name: username,
            value: username,
          })),
          { name: "New user", value: "" },
        ],
      });
    }
    await this.authorize(selectedUser);
  }

  public async getRootItems(): Promise<TFile[]> {
    const res = await this.drive_client.files.list({
      q: "((mimeType='application/vnd.google-apps.folder' and 'root' in parents) or ('root' in parents and mimeType!='application/vnd.google-apps.folder')) and trashed=false",
      fields: "files(id, name, mimeType)",
    });

    const folders = res.data.files as TFile[];
    return folders.length
      ? folders?.map(({ name, mimeType, id }) => ({ name, value: name, mimeType, id }))
      : [];
  }

  public async getFolderItems(folderId?: string, pageSize: number = 800): Promise<TFile[]> {
    console.log("Get folder items called? ");
    const res = await this.drive_client.files.list({
      q: `'${folderId || "root"}' in parents and trashed=false`,
      fields: "files(id, name, mimeType)",
      orderBy: "folder",
      pageSize,
    });
    const files = res.data.files;
    if (!files) throw new Error("e");
    return files as TFile[];
  }

  public async getFileCountInFolder(folderId: string): Promise<number> {
    const files = await this.getFolderItems(folderId);
    return files.length;
  }
  public async getFolderIdWithName(name: string, parentId?: string): Promise<string> {
    try {
      const res = await this.drive_client.files.list({
        q: `'${
          parentId || "root"
        }' in parents and mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`,
        fields: "files(id)",
      });
      const files = res.data.files;
      const folder = files?.[files.length - 1];

      if (folder && folder.id) {
        return folder.id;
      } else {
        console.log(`No folder found with name ${name}, creating it...`);
        const { id } = await this.createFolder(name);
        return id;
      }
    } catch (err) {
      console.error(`Error searching for folder: ${err}`);
      throw new Error(`Error searching for folder: ${err}`);
    }
  }

  public async recoverTrashItem(fileId: string): Promise<string> {
    try {
      const res = await this.drive_client.files.update({
        fileId,
        requestBody: { trashed: false },
        fields: "parents",
      });

      if (!res.data.parents || res.data.parents.length === 0) {
        throw new Error(`Recover of item failed, maybe parents missing?`);
      }

      return res.data.parents![0];
    } catch (err) {
      throw new Error(`Error while recovering the item ${err}`);
    }
  }

  public async getFolderNameWithId(id: string): Promise<string> {
    const res = await this.drive_client.files.get({ fileId: id, fields: "name" });
    if (!res.data.name) {
      throw new Error("Error while getting the name of the items: " + id);
    }
    return res.data.name;
  }

  public async getItem(id: string): Promise<TFile> {
    const { data } = await this.drive_client.files.get({
      fileId: id,
      fields: "*",
    });
    if (!data) throw new Error("Error while getting the name of the items: " + id);
    return { name: data.name, id: data.id, mimeType: data.mimeType } as TFile;
  }

  public async getDriveFolders(filterId?: string) {
    const folders: TFolder[] = [{ id: "root", name: "root", path: "/", mimeType: "" }];
    const getSubFolders = async (folderId: string, prevPath: string = "") => {
      const res = await this.drive_client.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name, mimeType)",
      });
      const files = res.data.files!;

      const limit = pLimit(50);
      const processes = files.map((file) => {
        return limit(async () => {
          const { id, name, mimeType } = file;
          if (id === filterId) return;
          const newPath = prevPath + "/" + name;
          await getSubFolders(id!, newPath);
          folders.push({ id: id!, name: name!, mimeType: mimeType!, path: newPath });
        });
      });
      await Promise.all(processes);
    };

    await getSubFolders("root");
    return folders.sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Creates a new folder in Google Drive.
   * @param folder_name The name of the folder to create.
   * @param folder_id The ID of the parent folder. Optional.
   * @returns The ID of the created folder.
   */
  public async createFolder(folder_name: string, folder_id?: string): Promise<TFile> {
    try {
      const requestBody: { name: string; mimeType: string; parents?: string[] } = {
        name: folder_name,
        mimeType: "application/vnd.google-apps.folder",
      };

      if (folder_id) requestBody.parents = [folder_id];
      const { data } = await this.drive_client.files.create({
        requestBody,
        fields: "*",
      });

      if (!data) throw new Error("Error while creating a folder!");
      return { id: data.id!, name: data.name!, mimeType: data.mimeType! };
      // if (!id) throw new Error("Error while creating a folder!");
      // return id;
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

  // Change it to return only readable stream
  public async downloadFile(filePath: string, fileId: string) {
    try {
      const fileStream = createWriteStream(filePath);
      const file = await this.drive_client.files.get(
        { fileId: fileId, alt: "media" },
        { responseType: "stream" }
      );
      file.data.pipe(fileStream);
    } catch (error) {
      throw new Error(`Download failed: ${error}`);
    }
  }

  public async rename(newName: string, id: string): Promise<TFile> {
    try {
      const res = await this.drive_client.files.update({
        fileId: id,
        requestBody: {
          name: newName,
        },
      });
      return res.data as TFile;
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

  public async uploadSingleFile(uploadFile: TUploadFile): Promise<TFile> {
    const { name, stream, parentId, mimeType } = uploadFile;
    try {
      const { data } = await this.drive_client.files.create({
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
      return { name: data.name!, id: data.id!, mimeType: data.mimeType! };
    } catch (error) {
      throw error;
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
  // public async getItem(id: string): Promise<TFile> {
  //   const res = await this.drive_client.files.get({
  //     fileId: id,
  //     fields: "files(id, name, mimeType)",
  //   });
  //   if (!res.data) throw new Error("Error while getting the name of the items: " + id);
  //   return res.data as TFile;
  // }
}
