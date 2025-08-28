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
exports.Book = void 0;
const FileService_1 = require("../services/FileService");
const fs = __importStar(require("fs"));
const iconv = __importStar(require("iconv-lite"));
/**
 * 图书模型
 * 表示一本图书的所有信息和操作
 * 重构后的版本，参考IDEA插件的优秀实现
 */
class Book {
    constructor(filePath, configService) {
        this.filePath = filePath;
        this.configService = configService;
        this.currentPageNumber = 1;
        this.totalPages = 0;
        this.pageSize = 50;
        this.lineBreak = ' ';
        this.chapters = [];
        // 缓存机制 - 学习IDEA插件
        this.cachedText = null;
        this.cachedFilePath = '';
        this.cachedConfig = null;
        // 分页边界计算 - 学习IDEA插件
        this.start = 0;
        this.end = 0;
        this.fileService = new FileService_1.FileService();
        this.refreshConfiguration();
    }
    /**
    * 安全释放资源
    */
    dispose() {
        try {
            // 只清理基本属性，不进行复杂操作
            this.cachedText = null;
            this.cachedFilePath = '';
            this.cachedConfig = null;
            this.chapters = [];
            // 不需要其他清理操作
        }
        catch (error) {
            // 忽略所有错误
            console.warn('Error during dispose:', error);
        }
    }
    /**
     * 初始化图书 - 重构版本，学习IDEA插件
     */
    async initialize() {
        try {
            // 预加载文件内容到缓存
            this.readFile();
            // 计算总页数
            this.calculateTotalPages();
            // 计算分页边界
            this.getStartEnd();
            // 识别章节
            this.identifyChapters();
        }
        catch (error) {
            throw new Error(`初始化图书失败: ${error}`);
        }
    }
    /**
     * 读取文件 - 学习IDEA插件的实现
     */
    readFile() {
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
        }
        catch (error) {
            console.error(`Failed to read file: ${this.filePath}`, error);
            return '';
        }
    }
    /**
     * 文本内容处理 - 学习IDEA插件的processTextContent
     */
    processTextContent(data, config) {
        // 使用StringBuilder优化字符串处理性能
        const result = [];
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
                    }
                    else {
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
     * 字符集检测 - 学习IDEA插件
     */
    detectCharset(bytes) {
        // 简单的字符集检测，优先UTF-8
        try {
            // 尝试UTF-8解码
            const utf8Text = iconv.decode(bytes, 'utf8');
            // 检查是否包含无效字符
            if (utf8Text.includes('�')) {
                return 'gbk'; // 如果UTF-8解码失败，尝试GBK
            }
            return 'utf8';
        }
        catch (error) {
            return 'gbk';
        }
    }
    /**
     * 获取缓存配置 - 学习IDEA插件
     */
    getCachedConfig() {
        if (this.cachedConfig === null) {
            this.cachedConfig = {
                pageSize: this.pageSize,
                lineBreak: this.lineBreak
            };
        }
        return this.cachedConfig;
    }
    /**
     * 计算分页边界 - 学习IDEA插件的getStartEnd
     */
    getStartEnd() {
        this.start = (this.currentPageNumber - 1) * this.pageSize;
        this.end = this.currentPageNumber * this.pageSize;
        if (this.cachedText) {
            this.start = Math.max(0, Math.min(this.start, this.cachedText.length));
            this.end = Math.max(this.start, Math.min(this.end, this.cachedText.length));
        }
    }
    /**
     * 获取当前页内容 - 重构版本
     */
    getCurrentPageContent() {
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
     * 获取指定页面内容 - 重构版本
     */
    getPageContent(pageNumber) {
        if (pageNumber < 1 || pageNumber > this.totalPages) {
            return '';
        }
        const text = this.readFile();
        const startIndex = (pageNumber - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, text.length);
        return text.substring(startIndex, endIndex);
    }
    /**
     * 跳转到指定页面 - 学习IDEA插件的getJumpingPage
     */
    getJumpingPage(targetPage = this.currentPageNumber) {
        if (targetPage < 1 || targetPage > this.totalPages) {
            return `页码超出范围 (1-${this.totalPages})`;
        }
        this.currentPageNumber = targetPage;
        this.getStartEnd();
        return this.getCurrentPageContent();
    }
    /**
     * 获取当前页内容并格式化显示（包含页码信息）- 学习IDEA插件的formatStatusBarContent
     */
    getFormattedCurrentPageContent() {
        const content = this.getCurrentPageContent();
        const pageInfo = `${this.currentPageNumber}/${this.totalPages}`;
        return this.formatStatusBarContent(content, pageInfo);
    }
    /**
     * 格式化状态栏内容 - 学习IDEA插件的实现
     */
    formatStatusBarContent(content, pageInfo) {
        if (!content) {
            return pageInfo;
        }
        const maxContentLength = 200; // 最大内容长度
        const ellipsis = '...';
        const pageInfoSeparator = ' ';
        if (content.length > maxContentLength) {
            let truncatedContent = content.substring(0, maxContentLength - ellipsis.length);
            // 智能截断：在合适的位置截断
            const lastSpace = Math.max(truncatedContent.lastIndexOf(' '), truncatedContent.lastIndexOf('，'), truncatedContent.lastIndexOf('。'), truncatedContent.lastIndexOf(','), truncatedContent.lastIndexOf('.'));
            if (lastSpace > maxContentLength * 0.6) {
                truncatedContent = truncatedContent.substring(0, lastSpace) + ellipsis;
            }
            else {
                truncatedContent = truncatedContent + ellipsis;
            }
            return truncatedContent + pageInfoSeparator + `(${pageInfo})`;
        }
        else {
            return content + pageInfoSeparator + `(${pageInfo})`;
        }
    }
    /**
     * 分页导航 - 学习IDEA插件的getPage方法
     */
    getPage(type) {
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
     * 下一页 - 重构版本
     */
    nextPage() {
        const nextPageNum = this.getPage('next');
        return this.getJumpingPage(nextPageNum);
    }
    /**
     * 上一页 - 重构版本
     */
    previousPage() {
        const prevPageNum = this.getPage('previous');
        return this.getJumpingPage(prevPageNum);
    }
    /**
     * 跳转到指定页面 - 重构版本
     */
    jumpToPage(pageNumber) {
        return this.getJumpingPage(pageNumber);
    }
    /**
     * 智能跳转（页码或关键词搜索）- 重构版本
     */
    smartJump(input) {
        // 尝试解析为数字
        const pageNum = parseInt(input);
        if (!isNaN(pageNum)) {
            // 如果是纯数字，按页码跳转
            return this.jumpToPage(pageNum);
        }
        else {
            // 如果是文字，按搜索跳转
            return this.searchText(input);
        }
    }
    /**
     * 搜索文本 - 学习IDEA插件的searchText方法
     */
    searchText(keyword) {
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
     * 下一章 - 学习IDEA插件的jumpToNextChapter
     */
    nextChapter() {
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
     * 上一章 - 学习IDEA插件的jumpToPreviousChapter
     */
    previousChapter() {
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
     * 获取章节列表 - 学习IDEA插件
     */
    getChapters() {
        if (this.chapters.length === 0) {
            this.chapters = this.detectChapters();
        }
        return this.chapters;
    }
    /**
     * 获取章节标题列表（兼容旧接口）- 修复重复标题问题
     */
    getChapterList() {
        return this.getChapters().map(chapter => `${chapter.title} (第${chapter.startPage}页)`);
    }
    /**
     * 跳转到指定章节 - 学习IDEA插件
     */
    jumpToChapter(chapterIndex) {
        const chapters = this.getChapters();
        if (chapterIndex < 0 || chapterIndex >= chapters.length) {
            return '章节索引超出范围';
        }
        const chapter = chapters[chapterIndex];
        return this.getJumpingPage(chapter.startPage);
    }
    /**
     * 获取当前章节信息 - 学习IDEA插件
     */
    getCurrentChapter() {
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
    getCurrentPageNumber() {
        return this.currentPageNumber;
    }
    /**
     * 获取总页数
     */
    getTotalPages() {
        return this.totalPages;
    }
    /**
     * 获取文件路径
     */
    getFilePath() {
        return this.filePath;
    }
    /**
     * 获取文件名
     */
    getFileName() {
        return this.fileService.getFileName(this.filePath);
    }
    /**
     * 刷新配置 - 重构版本，学习IDEA插件
     */
    refreshConfiguration() {
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
     * 计算总页数 - 重构版本
     */
    calculateTotalPages() {
        const text = this.readFile();
        this.totalPages = Math.max(1, Math.ceil(text.length / this.pageSize));
    }
    /**
     * 清理缓存 - 修复版本，避免 Proxy 错误
     */
    cleanup() {
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
        }
        catch (error) {
            console.error(`Error during cleanup for ${this.filePath}:`, error);
            // 即使清理失败也不要抛出异常
        }
    }
    /**
     * 识别章节 - 完全重构，学习IDEA插件的detectChapters方法
     */
    identifyChapters() {
        this.chapters = this.detectChapters();
    }
    /**
     * 章节检测 - 学习IDEA插件的精确实现
     */
    detectChapters() {
        const text = this.readFile();
        const chapters = [];
        const usedPositions = new Set();
        console.log('开始章节检测...');
        // 更精确的章节检测 - 完全按照IDEA插件的模式
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
        // 获取配置中的分隔符 - 这是关键！
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
exports.Book = Book;
//# sourceMappingURL=Book.js.map