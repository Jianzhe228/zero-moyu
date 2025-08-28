import * as vscode from 'vscode';
import { BookManagerService } from '../services/BookManagerService';
import { ConfigurationService } from '../services/ConfigurationService';
import { StatusBarService } from '../services/StatusBarService';
/**
 * 命令管理器
 */
export declare class CommandManager {
    private context;
    private bookManagerService;
    private configService;
    private statusBarService;
    private fileService;
    private messageTimeouts;
    constructor(context: vscode.ExtensionContext, bookManagerService: BookManagerService, configService: ConfigurationService, statusBarService: StatusBarService);
    /**
     * 注册所有命令
     */
    registerAllCommands(): void;
    /**
     * 注册单个命令
     */
    private registerCommand;
    /**
     * 显示自动关闭的信息提示
     */
    private showAutoCloseMessage;
    /**
     * 隐藏内容
     */
    private hideContent;
    /**
     * 下一页
     */
    private getNextPage;
    /**
     * 上一页
     */
    private getPreviousPage;
    /**
     * 跳转到指定页面
     */
    private jumpToPage;
    /**
     * 智能跳转
     */
    private smartJump;
    /**
     * 下一章
     */
    private getNextChapter;
    /**
     * 上一章
     */
    private getPreviousChapter;
    /**
     * 显示章节列表 - 修复ctrl+alt+l快捷键无法使用的问题
     */
    private showChapterList;
    /**
     * 显示图书库 - 显示图书列表，支持添加、删除和选择阅读
     */
    private showFileLibrary;
    /**
     * 选择图书阅读 - 修复显示阅读进度
     */
    private selectBookToRead;
    /**
     * 添加图书到书库
     */
    private addBooksToLibrary;
    /**
     * 从书库移除图书
     */
    private removeBooksFromLibrary;
    /**
     * 显示最近阅读 - 修复ctrl+alt+r快捷键无法使用的问题
     */
    private showRecentFiles;
    /**
     * 显示老板键伪装代码
     */
    private displayCode;
    /**
     * 显示内存使用情况
     */
    private showMemoryUsage;
    /**
     * 清理缓存
     */
    private clearCache;
    /**
     * 显示设置
     */
    private showSettings;
}
//# sourceMappingURL=CommandManager.d.ts.map