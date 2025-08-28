import * as vscode from 'vscode';
import { Book } from '../models/Book';
import { ConfigurationService } from './ConfigurationService';
import { StatusBarService } from './StatusBarService';
export declare class BookManagerService {
    private context;
    private configService;
    private currentBook;
    private books;
    private fileService;
    private statusBarService;
    constructor(context: vscode.ExtensionContext, configService: ConfigurationService);
    setStatusBarService(statusBarService: StatusBarService): void;
    getCurrentBook(): Book | null;
    getCurrentPageContent(): string | null;
    openBook(filePath: string): Promise<boolean>;
    openLastReadBook(): Promise<boolean>;
    nextPage(): string | null;
    previousPage(): string | null;
    jumpToPage(pageNumber: number): string | null;
    smartJump(input: string): string | null;
    nextChapter(): string | null;
    previousChapter(): string | null;
    getChapterList(): string[];
    refreshConfiguration(): void;
    getFileLibrary(): string[];
    /**
     * 批量添加文件到图书库 - 修复去重和返回添加数量
     */
    addBooksToLibrary(filePaths: string[]): Promise<number>;
    /**
     * 批量从图书库移除文件 - 修复版本（这是正确的公共方法）
     */
    removeBooksFromLibrary(filePaths: string[]): Promise<void>;
    /**
     * 从图书库移除单个文件
     */
    removeFromLibrary(filePath: string): Promise<void>;
    /**
     * 保存阅读进度 - 修复为异步
     */
    saveReadingProgress(): Promise<void>;
    private restoreReadingProgress;
    /**
     * 更新最近文件列表 - 修复为异步
     */
    private updateRecentFiles;
    /**
     * 从最近文件中移除 - 修复为异步
     */
    private removeFromRecentFiles;
    clearCache(): void;
    /**
     * 清理文件缓存 - 修复版本
     */
    clearFileCache(filePath: string): void;
    getMemoryUsage(): {
        booksCount: number;
        cacheSize: string;
        details: string[];
    };
    refreshCurrentBook(): void;
}
//# sourceMappingURL=BookManagerService.d.ts.map