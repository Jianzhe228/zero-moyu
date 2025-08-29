import { ConfigurationService } from '../services/ConfigurationService';
import { FileService } from '../services/FileService';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';

/**
 * 图书模型
 */
export class Book {
    private currentPageNumber: number = 1;
    private totalPages: number = 0;
    private pageSize: number = 50;
    private lineBreak: string = ' ';
    private chapters: Chapter[] = [];
    private fileService: FileService;

    // 缓存机制
    private cachedText: string | null = null;
    private cachedFilePath: string = '';
    private cachedConfig: BookConfig | null = null;

    // 分页边界计算
    private start: number = 0;
    private end: number = 0;

    constructor(
        private filePath: string,
        private configService: ConfigurationService
    ) {
        this.fileService = new FileService();
        this.refreshConfiguration();
    }

    /**
    * 安全释放资源
    */
    dispose(): void {
        try {
            // 只清理基本属性，不进行复杂操作
            this.cachedText = null;
            this.cachedFilePath = '';
            this.cachedConfig = null;
            this.chapters = [];

            // 不需要其他清理操作
        } catch (error) {
            // 忽略所有错误
            console.warn('Error during dispose:', error);
        }
    }

    /**
     * 初始化图书
     */
    async initialize(): Promise<void> {
        try {
            // 预加载文件内容到缓存
            this.readFile();

            // 计算总页数
            this.calculateTotalPages();

            // 计算分页边界
            this.getStartEnd();

            // 识别章节
            this.identifyChapters();

        } catch (error) {
            throw new Error(`初始化图书失败: ${error}`);
        }
    }

    /**
     * 读取文件
     */
    private readFile(): string {
        if (this.filePath === '') {
            return '';
        }

        // 使用缓存机制
        if (this.cachedText !== null && this.cachedFilePath === this.filePath) {
            return this.cachedText;
        }

        try {
            // 读取文件字节
            const bytes = fs.readFileSync(this.filePath);

            // 检测字符编码
            const charset = this.detectCharset(bytes);

            // 解码文本
            const data = iconv.decode(bytes, charset);

            // 处理文本内容
            const config = this.getCachedConfig();
            this.cachedText = this.processTextContent(data, config);
            this.cachedFilePath = this.filePath;

            console.log(`Successfully loaded file: ${this.filePath} (${this.cachedText.length} chars)`);
            return this.cachedText;

        } catch (error) {
            console.error(`Failed to read file: ${this.filePath}`, error);
            return '';
        }
    }

    /**
     * 文本内容处理
     */
    private processTextContent(data: string, config: BookConfig): string {
        // 使用StringBuilder优化字符串处理性能
        const result: string[] = [];

        for (let i = 0; i < data.length; i++) {
            const char = data[i];
            switch (char) {
                case '\n':
                    result.push(config.lineBreak);
                    break;
                case '\r':
                    result.push(' ');
                    break;
                case '　': // 全角空格
                    if (i + 1 < data.length && data[i + 1] === '　') {
                        result.push(' ');
                        i++; // 跳过下一个全角空格
                    } else {
                        result.push(char);
                    }
                    break;
                case ' ':
                    result.push(' ');
                    break;
                default:
                    result.push(char);
                    break;
            }
        }
        return result.join('');
    }

    /**
     * 字符集检测
     */
    private detectCharset(bytes: Buffer): string {
        // 简单的字符集检测，优先UTF-8
        try {
            // 尝试UTF-8解码
            const utf8Text = iconv.decode(bytes, 'utf8');
            // 检查是否包含无效字符
            if (utf8Text.includes('�')) {
                return 'gbk'; // 如果UTF-8解码失败，尝试GBK
            }
            return 'utf8';
        } catch (error) {
            return 'gbk';
        }
    }

    /**
     * 获取缓存配置
     */
    private getCachedConfig(): BookConfig {
        if (this.cachedConfig === null) {
            this.cachedConfig = {
                pageSize: this.pageSize,
                lineBreak: this.lineBreak
            };
        }
        return this.cachedConfig;
    }

