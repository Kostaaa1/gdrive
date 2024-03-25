import { Readable } from "stream";

export type TFile = { name: string; id: string; value: string; mimeType: string };
export type TUploadFile = {
  name: string;
  stream: Readable;
  fileSize?: string;
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
  | "NEXT_PAGE"
  | "CREATE";

export type FileActions = "DOWNLOAD" | "RENAME" | "INFO" | "DELETE" | "TRASH" | "OPEN";
export type ItemOperations = "DELETE" | "TRASH" | "DOWNLOAD";

export type DeleteOpts = "DELETE" | "TRASH";
// export type UploadOpts = "FOLDER" | "FILE";
export type TrashActions = "DELETE" | "RECOVER";
export type StorageQuota = {
  limit: string;
  usage: string;
  usageInDrive: string;
  usageInDriveTrash: string;
};
