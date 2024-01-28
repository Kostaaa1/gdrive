export type MainActions = "CREATE" | "READ" | "OPEN_DRIVE";
export type FolderActions =
  | "RENAME"
  | "READ"
  | "CREATE"
  | "DELETE"
  | "UPLOAD_FILE"
  | "UPLOAD_FOLDER"
  | "BACK";

export type FileActions = "DOWNLOAD" | "RENAME" | "INFO" | "DELETE" | "BACK";