    /**
     * 计算分页边界
     */
    private getStartEnd(): void {
        this.start = (this.currentPageNumber - 1) * this.pageSize;
        this.end = this.currentPageNumber * this.pageSize;

        if (this.cachedText) {
            this.start = Math.max(0, Math.min(this.start, this.cachedText.length));
            this.end = Math.max(this.start, Math.min(this.end, this.cachedText.length));
        }
    }

    /**
     * 获取当前页内容
     */
    getCurrentPageContent(): string {
        const text = this.readFile();
        this.getStartEnd();

        if (text === '') {
            return '';
        }

        const endIndex = Math.min(this.end, text.length);
        const content = text.substring(this.start, endIndex);
        return content;
    }

    /**
     * 获取指定页面内容
     */
    getPageContent(pageNumber: number): string {
        if (pageNumber < 1 || pageNumber > this.totalPages) {
            return '';
        }

        const text = this.readFile();
        const startIndex = (pageNumber - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, text.length);

        return text.substring(startIndex, endIndex);
    }

    /**
     * 跳转到指定页面
     */
    private getJumpingPage(targetPage: number = this.currentPageNumber): string {
        if (targetPage < 1 || targetPage > this.totalPages) {
            return `页码超出范围 (1-${this.totalPages})`;
        }

        this.currentPageNumber = targetPage;
        this.getStartEnd();

        return this.getCurrentPageContent();
    }

    /**
     * 获取当前页内容并格式化显示（包含页码信息）
     */
    getFormattedCurrentPageContent(): string {
        const content = this.getCurrentPageContent();
        const pageInfo = `${this.currentPageNumber}/${this.totalPages}`;
        return this.formatStatusBarContent(content, pageInfo);
    }

    /**
     * 格式化状态栏内容
     */
    private formatStatusBarContent(content: string, pageInfo: string): string {
        if (!content) {
            return pageInfo;
        }

        const maxContentLength = 200; // 最大内容长度
        const ellipsis = '...';
        const pageInfoSeparator = ' ';

        if (content.length > maxContentLength) {
            let truncatedContent = content.substring(0, maxContentLength - ellipsis.length);

            // 智能截断：在合适的位置截断
            const lastSpace = Math.max(
                truncatedContent.lastIndexOf(' '),
                truncatedContent.lastIndexOf('，'),
                truncatedContent.lastIndexOf('。'),
                truncatedContent.lastIndexOf(','),
                truncatedContent.lastIndexOf('.')
            );

            if (lastSpace > maxContentLength * 0.6) {
                truncatedContent = truncatedContent.substring(0, lastSpace) + ellipsis;
            } else {
                truncatedContent = truncatedContent + ellipsis;
            }

            return truncatedContent + pageInfoSeparator + `(${pageInfo})`;
        } else {
            return content + pageInfoSeparator + `(${pageInfo})`;
        }
    }

    /**
     * 分页导航
     */
    private getPage(type: string): number {
        let page = 0;
        switch (type) {
            case 'previous':
                page = this.currentPageNumber <= 1 ? 1 : this.currentPageNumber - 1;
                break;
            case 'next':
                page = this.currentPageNumber >= this.totalPages ? this.totalPages : this.currentPageNumber + 1;
                break;
            default:
                page = this.currentPageNumber;
                break;
        }
        return page;
    }

    /**
     * 下一页
     */
    nextPage(): string {
        const nextPageNum = this.getPage('next');
        return this.getJumpingPage(nextPageNum);
    }

    /**
     * 上一页
     */
    previousPage(): string {
        const prevPageNum = this.getPage('previous');
        return this.getJumpingPage(prevPageNum);
    }

    /**
     * 跳转到指定页面
     */
    jumpToPage(pageNumber: number): string {
        return this.getJumpingPage(pageNumber);
    }

    /**
     * 智能跳转（页码或关键词搜索）
     */
    smartJump(input: string): string | null {
        // 尝试解析为数字
        const pageNum = parseInt(input);

        if (!isNaN(pageNum)) {
            // 如果是纯数字，按页码跳转
            return this.jumpToPage(pageNum);
        } else {
            // 如果是文字，按搜索跳转
            return this.searchText(input);
        }
    }

