import { Readable } from "stream";

export type TFile = { name: string; id: string; mimeType: string };
export type TFolder = { name: string; id: string; path: string };
export type TUploadFile = {
  name: string;
  stream: Readable;
  mimeType?: string;
  parentId?: string;
};

export type MainActions =
  | "ITEM_OPERATIONS"
  | "UPLOAD"
  | "CREATE"
  | "OPEN"
  | "TRASH"
  | "OPEN_DRIVE"
  | "OPEN"
  | "EXIT";
// | TFile;

export type FolderActions =
  | "UPLOAD"
  | "DELETE"
  | "TRASH"
  | "RENAME"
  | "ITEM_OPERATIONS"
  | "DOWNLOAD"
  | "MOVE"
  | "CREATE";

export type UploadActions = "PATH" | "SCRAPE" | "URL";

export type FileActions = "DOWNLOAD" | "RENAME" | "INFO" | "DELETE" | "TRASH" | "OPEN";
export type ItemOperations = "DELETE" | "TRASH" | "DOWNLOAD" | "MOVE";
export type ScrapingOpts = "IMAGE" | "VIDEO";

export type DeleteOpts = "DELETE" | "TRASH";
// export type UploadOpts = "FOLDER" | "FILE";
export type TrashActions = "DELETE" | "RECOVER";
export type StorageQuota = {
  limit: string;
  usage: string;
  usageInDrive: string;
  usageInDriveTrash: string;
};
