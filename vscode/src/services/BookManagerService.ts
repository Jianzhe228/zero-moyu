// BookManagerService.ts - 完整优化版本
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Book } from '../models/Book';
import { ConfigurationService } from './ConfigurationService';
import { FileService } from './FileService';
import { StatusBarService } from './StatusBarService';
import { LRUCacheManager } from './LRUCacheManager';

export class BookManagerService {
    private currentBook: Book | null = null;
    private cacheManager: LRUCacheManager;
    private fileService: FileService;
    private statusBarService: StatusBarService | null = null;

    constructor(
        private context: vscode.ExtensionContext,
        private configService: ConfigurationService
    ) {
        this.fileService = new FileService();
        this.cacheManager = new LRUCacheManager(configService);
    }

    /**
     * 设置状态栏服务
     */
    setStatusBarService(statusBarService: StatusBarService): void {
        this.statusBarService = statusBarService;
    }

    /**
     * 获取当前图书
     */
    getCurrentBook(): Book | null {
        return this.currentBook;
    }

    /**
     * 获取当前页内容
     */
    getCurrentPageContent(): string | null {
        try {
            if (!this.currentBook) {
                return null;
            }
            return this.currentBook.getCurrentPageContent();
        } catch (error) {
            console.error('Error getting current page content:', error);
            return null;
        }
    }