    /**
     * 搜索文本
     */
    searchText(keyword: string): string | null {
        if (!keyword || keyword.trim() === '') {
            return null;
        }

        const text = this.readFile();
        const keywordIndex = text.indexOf(keyword);

        if (keywordIndex === -1) {
            return null;
        }

        // 计算关键词所在的页码
        const targetPage = Math.floor(keywordIndex / this.pageSize) + 1;

        // 跳转到该页
        return this.getJumpingPage(targetPage);
    }

    /**
     * 下一章
     */
    nextChapter(): string {
        const chapters = this.getChapters();
        const currentPage = this.getCurrentPageNumber();

        // 找到当前页之后的第一个章节
        for (let i = 0; i < chapters.length; i++) {
            if (chapters[i].startPage > currentPage) {
                return this.jumpToChapter(i);
            }
        }

        // 如果没有找到，跳转到最后一章
        if (chapters.length > 0) {
            return this.jumpToChapter(chapters.length - 1);
        }

        return this.getCurrentPageContent();
    }

    /**
     * 上一章
     */
    previousChapter(): string {
        const chapters = this.getChapters();
        const currentPage = this.getCurrentPageNumber();

        // 找到当前页之前的最后一个章节
        for (let i = chapters.length - 1; i >= 0; i--) {
            if (chapters[i].startPage < currentPage) {
                return this.jumpToChapter(i);
            }
        }

        // 如果没有找到，跳转到第一章
        if (chapters.length > 0) {
            return this.jumpToChapter(0);
        }

        return this.getCurrentPageContent();
    }

    /**
     * 获取章节列表
     */
    getChapters(): Chapter[] {
        if (this.chapters.length === 0) {
            this.chapters = this.detectChapters();
        }
        return this.chapters;
    }

    /**
     * 获取章节标题列表（兼容旧接口）
     */
    getChapterList(): string[] {
        return this.getChapters().map(chapter =>
            `${chapter.title} (第${chapter.startPage}页)`
        );
    }

    /**
     * 跳转到指定章节
     */
    jumpToChapter(chapterIndex: number): string {
        const chapters = this.getChapters();

        if (chapterIndex < 0 || chapterIndex >= chapters.length) {
            return '章节索引超出范围';
        }

        const chapter = chapters[chapterIndex];
        return this.getJumpingPage(chapter.startPage);
    }

    /**
     * 获取当前章节信息
     */
    getCurrentChapter(): Chapter | null {
        const chapters = this.getChapters();
        const currentPage = this.getCurrentPageNumber();

        // 找到当前页对应的章节
        for (let i = chapters.length - 1; i >= 0; i--) {
            if (chapters[i].startPage <= currentPage) {
                return chapters[i];
            }
        }

        return null;
    }

    /**
     * 获取当前页码
     */
    getCurrentPageNumber(): number {
        return this.currentPageNumber;
    }

    /**
     * 获取总页数
     */
    getTotalPages(): number {
        return this.totalPages;
    }

    /**
     * 获取文件路径
     */
    getFilePath(): string {
        return this.filePath;
    }

    /**
     * 获取文件名
     */
    getFileName(): string {
        return this.fileService.getFileName(this.filePath);
    }

    /**
     * 刷新配置
     */
    refreshConfiguration(): void {
        this.pageSize = this.configService.getPageSize();
        this.lineBreak = this.configService.getLineBreak();

        // 清除缓存配置，强制重新创建
        this.cachedConfig = null;

        if (this.cachedText) {
            this.calculateTotalPages();
            this.getStartEnd();
        }
    }

    /**
     * 计算总页数
     */
    private calculateTotalPages(): void {
        const text = this.readFile();
        this.totalPages = Math.max(1, Math.ceil(text.length / this.pageSize));
    }

    /**
     * 清理缓存
     */
    cleanup(): void {
        try {
            console.log(`Cleaning up Book instance for: ${this.filePath}`);

            // 避免直接操作可能被代理的对象
            this.cachedText = null;
            this.cachedFilePath = '';
            this.cachedConfig = null;

            // 清空数组而不是重新赋值
            if (this.chapters && Array.isArray(this.chapters)) {
                this.chapters.length = 0;
            }

            // 重置基本类型
            this.currentPageNumber = 1;
            this.totalPages = 0;
            this.start = 0;
            this.end = this.pageSize;

            console.log(`Book instance cleaned up for: ${this.filePath}`);
        } catch (error) {
            console.error(`Error during cleanup for ${this.filePath}:`, error);
            // 即使清理失败也不要抛出异常
        }
    }

