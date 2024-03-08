/// <reference types="node" resolution-mode="require"/>
import internal from "stream";
export declare function formatDate(date: string): string;
export declare function convertBytes(bytes: string): string;
export declare const checkIfFolder: (filePath: string) => Promise<unknown>;
export declare function parseFileExtension(name: string, mimeType: string): string;
export declare function getMimeType(filePath: string): string | null;
export declare function getUrlMimeType(url: string): Promise<string | undefined>;
export declare function convertUrlToStream(url: string): Promise<internal.PassThrough>;
export declare function convertPathToStream(filePath: string): Promise<internal.Readable>;
export declare function openFile(filePath: string): Promise<void>;
