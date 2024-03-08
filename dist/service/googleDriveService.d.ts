import { drive_v3 } from "googleapis";
export declare class GoogleDriveService {
    drive_client: drive_v3.Drive;
    private oatuh2Client;
    private static clientId;
    private static clientSecret;
    private static redirectUri;
    private static refreshToken;
    constructor();
    createOAuthClient(clientId: string, clientSecret: string, redirectUri: string): import("google-auth-library").OAuth2Client;
    createDriveClient(refresh_token: string): drive_v3.Drive;
    private isAccessGranted;
    authorize(): Promise<void>;
    getRootFolders(): Promise<{
        name: string;
        value: string;
    }[]>;
    listFolderFiles(folderId: string): Promise<drive_v3.Schema$File[]>;
    private getFileCountInFolder;
    fileExists(folderId: string, name: string): Promise<boolean>;
    getFolderIdWithName(folderName: string): Promise<string>;
    getFolderNameWithId(id: string): Promise<string | null | undefined>;
    getAllFolders(): Promise<{
        id: string;
        name: string;
        path: string;
    }[]>;
    createFolder(folder_name: string, folder_id?: string): Promise<string>;
    moveFile(file_id: string, folder_id: string): Promise<void>;
    downloadFile(path: string, driveFileId: string): Promise<void>;
    rename(new_name: string, id: string): Promise<void>;
    deleteFolder(folderId: string): Promise<void>;
    moveToTrash(fileId: string): Promise<void>;
    uploadSingleFile(file_name: string, stream: any, folderId: string | null, mimeType: string): Promise<void>;
    printFileInfo(id: string): Promise<void>;
    deleteTrashForever(): Promise<import("gaxios").GaxiosResponse<void>>;
    untrashAll(files: drive_v3.Schema$File[]): Promise<void>;
    listTrashFiles(): Promise<drive_v3.Schema$File[]>;
}
