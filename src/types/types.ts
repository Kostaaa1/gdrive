export type MainActions = "CREATE" | "LIST" | "OPEN_DRIVE" | "OPEN" | "TRASH" | "EXIT";

export type FolderActions = "RENAME" | "LIST" | "CREATE" | "DELETE" | "UPLOAD";
export type FileActions = "DOWNLOAD" | "RENAME" | "INFO" | "DELETE";
export type UploadFileActions = "LOCAL" | "URL";
export type NewFolderActions = "CREATE" | "UPLOAD";

// Process types:
export type ProcessFolderOpts = {
  clear_console?: boolean;
  name?: string;
};

export type DeleteOpts = "DELETE" | "TRASH";
export type UploadOpts = "FOLDER" | "FILE";

export type TrashActions = "DELETE" | "RESTORE";
// export type TrashItemActions = "RESTORE" | "DELETE";
