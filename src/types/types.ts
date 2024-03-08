export type MainActions =
  | "NEW_FILE"
  | "NEW_FOLDER"
  | "LIST"
  | "OPEN_DRIVE"
  | "OPEN"
  | "TRASH"
  | "EXIT";

export type FolderActions = "RENAME" | "CREATE" | "DELETE" | "UPLOAD";
// export type FolderActions = "RENAME" | "LIST" | "CREATE" | "DELETE" | "UPLOAD";
export type FileActions = "DOWNLOAD" | "RENAME" | "INFO" | "DELETE" | "MOVE" | "OPEN";
export type UploadFileActions = "LOCAL" | "URL";
export type NewFolderActions = "CREATE" | "UPLOAD";

// Process types:
export type ProcessFolderOpts = {
  clear_console?: boolean;
  name?: string;
};

export type DeleteOpts = "DELETE" | "TRASH";
export type UploadOpts = "FOLDER" | "FILE";
export type Folder1 = { name: string; id: string; path: string };
export type TrashActions = "DELETE" | "RESTORE";
// export type TrashItemActions = "RESTORE" | "DELETE";
