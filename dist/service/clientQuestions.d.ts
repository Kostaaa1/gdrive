import { DeleteOpts, Folder1, FileActions, FolderActions, MainActions, NewFolderActions, TrashActions, UploadOpts } from "../types/types.js";
import type { drive_v3 } from "googleapis";
export declare class ClientQuestions {
    confirm(message: string): Promise<boolean>;
    input(message: string): Promise<any>;
    rename(previousName: string): Promise<any>;
    main_questions(): Promise<MainActions>;
    folder_questions_1(folders: {
        name: string;
        value: string;
    }[], message: string): Promise<string>;
    folder_questions(files: drive_v3.Schema$File[], folder_name: string): Promise<string | drive_v3.Schema$File>;
    folder_questions_2(folder_name: string): Promise<FolderActions>;
    new_folder_questions(): Promise<NewFolderActions>;
    file_questions_1(folder_content: string): Promise<FileActions>;
    folder_questions_3(files: Folder1[]): Promise<any>;
    select_file(files: drive_v3.Schema$File[]): Promise<drive_v3.Schema$File>;
    delete_questions(): Promise<DeleteOpts>;
    upload_questions(): Promise<UploadOpts>;
    trash_file_question(): Promise<TrashActions>;
    trash_questions(files: drive_v3.Schema$File[]): Promise<drive_v3.Schema$File | "RESTORE" | "DELETE">;
}
