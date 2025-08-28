import { ConfigurationService } from '../services/ConfigurationService';
/**
 * 图书模型
 * 表示一本图书的所有信息和操作
 * 重构后的版本，参考IDEA插件的优秀实现
 */
export declare class Book {
    private filePath;
    private configService;
    private currentPageNumber;
    private totalPages;
    private pageSize;
    private lineBreak;
    private chapters;
    private fileService;
    private cachedText;
    private cachedFilePath;
    private cachedConfig;
    private start;
    private end;
    constructor(filePath: string, configService: ConfigurationService);
    /**
    * 安全释放资源
    */
    dispose(): void;
    /**
     * 初始化图书 - 重构版本，学习IDEA插件
     */
    initialize(): Promise<void>;
    /**
     * 读取文件 - 学习IDEA插件的实现
     */
    private readFile;
    /**
     * 文本内容处理 - 学习IDEA插件的processTextContent
     */
    private processTextContent;
    /**
     * 字符集检测 - 学习IDEA插件
     */
    private detectCharset;
    /**
     * 获取缓存配置 - 学习IDEA插件
     */
    private getCachedConfig;
    /**
     * 计算分页边界 - 学习IDEA插件的getStartEnd
     */
    private getStartEnd;
    /**
     * 获取当前页内容 - 重构版本
     */
    getCurrentPageContent(): string;
    /**
     * 获取指定页面内容 - 重构版本
     */
    getPageContent(pageNumber: number): string;
    /**
     * 跳转到指定页面 - 学习IDEA插件的getJumpingPage
     */
    private getJumpingPage;
    /**
     * 获取当前页内容并格式化显示（包含页码信息）- 学习IDEA插件的formatStatusBarContent
     */
    getFormattedCurrentPageContent(): string;
    /**
     * 格式化状态栏内容 - 学习IDEA插件的实现
     */
    private formatStatusBarContent;
    /**
     * 分页导航 - 学习IDEA插件的getPage方法
     */
    private getPage;
    /**
     * 下一页 - 重构版本
     */
    nextPage(): string;
    /**
     * 上一页 - 重构版本
     */
    previousPage(): string;
    /**
     * 跳转到指定页面 - 重构版本
     */
    jumpToPage(pageNumber: number): string;
    /**
     * 智能跳转（页码或关键词搜索）- 重构版本
     */
    smartJump(input: string): string | null;
    /**
     * 搜索文本 - 学习IDEA插件的searchText方法
     */
    searchText(keyword: string): string | null;
    /**
     * 下一章 - 学习IDEA插件的jumpToNextChapter
     */
    nextChapter(): string;
    /**
     * 上一章 - 学习IDEA插件的jumpToPreviousChapter
     */
    previousChapter(): string;
    /**
     * 获取章节列表 - 学习IDEA插件
     */
    getChapters(): Chapter[];
    /**
     * 获取章节标题列表（兼容旧接口）- 修复重复标题问题
     */
    getChapterList(): string[];
    /**
     * 跳转到指定章节 - 学习IDEA插件
     */
    jumpToChapter(chapterIndex: number): string;
    /**
     * 获取当前章节信息 - 学习IDEA插件
     */
    getCurrentChapter(): Chapter | null;
    /**
     * 获取当前页码
     */
    getCurrentPageNumber(): number;
    /**
     * 获取总页数
     */
    getTotalPages(): number;
    /**
     * 获取文件路径
     */
    getFilePath(): string;
    /**
     * 获取文件名
     */
    getFileName(): string;
    /**
     * 刷新配置 - 重构版本，学习IDEA插件
     */
    refreshConfiguration(): void;
    /**
     * 计算总页数 - 重构版本
     */
    private calculateTotalPages;
    /**
     * 清理缓存 - 修复版本，避免 Proxy 错误
     */
    cleanup(): void;
    /**
     * 识别章节 - 完全重构，学习IDEA插件的detectChapters方法
     */
    private identifyChapters;
    /**
     * 章节检测 - 学习IDEA插件的精确实现
     */
    private detectChapters;
}
/**
 * 章节接口
 */
interface Chapter {
    index: number;
    title: string;
    startPage: number;
    startIndex: number;
}
export {};
//# sourceMappingURL=Book.d.ts.map