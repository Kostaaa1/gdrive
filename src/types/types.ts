export type MainActions = "CREATE" | "LIST" | "OPEN_DRIVE" | "TRASH" | "EXIT";

export type FolderActions = "RENAME" | "LIST" | "CREATE" | "DELETE" | "UPLOAD" | "BACK";
export type FileActions = "DOWNLOAD" | "RENAME" | "INFO" | "DELETE" | "BACK";
export type TrashActions = "LIST" | "EMPTY" | "EMPTY_ALL" | "RESTORE" | "RESTORE_ALL";
export type UploadFileActions = "LOCAL" | "URL";

// Process types:
export type ProcessFolderOpts = {
  clear_console?: boolean;
  name?: string;
};

export type DeleteOpts = "DELETE" | "TRASH" | "BACK";
export type UploadOpts = "FOLDER" | "FILE" | "BACK";
