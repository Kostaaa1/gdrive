export type TFile = { name: string; id: string; value: string; mimeType: string };

export type MainActions =
  | "ITEM_OPERATIONS"
  | "UPLOAD"
  | "CREATE"
  | "OPEN"
  | "TRASH"
  | "OPEN_DRIVE"
  | "OPEN"
  | "EXIT"
  | TFile;

export type FolderActions = "UPLOAD" | "RENAME" | "ITEM_OPERATIONS" | "CREATE";
export type FileActions = "DOWNLOAD" | "RENAME" | "INFO" | "DELETE" | "TRASH" | "OPEN";
export type ItemOperations = "DELETE" | "TRASH" | "DOWNLOAD";
// export type FolderActions = "RENAME" | "DOWNLOAD" | "CREATE" | "DELETE" | "UPLOAD";
// export type UploadFileActions = "LOCAL" | "URL";
// export type NewFolderActions = "CREATE" | "UPLOAD";

// Process types:
// export type ProcessFolderOpts = {
//   clear_console?: boolean;
//   name?: string;
// };

export type DeleteOpts = "DELETE" | "TRASH";
// export type UploadOpts = "FOLDER" | "FILE";
export type TrashActions = "DELETE" | "RESTORE";
export type StorageQuota = {
  limit: string;
  usage: string;
  usageInDrive: string;
  usageInDriveTrash: string;
};
