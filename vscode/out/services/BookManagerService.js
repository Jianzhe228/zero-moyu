"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookManagerService = void 0;
// BookManagerService.ts - 完整修复版本
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Book_1 = require("../models/Book");
const FileService_1 = require("./FileService");
class BookManagerService {
    constructor(context, configService) {
        this.context = context;
        this.configService = configService;
        this.currentBook = null;
        this.books = new Map();
        this.statusBarService = null;
        this.fileService = new FileService_1.FileService();
    }
    setStatusBarService(statusBarService) {
        this.statusBarService = statusBarService;
    }
    getCurrentBook() {
        return this.currentBook;
    }
    getCurrentPageContent() {
        if (!this.currentBook) {
            return null;
        }
        return this.currentBook.getCurrentPageContent();
    }
    async openBook(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                vscode.window.showErrorMessage(`文件不存在: ${filePath}`);
                return false;
            }
            let book = this.books.get(filePath);
            if (!book) {
                book = new Book_1.Book(filePath, this.configService);
                await book.initialize();
                this.books.set(filePath, book);
            }
            this.currentBook = book;
            this.restoreReadingProgress(filePath);
            await this.updateRecentFiles(filePath);
            if (this.statusBarService) {
                const formattedContent = book.getFormattedCurrentPageContent();
                this.statusBarService.showFormattedContent(formattedContent);
            }
            console.log(`📖 Opened book: ${path.basename(filePath)}`);
            return true;
        }
        catch (error) {
            console.error('Failed to open book:', error);
            vscode.window.showErrorMessage(`打开图书失败: ${error}`);
            return false;
        }
    }
    async openLastReadBook() {
        const recentFiles = this.configService.getRecentFiles();
        if (recentFiles.length === 0) {
            return false;
        }
        for (const filePath of recentFiles) {
            if (fs.existsSync(filePath)) {
                return await this.openBook(filePath);
            }
            else {
                await this.removeFromRecentFiles(filePath);
            }
        }
        return false;
    }
    nextPage() {
        if (!this.currentBook) {
            return null;
        }
        const content = this.currentBook.nextPage();
        this.saveReadingProgress();
        return content;
    }
    previousPage() {
        if (!this.currentBook) {
            return null;
        }
        const content = this.currentBook.previousPage();
        this.saveReadingProgress();
        return content;
    }
    jumpToPage(pageNumber) {
        if (!this.currentBook) {
            return null;
        }
        const content = this.currentBook.jumpToPage(pageNumber);
        this.saveReadingProgress();
        return content;
    }
    smartJump(input) {
        if (!this.currentBook) {
            return null;
        }
        const content = this.currentBook.smartJump(input);
        if (content) {
            this.saveReadingProgress();
        }
        return content;
    }
    nextChapter() {
        if (!this.currentBook) {
            return null;
        }
        const content = this.currentBook.nextChapter();
        this.saveReadingProgress();
        return content;
    }
    previousChapter() {
        if (!this.currentBook) {
            return null;
        }
        const content = this.currentBook.previousChapter();
        this.saveReadingProgress();
        return content;
    }
    getChapterList() {
        if (!this.currentBook) {
            return [];
        }
        return this.currentBook.getChapterList();
    }
    refreshConfiguration() {
        if (this.currentBook) {
            this.currentBook.refreshConfiguration();
        }
    }
    getFileLibrary() {
        return this.configService.getFileLibrary();
    }
    /**
     * 批量添加文件到图书库 - 修复去重和返回添加数量
     */
    async addBooksToLibrary(filePaths) {
        const library = this.configService.getFileLibrary();
        let addedCount = 0;
        const newLibrary = [...library]; // 创建副本
        filePaths.forEach(filePath => {
            if (!newLibrary.includes(filePath)) {
                newLibrary.push(filePath);
                addedCount++;
            }
        });
        if (addedCount > 0) {
            await this.configService.updateFileLibrary(newLibrary);
        }
        return addedCount;
    }
    /**
     * 批量从图书库移除文件 - 修复版本（这是正确的公共方法）
     */
    async removeBooksFromLibrary(filePaths) {
        console.log(`🗑️ Starting to remove ${filePaths.length} books`);
        try {
            // 获取当前图书路径
            const currentBookPath = this.currentBook ? this.currentBook.getFilePath() : null;
            const isCurrentBookDeleted = currentBookPath && filePaths.includes(currentBookPath);
            // 获取当前图书库 - 创建副本
            const currentLibrary = this.configService.getFileLibrary();
            console.log(`📚 Current library has ${currentLibrary.length} books`);
            // 创建新的图书库数组（过滤掉要删除的图书）
            const newLibrary = currentLibrary.filter(bookPath => {
                const shouldKeep = !filePaths.includes(bookPath);
                if (!shouldKeep) {
                    console.log(`  - Removing: ${bookPath}`);
                }
                return shouldKeep;
            });
            console.log(`📚 New library will have ${newLibrary.length} books`);
            // 批量处理每本要删除的图书
            for (const filePath of filePaths) {
                try {
                    // 1. 如果是当前图书，清空引用
                    if (this.currentBook && this.currentBook.getFilePath() === filePath) {
                        this.currentBook = null;
                    }
                    // 2. 从缓存中删除
                    if (this.books.has(filePath)) {
                        this.books.delete(filePath);
                    }
                    // 3. 从最近阅读列表中移除（异步）
                    await this.removeFromRecentFiles(filePath);
                    // 4. 清理阅读进度（异步）
                    await this.configService.removeReadingProgress(filePath);
                }
                catch (error) {
                    console.error(`Error processing removal of ${filePath}:`, error);
                    // 继续处理其他图书
                }
            }
            // 5. 更新图书库配置（异步）
            await this.configService.updateFileLibrary(newLibrary);
            // 6. 如果删除的图书包含当前图书，清空状态栏
            if (isCurrentBookDeleted && this.statusBarService) {
                this.statusBarService.hideContent();
                console.log(`📖 Current book deleted, status bar cleared`);
            }
            console.log(`✅ Successfully removed ${filePaths.length} books from library`);
        }
        catch (error) {
            console.error('❌ Failed to remove books:', error);
            throw error;
        }
    }
    /**
     * 从图书库移除单个文件
     */
    async removeFromLibrary(filePath) {
        await this.removeBooksFromLibrary([filePath]);
    }
    /**
     * 保存阅读进度 - 修复为异步
     */
    async saveReadingProgress() {
        if (!this.currentBook) {
            return;
        }
        const filePath = this.currentBook.getFilePath();
        const progress = {
            currentPage: this.currentBook.getCurrentPageNumber(),
            totalPages: this.currentBook.getTotalPages(),
            lastReadTime: new Date().toISOString()
        };
        await this.configService.saveReadingProgress(filePath, progress);
    }
    restoreReadingProgress(filePath) {
        const progress = this.configService.getReadingProgress(filePath);
        if (progress && this.currentBook) {
            this.currentBook.jumpToPage(progress.currentPage);
        }
    }
    /**
     * 更新最近文件列表 - 修复为异步
     */
    async updateRecentFiles(filePath) {
        const recentFiles = this.configService.getRecentFiles();
        const maxRecentFiles = this.configService.getMaxRecentFiles();
        // 创建新数组避免修改原数组
        const newRecentFiles = [...recentFiles];
        const index = newRecentFiles.indexOf(filePath);
        if (index > -1) {
            newRecentFiles.splice(index, 1);
        }
        newRecentFiles.unshift(filePath);
        if (newRecentFiles.length > maxRecentFiles) {
            newRecentFiles.splice(maxRecentFiles);
        }
        await this.configService.updateRecentFiles(newRecentFiles);
    }
    /**
     * 从最近文件中移除 - 修复为异步
     */
    async removeFromRecentFiles(filePath) {
        const recentFiles = this.configService.getRecentFiles();
        const filteredFiles = recentFiles.filter(file => file !== filePath);
        if (filteredFiles.length !== recentFiles.length) {
            await this.configService.updateRecentFiles(filteredFiles);
            console.log(`✅ Removed from recent files: ${filePath}`);
        }
    }
    clearCache() {
        this.books.forEach(book => {
            if (book && typeof book.cleanup === 'function') {
                try {
                    book.cleanup();
                }
                catch (error) {
                    console.warn('Error during book cleanup:', error);
                }
            }
        });
        this.books.clear();
        this.currentBook = null;
        console.log('🧹 Book cache cleared');
    }
    /**
     * 清理文件缓存 - 修复版本
     */
    clearFileCache(filePath) {
        try {
            // 如果是当前图书，先清空引用
            if (this.currentBook && this.currentBook.getFilePath() === filePath) {
                this.currentBook = null;
            }
            // 直接从 Map 中删除，不调用 cleanup
            if (this.books.has(filePath)) {
                this.books.delete(filePath);
                console.log(`🧹 Cache cleared for file: ${filePath}`);
            }
        }
        catch (error) {
            console.error(`Error clearing cache for ${filePath}:`, error);
        }
    }
    getMemoryUsage() {
        const booksCount = this.books.size;
        const cacheSize = `${booksCount} books cached`;
        const details = [];
        this.books.forEach((book, filePath) => {
            const fileName = path.basename(filePath);
            details.push(`${fileName}: ${book.getTotalPages()} pages`);
        });
        return { booksCount, cacheSize, details };
    }
    refreshCurrentBook() {
        if (this.currentBook) {
            const filePath = this.currentBook.getFilePath();
            this.clearFileCache(filePath);
            this.openBook(filePath);
        }
    }
}
exports.BookManagerService = BookManagerService;
//# sourceMappingURL=BookManagerService.js.map