    /**
     * 打开图书
     */
    async openBook(filePath: string): Promise<boolean> {
        try {
            if (!fs.existsSync(filePath)) {
                vscode.window.showErrorMessage(`文件不存在: ${filePath}`);
                return false;
            }

            // 使用LRU缓存管理器获取图书
            const book = await this.cacheManager.getOrCreateBook(filePath);
            if (!book) {
                vscode.window.showErrorMessage(`无法打开图书: ${path.basename(filePath)}`);
                return false;
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

        } catch (error) {
            console.error('Failed to open book:', error);
            vscode.window.showErrorMessage(`打开图书失败: ${error}`);
            return false;
        }
    }

    /**
     * 打开最近阅读的图书
     */
    async openLastReadBook(): Promise<boolean> {
        try {
            const recentFiles = this.configService.getRecentFiles();
            if (recentFiles.length === 0) {
                return false;
            }

            for (const filePath of recentFiles) {
                if (fs.existsSync(filePath)) {
                    return await this.openBook(filePath);
                } else {
                    await this.removeFromRecentFiles(filePath);
                }
            }

            return false;
        } catch (error) {
            console.error('Error opening last read book:', error);
            return false;
        }
    }

    /**
     * 下一页
     */
    nextPage(): string | null {
        try {
            if (!this.currentBook) {
                return null;
            }

            const content = this.currentBook.nextPage();
            this.saveReadingProgress();
            return content;
        } catch (error) {
            console.error('Error going to next page:', error);
            return null;
        }
    }

    /**
     * 上一页
     */
    previousPage(): string | null {
        try {
            if (!this.currentBook) {
                return null;
            }

            const content = this.currentBook.previousPage();
            this.saveReadingProgress();
            return content;
        } catch (error) {
            console.error('Error going to previous page:', error);
            return null;
        }
    }

    /**
     * 跳转到指定页
     */
    jumpToPage(pageNumber: number): string | null {
        try {
            if (!this.currentBook) {
                return null;
            }

            const content = this.currentBook.jumpToPage(pageNumber);
            this.saveReadingProgress();
            return content;
        } catch (error) {
            console.error('Error jumping to page:', error);
            return null;
        }
    }

    /**
     * 智能跳转
     */
    smartJump(input: string): string | null {
        try {
            if (!this.currentBook) {
                return null;
            }

            const content = this.currentBook.smartJump(input);
            if (content) {
                this.saveReadingProgress();
            }
            return content;
        } catch (error) {
            console.error('Error in smart jump:', error);
            return null;
        }
    }

    /**
     * 下一章
     */
    nextChapter(): string | null {
        try {
            if (!this.currentBook) {
                return null;
            }

            const content = this.currentBook.nextChapter();
            this.saveReadingProgress();
            return content;
        } catch (error) {
            console.error('Error going to next chapter:', error);
            return null;
        }
    }

    /**
     * 上一章
     */
    previousChapter(): string | null {
        try {
            if (!this.currentBook) {
                return null;
            }

            const content = this.currentBook.previousChapter();
            this.saveReadingProgress();
            return content;
        } catch (error) {
            console.error('Error going to previous chapter:', error);
            return null;
        }
    }

    /**
     * 获取章节列表
     */
    getChapterList(): string[] {
        try {
            if (!this.currentBook) {
                return [];
            }
            return this.currentBook.getChapterList();
        } catch (error) {
            console.error('Error getting chapter list:', error);
            return [];
        }
    }

    /**
     * 刷新配置
     */
    refreshConfiguration(): void {
        try {
            if (this.currentBook) {
                this.currentBook.refreshConfiguration();
            }
        } catch (error) {
            console.error('Error refreshing configuration:', error);
        }
    }

    /**
     * 获取图书库
     */
    getFileLibrary(): string[] {
        try {
            return this.configService.getFileLibrary();
        } catch (error) {
            console.error('Error getting file library:', error);
            return [];
        }
    }

    /**
     * 批量添加文件到图书库
     */
    async addBooksToLibrary(filePaths: string[]): Promise<number> {
        try {
            const library = this.configService.getFileLibrary();
            let addedCount = 0;
            const newLibrary = [...library];

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
        } catch (error) {
            console.error('Error adding books to library:', error);
            vscode.window.showErrorMessage(`添加图书失败: ${error}`);
            return 0;
        }
    }

    /**
     * 批量从图书库移除文件
     */
    async removeBooksFromLibrary(filePaths: string[]): Promise<void> {
        try {
            console.log(`🗑️ Starting to remove ${filePaths.length} books`);

            // 获取当前图书路径
            const currentBookPath = this.currentBook ? this.currentBook.getFilePath() : null;
            const isCurrentBookDeleted = currentBookPath && filePaths.includes(currentBookPath);

            // 获取当前图书库
            const currentLibrary = this.configService.getFileLibrary();
            console.log(`📚 Current library has ${currentLibrary.length} books`);

            // 创建新的图书库数组
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
                    // 如果是当前图书，清空引用
                    if (this.currentBook && this.currentBook.getFilePath() === filePath) {
                        this.currentBook = null;
                    }

                    // 使用缓存管理器移除
                    await this.cacheManager.removeFromCache(filePath);

                    // 从最近阅读列表中移除
                    await this.removeFromRecentFiles(filePath);

                    // 清理阅读进度
                    await this.configService.removeReadingProgress(filePath);

                } catch (error) {
                    console.error(`Error processing removal of ${filePath}:`, error);
                    // 继续处理其他图书
                }
            }

            // 更新图书库配置
            await this.configService.updateFileLibrary(newLibrary);

            // 如果删除的图书包含当前图书，清空状态栏
            if (isCurrentBookDeleted && this.statusBarService) {
                this.statusBarService.hideContent();
                console.log(`📖 Current book deleted, status bar cleared`);
            }

            console.log(`✅ Successfully removed ${filePaths.length} books from library`);

        } catch (error) {
            console.error('❌ Failed to remove books:', error);
            vscode.window.showErrorMessage(`移除图书失败: ${error}`);
        }
    }

    /**
     * 从图书库移除单个文件
     */
    async removeFromLibrary(filePath: string): Promise<void> {
        try {
            await this.removeBooksFromLibrary([filePath]);
        } catch (error) {
            console.error('Error removing from library:', error);
        }
    }

    /**
     * 保存阅读进度
     */
    public async saveReadingProgress(): Promise<void> {
        try {
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
        } catch (error) {
            console.error('Error saving reading progress:', error);
        }
    }

    /**
     * 恢复阅读进度
     */
    private restoreReadingProgress(filePath: string): void {
        try {
            const progress = this.configService.getReadingProgress(filePath);
            if (progress && this.currentBook) {
                this.currentBook.jumpToPage(progress.currentPage);
            }
        } catch (error) {
            console.error('Error restoring reading progress:', error);
        }
    }

    /**
     * 更新最近文件列表
     */
    private async updateRecentFiles(filePath: string): Promise<void> {
        try {
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
        } catch (error) {
            console.error('Error updating recent files:', error);
        }
    }

    /**
     * 从最近文件中移除
     */
    private async removeFromRecentFiles(filePath: string): Promise<void> {
        try {
            const recentFiles = this.configService.getRecentFiles();
            const filteredFiles = recentFiles.filter(file => file !== filePath);

            if (filteredFiles.length !== recentFiles.length) {
                await this.configService.updateRecentFiles(filteredFiles);
                console.log(`✅ Removed from recent files: ${filePath}`);
            }
        } catch (error) {
            console.error('Error removing from recent files:', error);
        }
    }

    /**
     * 清理所有缓存
     */
    async clearCache(): Promise<void> {
        try {
            await this.cacheManager.clearAll();
            this.currentBook = null;
            console.log('🧹 All cache cleared');
        } catch (error) {
            console.error('Error clearing cache:', error);
            vscode.window.showErrorMessage(`清理缓存失败: ${error}`);
        }
    }

    /**
     * 清理文件缓存
     */
    async clearFileCache(filePath: string): Promise<void> {
        try {
            // 如果是当前图书，先清空引用
            if (this.currentBook && this.currentBook.getFilePath() === filePath) {
                this.currentBook = null;
            }

            // 使用缓存管理器移除
            await this.cacheManager.removeFromCache(filePath);
            console.log(`🧹 Cache cleared for file: ${filePath}`);

        } catch (error) {
            console.error(`Error clearing cache for ${filePath}:`, error);
        }
    }

    /**
     * 获取内存使用情况
     */
    getMemoryUsage(): {
        booksCount: number;
        memoryUsageMB: number;
        maxMemoryMB: number;
        cacheSize: string;
        details: string[]
    } {
        try {
            const stats = this.cacheManager.getStats();
            const details = stats.entries.map(entry =>
                `${path.basename(entry.path)}: ${entry.sizeMB.toFixed(2)}MB (访问: ${entry.lastAccess.toLocaleTimeString()})`
            );

            return {
                booksCount: stats.cacheSize,
                memoryUsageMB: stats.memoryUsageMB,
                maxMemoryMB: stats.maxMemoryMB,
                cacheSize: `${stats.cacheSize} books cached`,
                details
            };
        } catch (error) {
            console.error('Error getting memory usage:', error);
            return {
                booksCount: 0,
                memoryUsageMB: 0,
                maxMemoryMB: 100,
                cacheSize: '0 books cached',
                details: []
            };
        }
    }

    /**
     * 刷新当前图书
     */
    async refreshCurrentBook(): Promise<void> {
        try {
            if (this.currentBook) {
                const filePath = this.currentBook.getFilePath();
                await this.clearFileCache(filePath);
                await this.openBook(filePath);
            }
        } catch (error) {
            console.error('Error refreshing current book:', error);
            vscode.window.showErrorMessage(`刷新图书失败: ${error}`);
        }
    }

    /**
     * 配置缓存策略
     */
    configureCacheStrategy(maxBooks: number, maxMemoryMB: number): void {
        try {
            this.cacheManager.setMaxCacheSize(maxBooks);
            this.cacheManager.setMaxMemory(maxMemoryMB);
            console.log(`📊 Cache strategy updated: max ${maxBooks} books, ${maxMemoryMB}MB`);
        } catch (error) {
            console.error('Error configuring cache strategy:', error);
        }
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats(): {
        totalBooks: number;
        cachedBooks: number;
        memoryUsage: string;
        efficiency: number;
    } {
        try {
            const stats = this.cacheManager.getStats();
            const library = this.getFileLibrary();

            return {
                totalBooks: library.length,
                cachedBooks: stats.cacheSize,
                memoryUsage: `${stats.memoryUsageMB.toFixed(2)}/${stats.maxMemoryMB}MB`,
                efficiency: library.length > 0 ? (stats.cacheSize / library.length) * 100 : 0
            };
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return {
                totalBooks: 0,
                cachedBooks: 0,
                memoryUsage: '0/100MB',
                efficiency: 0
            };
        }
    }

    /**
     * 预加载图书到缓存
     */
    async preloadBooks(filePaths: string[]): Promise<void> {
        try {
            console.log(`📚 Preloading ${filePaths.length} books...`);

            for (const filePath of filePaths) {
                if (fs.existsSync(filePath)) {
                    await this.cacheManager.getOrCreateBook(filePath);
                }
            }

            console.log(`✅ Preloaded ${filePaths.length} books`);
        } catch (error) {
            console.error('Error preloading books:', error);
        }
    }

    /**
     * 检查文件是否在缓存中
     */
    isBookCached(filePath: string): boolean {
        try {
            const stats = this.cacheManager.getStats();
            return stats.entries.some(entry => entry.path === filePath);
        } catch (error) {
            console.error('Error checking if book is cached:', error);
            return false;
        }
    }
}