    /**
     * 识别章节
     */
    private identifyChapters(): void {
        this.chapters = this.detectChapters();
    }

    /**
     * 章节检测
     */
    private detectChapters(): Chapter[] {
        const text = this.readFile();
        const chapters: Chapter[] = [];
        const usedPositions = new Set<number>();

        console.log('开始章节检测...');

        // 更精确的章节检测
        const patterns = [
            // 中文章节：第X章 + 空格/标点
            /第[一二三四五六七八九十百千万\d]+章[\s：:,.。]/g,
            // 数字章节：第1章 + 空格/标点
            /第\d+章[\s：:,.。]/g,
            // 英文章节：Chapter 1 + 空格/标点
            /Chapter\s+[IVXLCDM\d]+[\s：:,.]/gi,
            // 英文章节：Chapter One + 空格/标点
            /Chapter\s+[A-Za-z]+[\s：:,.]/gi,
            // 中文章节：第X节 + 空格/标点
            /第[一二三四五六七八九十百千万\d]+节[\s：:,.。]/g,
            // 数字章节：第1节 + 空格/标点
            /第\d+节[\s：:,.。]/g
        ];

        // 获取配置中的分隔符
        const config = this.getCachedConfig();
        const lineBreak = config.lineBreak;

        // 对每种模式进行搜索
        for (const pattern of patterns) {
            let match;
            // 重置正则表达式的 lastIndex
            pattern.lastIndex = 0;

            while ((match = pattern.exec(text)) !== null) {
                const position = match.index;
                const chapterTitle = match[0];

                // 避免重复的位置
                if (usedPositions.has(position)) {
                    continue;
                }

                // 检查是否是独立的章节标题（不在单词中间）
                const prevChar = position > 0 ? text[position - 1] : '';
                if (prevChar && /[\w\u4e00-\u9fa5]/.test(prevChar)) {
                    continue; // 前面有字符，可能是单词的一部分
                }

                usedPositions.add(position);

                // 计算章节所在的页码
                const page = Math.floor(position / this.pageSize) + 1;

                // 清理章节标题（移除后面的标点符号）
                let cleanTitle = chapterTitle.replace(/[\s：:,.。]+$/, '');

                // 尝试获取完整的章节标题
                let fullTitle = cleanTitle;

                // 在标题后面查找内容，直到遇到分隔符或换行符
                const contentStart = position + chapterTitle.length;
                // 查找到下一行或者下一个分隔符
                let contentEnd = text.indexOf('\n', contentStart);
                if (contentEnd === -1) {
                    contentEnd = text.indexOf(lineBreak, contentStart);
                }
                if (contentEnd === -1) {
                    contentEnd = Math.min(contentStart + 50, text.length); // 限制搜索范围
                }

                if (contentEnd !== -1 && contentEnd > contentStart) {
                    const content = text.substring(contentStart, contentEnd).trim();
                    if (content) {
                        // 清理内容，移除多余的标点符号
                        const cleanContent = content.replace(/^[：:\s]+/, '').trim();
                        if (cleanContent && cleanContent.length < 30) { // 只添加较短的描述
                            fullTitle += '：' + cleanContent;
                        }
                    }
                }

                // 限制标题长度
                if (fullTitle.length > 50) {
                    fullTitle = fullTitle.substring(0, 50) + '...';
                }

                chapters.push({
                    index: chapters.length,
                    title: fullTitle,
                    startPage: page,
                    startIndex: position
                });

                console.log(`检测到章节: ${fullTitle} (位置: ${position}, 页码: ${page})`);
            }
        }

        // 按位置排序
        chapters.sort((a, b) => a.startIndex - b.startIndex);

        // 重新分配索引
        chapters.forEach((chapter, index) => {
            chapter.index = index;
        });

        console.log(`章节检测完成，共检测到 ${chapters.length} 个章节`);
        return chapters;
    }

}

/**
 * 配置接口
 */
interface BookConfig {
    pageSize: number;
    lineBreak: string;
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
