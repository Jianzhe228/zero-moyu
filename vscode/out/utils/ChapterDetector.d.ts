/**
 * 章节检测工具
 * 用于识别文本中的章节标题
 */
export declare class ChapterDetector {
    /**
     * 检测章节标题的正则表达式模式
     */
    private static readonly CHAPTER_PATTERNS;
    /**
     * 检测文本中的所有章节
     */
    static detectChapters(content: string, pageSize: number): Chapter[];
    /**
     * 清理章节标题
     */
    private static cleanChapterTitle;
    /**
     * 过滤有效的章节
     */
    private static filterValidChapters;
    /**
     * 检查是否为有效的章节标题
     */
    private static isValidChapterTitle;
    /**
     * 获取章节统计信息
     */
    static getChapterStats(chapters: Chapter[]): ChapterStats;
    /**
     * 根据当前位置查找所在章节
     */
    static findCurrentChapter(chapters: Chapter[], currentIndex: number): Chapter | null;
    /**
     * 查找下一章节
     */
    static findNextChapter(chapters: Chapter[], currentChapter: Chapter): Chapter | null;
    /**
     * 查找上一章节
     */
    static findPreviousChapter(chapters: Chapter[], currentChapter: Chapter): Chapter | null;
}
/**
 * 章节接口
 */
export interface Chapter {
    index: number;
    title: string;
    startPage: number;
    startIndex: number;
}
/**
 * 章节统计信息接口
 */
export interface ChapterStats {
    totalChapters: number;
    averageLength: number;
    shortestChapter: {
        index: number;
        title: string;
        length: number;
    } | null;
    longestChapter: {
        index: number;
        title: string;
        length: number;
    } | null;
}
//# sourceMappingURL=ChapterDetector.d.ts.map