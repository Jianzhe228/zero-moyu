// CommandManager.ts - 修复后的完整代码
import * as vscode from 'vscode';
import { BookManagerService } from '../services/BookManagerService';
import { ConfigurationService } from '../services/ConfigurationService';
import { StatusBarService } from '../services/StatusBarService';
import { FileService } from '../services/FileService';
import * as path from 'path';

/**
 * 命令管理器
 */
export class CommandManager {
    private fileService: FileService;
    // 添加超时消息定时器映射
    private messageTimeouts: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        private context: vscode.ExtensionContext,
        private bookManagerService: BookManagerService,
        private configService: ConfigurationService,
        private statusBarService: StatusBarService
    ) {
        this.fileService = new FileService();
    }

    /**
     * 注册所有命令
     */
    registerAllCommands(): void {
        // 基础阅读命令
        this.registerCommand('extension.hideContent', () => this.hideContent());
        this.registerCommand('extension.getNextPage', () => this.getNextPage());
        this.registerCommand('extension.getPreviousPage', () => this.getPreviousPage());
        this.registerCommand('extension.smartJump', () => this.smartJump());

        // 章节导航命令
        this.registerCommand('extension.getNextChapter', () => this.getNextChapter());
        this.registerCommand('extension.getPreviousChapter', () => this.getPreviousChapter());
        this.registerCommand('extension.showChapterList', () => this.showChapterList());

        // 文件管理命令
        this.registerCommand('extension.showFileLibrary', () => this.showFileLibrary());
        this.registerCommand('extension.showRecentFiles', () => this.showRecentFiles());

        // 老板键和伪装命令
        this.registerCommand('extension.displayCode', () => this.displayCode());

        // 性能监控命令
        this.registerCommand('extension.showMemoryUsage', () => this.showMemoryUsage());
        this.registerCommand('extension.clearCache', () => this.clearCache());
        this.registerCommand('extension.showSettings', () => this.showSettings());
    }

    /**
     * 注册单个命令
     */
    private registerCommand(commandId: string, callback: () => void | Promise<void>): void {
        const disposable = vscode.commands.registerCommand(commandId, callback);
        this.context.subscriptions.push(disposable);
    }

    /**
     * 显示自动关闭的信息提示
     */
    private showAutoCloseMessage(message: string, timeout: number = 3000): void {
        // 使用 showInformationMessage 并设置自动关闭
        const messageItem = vscode.window.setStatusBarMessage(`ℹ️ ${message}`);

        // 设置定时器自动关闭
        setTimeout(() => {
            messageItem.dispose();
        }, timeout);
    }

    /**
     * 隐藏内容
     */
    private hideContent(): void {
        this.statusBarService.hideContent();
    }

    /**
     * 下一页
     */
    private async getNextPage(): Promise<void> {
        try {
            let content = this.bookManagerService.nextPage();

            if (!content) {
                // 检查图书库是否为空
                const library = this.bookManagerService.getFileLibrary();
                if (library.length === 0) {
                    this.showAutoCloseMessage('图书库为空，请先添加图书', 3000);
                    return;
                }

                // 尝试自动打开上一次阅读的图书
                const success = await this.bookManagerService.openLastReadBook();
                if (success) {
                    content = this.bookManagerService.getCurrentPageContent();
                } else {
                    this.showAutoCloseMessage('请先选择一本图书', 3000);
                    return;
                }
            }

            if (content) {
                const currentBook = this.bookManagerService.getCurrentBook();
                if (currentBook) {
                    // 使用格式化的内容显示（已包含页码信息）
                    const formattedContent = currentBook.getFormattedCurrentPageContent();
                    this.statusBarService.showFormattedContent(formattedContent);
                }
            }
        } catch (error) {
            this.statusBarService.showError(`翻页失败: ${error}`);
        }
    }

    /**
     * 上一页
     */
    private async getPreviousPage(): Promise<void> {
        try {
            let content = this.bookManagerService.previousPage();

            if (!content) {
                // 检查图书库是否为空
                const library = this.bookManagerService.getFileLibrary();
                if (library.length === 0) {
                    this.showAutoCloseMessage('图书库为空，请先添加图书', 3000);
                    return;
                }

                const success = await this.bookManagerService.openLastReadBook();
                if (success) {
                    content = this.bookManagerService.getCurrentPageContent();
                } else {
                    this.showAutoCloseMessage('请先选择一本图书', 3000);
                    return;
                }
            }

            if (content) {
                const currentBook = this.bookManagerService.getCurrentBook();
                if (currentBook) {
                    // 使用格式化的内容显示（已包含页码信息）
                    const formattedContent = currentBook.getFormattedCurrentPageContent();
                    this.statusBarService.showFormattedContent(formattedContent);
                }
            }
        } catch (error) {
            this.statusBarService.showError(`翻页失败: ${error}`);
        }
    }



    /**
     * 智能跳转
     */
    private async smartJump(): Promise<void> {
        try {
            const currentBook = this.bookManagerService.getCurrentBook();
            if (!currentBook) {
                const library = this.bookManagerService.getFileLibrary();
                if (library.length === 0) {
                    this.showAutoCloseMessage('图书库为空，请先添加图书', 3000);
                } else {
                    this.showAutoCloseMessage('请先选择一本图书', 3000);
                }
                return;
            }

            const input = await vscode.window.showInputBox({
                prompt: '输入页码或搜索关键词',
                placeHolder: '页码或关键词'
            });

            if (input && input.trim()) {
                const content = this.bookManagerService.smartJump(input.trim());
                if (content) {
                    this.statusBarService.showPageInfo(
                        currentBook.getCurrentPageNumber(),
                        currentBook.getTotalPages(),
                        content
                    );
                } else {
                    this.statusBarService.showError('未找到相关内容');
                }
            }
        } catch (error) {
            this.statusBarService.showError(`搜索失败: ${error}`);
        }
    }

    /**
     * 下一章
     */
    private async getNextChapter(): Promise<void> {
        try {
            const content = this.bookManagerService.nextChapter();
            if (content) {
                const currentBook = this.bookManagerService.getCurrentBook();
                if (currentBook) {
                    const formattedContent = currentBook.getFormattedCurrentPageContent();
                    this.statusBarService.showFormattedContent(formattedContent);
                }
            } else {
                this.statusBarService.showError('已是最后一章');
            }
        } catch (error) {
            this.statusBarService.showError(`章节跳转失败: ${error}`);
        }
    }

    /**
     * 上一章
     */
    private async getPreviousChapter(): Promise<void> {
        try {
            const content = this.bookManagerService.previousChapter();
            if (content) {
                const currentBook = this.bookManagerService.getCurrentBook();
                if (currentBook) {
                    this.statusBarService.showPageInfo(
                        currentBook.getCurrentPageNumber(),
                        currentBook.getTotalPages(),
                        content
                    );
                }
            } else {
                this.statusBarService.showError('已是第一章');
            }
        } catch (error) {
            this.statusBarService.showError(`章节跳转失败: ${error}`);
        }
    }

    /**
     * 显示章节列表 - 修复ctrl+alt+l快捷键无法使用的问题
     */
    private async showChapterList(): Promise<void> {
        try {
            const currentBook = this.bookManagerService.getCurrentBook();
            if (!currentBook) {
                const library = this.bookManagerService.getFileLibrary();
                if (library.length === 0) {
                    this.showAutoCloseMessage('图书库为空，请先添加图书', 3000);
                } else {
                    this.showAutoCloseMessage('请先选择一本图书', 3000);
                }
                return;
            }

            const chapters = this.bookManagerService.getChapterList();
            if (chapters.length === 0) {
                this.showAutoCloseMessage('当前图书未识别到章节', 3000);
                return;
            }

            const selected = await vscode.window.showQuickPick(chapters, {
                placeHolder: '选择要跳转的章节'
            });

            if (selected) {
                const chapterIndex = chapters.indexOf(selected);
                const currentBook = this.bookManagerService.getCurrentBook();
                if (currentBook) {
                    const content = currentBook.jumpToChapter(chapterIndex);
                    this.statusBarService.showPageInfo(
                        currentBook.getCurrentPageNumber(),
                        currentBook.getTotalPages(),
                        content
                    );
                }
            }
        } catch (error) {
            this.statusBarService.showError(`显示章节列表失败: ${error}`);
        }
    }

    /**
     * 显示图书库 - 显示图书列表，支持添加、删除和选择阅读
     */
    private async showFileLibrary(): Promise<void> {
        try {
            const fileLibrary = this.bookManagerService.getFileLibrary();

            if (fileLibrary.length === 0) {
                // 图书库为空时，只显示添加选项
                const addOption = { label: '📚 添加图书', description: '从本地添加一本或多本图书', detail: 'ADD' };
                const selectedOption = await vscode.window.showQuickPick([addOption], {
                    placeHolder: '图书库为空，请先添加图书'
                });

                if (selectedOption) {
                    await this.addBooksToLibrary();
                }
                return;
            }

            // 图书库有图书时，显示所有选项
            const options = [
                { label: '📖 选择图书阅读', description: '从书库中选择一本图书开始阅读', detail: 'READ' },
                { label: '📚 添加图书', description: '从本地添加一本或多本图书', detail: 'ADD' },
                { label: '🗑️ 移除图书', description: '从书库中移除一本或多本图书', detail: 'REMOVE' }
            ];

            const selectedOption = await vscode.window.showQuickPick(options, {
                placeHolder: '请选择要执行的操作'
            });

            if (!selectedOption) {
                return;
            }

            switch (selectedOption.detail) {
                case 'READ':
                    await this.selectBookToRead(fileLibrary);
                    break;
                case 'ADD':
                    await this.addBooksToLibrary();
                    break;
                case 'REMOVE':
                    await this.removeBooksFromLibrary(fileLibrary);
                    break;
            }
        } catch (error) {
            this.statusBarService.showError(`操作失败: ${error}`);
        }
    }

    /**
     * 选择图书阅读 - 修复显示阅读进度
     */
    private async selectBookToRead(fileLibrary: string[]): Promise<void> {
        const items = fileLibrary.map(file => {
            // 获取阅读进度
            const progress = this.configService.getReadingProgress(file);
            let progressText = '';
            if (progress) {
                progressText = ` (${progress.currentPage}/${progress.totalPages})`;
            }

            return {
                label: path.basename(file) + progressText,
                description: file,
                filePath: file
            };
        });

        const selectedItem = await vscode.window.showQuickPick(items, {
            placeHolder: '请选择要阅读的图书'
        });

        if (selectedItem) {
            const success = await this.bookManagerService.openBook(selectedItem.filePath);
            if (success) {
                const currentBook = this.bookManagerService.getCurrentBook();
                if (currentBook) {
                    const formattedContent = currentBook.getFormattedCurrentPageContent();
                    this.statusBarService.showFormattedContent(formattedContent);
                    this.showAutoCloseMessage(`已打开图书: ${path.basename(selectedItem.filePath)}`, 3000);
                }
            }
        }
    }

    /**
     * 添加图书到书库
     */
    private async addBooksToLibrary(): Promise<void> {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: true,
            openLabel: '选择图书文件',
            filters: {
                'Text Files': ['txt']
            }
        });
    
        if (uris) {
            const filePaths = uris.map(uri => uri.fsPath);
            const addedCount = await this.bookManagerService.addBooksToLibrary(filePaths);
            this.showAutoCloseMessage(`成功添加 ${addedCount} 本图书到书库。`, 3000);
        }
    }

    /**
     * 从书库移除图书 
     */
    private async removeBooksFromLibrary(fileLibrary: string[]): Promise<void> {
        const items = fileLibrary.map(file => {
            // 获取阅读进度
            const progress = this.configService.getReadingProgress(file);
            let progressText = '';
            if (progress) {
                progressText = ` (${progress.currentPage}/${progress.totalPages})`;
            }

            return {
                label: path.basename(file) + progressText,
                description: file,
                filePath: file,
                picked: false
            };
        });

        const selectedItems = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: '请选择要移除的图书（可多选）'
        });

        if (selectedItems && selectedItems.length > 0) {
            const filePathsToRemove = selectedItems.map(item => item.filePath);

            // 记录当前图书信息
            const currentBook = this.bookManagerService.getCurrentBook();
            const currentBookPath = currentBook ? currentBook.getFilePath() : null;

            // 执行批量删除
            try {
                this.bookManagerService.removeBooksFromLibrary(filePathsToRemove);

                // 如果当前图书被删除，确保状态栏被清空
                if (currentBookPath && filePathsToRemove.includes(currentBookPath)) {
                    this.statusBarService.hideContent();
                    console.log('Current book was deleted, status bar cleared');
                }

                // 显示成功消息（3秒后自动关闭）
                this.showAutoCloseMessage(`成功移除 ${filePathsToRemove.length} 本图书。`, 3000);

            } catch (error) {
                console.error('Error removing books:', error);
                vscode.window.showErrorMessage(`移除图书时出错: ${error}`);
            }
        }
    }

    /**
     * 显示最近阅读 - 修复ctrl+alt+r快捷键无法使用的问题
     */
    private async showRecentFiles(): Promise<void> {
        const recentFiles = this.configService.getRecentFiles();
        if (recentFiles.length === 0) {
            this.showAutoCloseMessage('暂无最近阅读记录', 3000);
            return;
        }

        const items = recentFiles.map(filePath => {
            const fileInfo = this.fileService.getFileInfo(filePath);
            // 获取阅读进度
            const progress = this.configService.getReadingProgress(filePath);
            let progressText = '';
            if (progress) {
                progressText = ` (${progress.currentPage}/${progress.totalPages})`;
            }

            return {
                label: (fileInfo ? fileInfo.name : path.basename(filePath)) + progressText,
                description: fileInfo ? fileInfo.sizeFormatted : '',
                detail: filePath
            };
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '选择最近阅读的图书'
        });

        if (selected && selected.detail) {
            const success = await this.bookManagerService.openBook(selected.detail);
            if (success) {
                const content = this.bookManagerService.getCurrentPageContent();
                if (content) {
                    const currentBook = this.bookManagerService.getCurrentBook();
                    if (currentBook) {
                        this.statusBarService.showPageInfo(
                            currentBook.getCurrentPageNumber(),
                            currentBook.getTotalPages(),
                            content
                        );
                    }
                }
            }
        }
    }

    /**
     * 显示老板键伪装代码
     */
    private displayCode(): void {
        this.statusBarService.showBossKey();
    }

    /**
     * 显示内存使用情况
     */
    private showMemoryUsage(): void {
        const memoryUsage = this.bookManagerService.getMemoryUsage();
        const config = this.configService.getAllConfig();

        const message = `内存使用情况：
缓存图书数量: ${memoryUsage.booksCount}
图书库数量: ${config.libraryCount}
最近阅读数量: ${config.recentFilesCount}
每页字数: ${config.pageSize}
最大最近文件数: ${config.maxRecentFiles}`;

        this.showAutoCloseMessage(message, 5000);
    }

    /**
     * 清理缓存
     */
    private clearCache(): void {
        this.bookManagerService.clearCache();
        this.statusBarService.showSuccess('缓存已清理');
    }

    /**
     * 显示设置
     */
    private showSettings(): void {
        vscode.commands.executeCommand('workbench.action.openSettings', 'zero-moyu');
    }
}