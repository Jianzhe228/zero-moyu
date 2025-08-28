/**
 * 章节检测工具
 * 用于识别文本中的章节标题
 */
export class ChapterDetector {
    
    /**
     * 检测章节标题的正则表达式模式
     */
    private static readonly CHAPTER_PATTERNS = [
        // 中文数字章节
        /第[一二三四五六七八九十百千万零壹贰叁肆伍陆柒捌玖拾佰仟萬]+章[：:\s]*.{0,50}/g,
        /第[一二三四五六七八九十百千万零壹贰叁肆伍陆柒捌玖拾佰仟萬]+节[：:\s]*.{0,50}/g,
        /第[一二三四五六七八九十百千万零壹贰叁肆伍陆柒捌玖拾佰仟萬]+回[：:\s]*.{0,50}/g,
        
        // 阿拉伯数字章节
        /第\d+章[：:\s]*.{0,50}/g,
        /第\d+节[：:\s]*.{0,50}/g,
        /第\d+回[：:\s]*.{0,50}/g,
        
        // 英文章节
        /Chapter\s+\d+[：:\s]*.{0,50}/gi,
        /Section\s+\d+[：:\s]*.{0,50}/gi,
        
        // 序号章节
        /[一二三四五六七八九十百千万零壹贰叁肆伍陆柒捌玖拾佰仟萬]+[、\.]\s*.{0,50}/g,
        /\d+[、\.]\s*.{0,50}/g,
        
        // 特殊格式
        /【第[一二三四五六七八九十百千万零壹贰叁肆伍陆柒捌玖拾佰仟萬\d]+章】.{0,50}/g,
        /\[第[一二三四五六七八九十百千万零壹贰叁肆伍陆柒捌玖拾佰仟萬\d]+章\].{0,50}/g,
        /（第[一二三四五六七八九十百千万零壹贰叁肆伍陆柒捌玖拾佰仟萬\d]+章）.{0,50}/g,
        
        // 卷章节
        /第[一二三四五六七八九十百千万零壹贰叁肆伍陆柒捌玖拾佰仟萬\d]+卷[：:\s]*.{0,50}/g,
        /第[一二三四五六七八九十百千万零壹贰叁肆伍陆柒捌玖拾佰仟萬\d]+部[：:\s]*.{0,50}/g,
        
        // 楔子、序章、尾声等
        /楔子[：:\s]*.{0,50}/g,
        /序章[：:\s]*.{0,50}/g,
        /序言[：:\s]*.{0,50}/g,
        /前言[：:\s]*.{0,50}/g,
        /尾声[：:\s]*.{0,50}/g,
        /后记[：:\s]*.{0,50}/g,
        /番外[：:\s]*.{0,50}/g
    ];

    /**
     * 检测文本中的所有章节
     */
    static detectChapters(content: string, pageSize: number): Chapter[] {
        const chapters: Chapter[] = [];
        const foundChapters = new Set<string>(); // 用于去重

        for (const pattern of this.CHAPTER_PATTERNS) {
            let match;
            // 重置正则表达式的 lastIndex
            pattern.lastIndex = 0;
            
            while ((match = pattern.exec(content)) !== null) {
                const startIndex = match.index;
                const title = match[0].trim();
                
                // 去重：避免同一位置的重复匹配
                const key = `${startIndex}-${title}`;
                if (foundChapters.has(key)) {
                    continue;
                }
                foundChapters.add(key);

                // 计算章节所在页码
                const startPage = Math.floor(startIndex / pageSize) + 1;
                
                // 清理标题
                const cleanTitle = this.cleanChapterTitle(title);
                
                chapters.push({
                    index: chapters.length,
                    title: cleanTitle,
                    startPage: startPage,
                    startIndex: startIndex
                });
            }
        }

        // 按起始位置排序
        chapters.sort((a, b) => a.startIndex - b.startIndex);
        
        // 重新分配索引
        chapters.forEach((chapter, index) => {
            chapter.index = index;
        });

        // 过滤掉可能的误识别
        return this.filterValidChapters(chapters);
    }

    /**
     * 清理章节标题
     */
    private static cleanChapterTitle(title: string): string {
        // 移除多余的空白字符
        let cleaned = title.replace(/\s+/g, ' ').trim();
        
        // 限制标题长度
        if (cleaned.length > 50) {
            cleaned = cleaned.substring(0, 50) + '...';
        }
        
        // 移除特殊字符
        cleaned = cleaned.replace(/[【】\[\]（）()]/g, '');
        
        return cleaned;
    }

    /**
     * 过滤有效的章节
     */
    private static filterValidChapters(chapters: Chapter[]): Chapter[] {
        if (chapters.length === 0) {
            return chapters;
        }

        const validChapters: Chapter[] = [];
        
        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            
            // 检查章节间距是否合理
            if (i > 0) {
                const prevChapter = chapters[i - 1];
                const distance = chapter.startIndex - prevChapter.startIndex;
                
                // 如果两个章节距离太近（小于100个字符），可能是误识别
                if (distance < 100) {
                    continue;
                }
            }
            
            // 检查标题是否合理
            if (this.isValidChapterTitle(chapter.title)) {
                validChapters.push(chapter);
            }
        }

        // 重新分配索引
        validChapters.forEach((chapter, index) => {
            chapter.index = index;
        });

        return validChapters;
    }

    /**
     * 检查是否为有效的章节标题
     */
    private static isValidChapterTitle(title: string): boolean {
        // 标题不能为空
        if (!title || title.trim().length === 0) {
            return false;
        }

        // 标题不能太短
        if (title.trim().length < 2) {
            return false;
        }

        // 标题不能全是数字或符号
        if (/^[\d\s\-_=+.。，,！!？?；;：:]+$/.test(title)) {
            return false;
        }

        return true;
    }

    /**
     * 获取章节统计信息
     */
    static getChapterStats(chapters: Chapter[]): ChapterStats {
        if (chapters.length === 0) {
            return {
                totalChapters: 0,
                averageLength: 0,
                shortestChapter: null,
                longestChapter: null
            };
        }

        const lengths: number[] = [];
        
        for (let i = 0; i < chapters.length; i++) {
            const currentChapter = chapters[i];
            const nextChapter = chapters[i + 1];
            
            const length = nextChapter 
                ? nextChapter.startIndex - currentChapter.startIndex
                : 1000; // 最后一章假设长度
                
            lengths.push(length);
        }

        const averageLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
        const shortestLength = Math.min(...lengths);
        const longestLength = Math.max(...lengths);
        
        const shortestIndex = lengths.indexOf(shortestLength);
        const longestIndex = lengths.indexOf(longestLength);

        return {
            totalChapters: chapters.length,
            averageLength: Math.round(averageLength),
            shortestChapter: {
                index: shortestIndex,
                title: chapters[shortestIndex].title,
                length: shortestLength
            },
            longestChapter: {
                index: longestIndex,
                title: chapters[longestIndex].title,
                length: longestLength
            }
        };
    }

    /**
     * 根据当前位置查找所在章节
     */
    static findCurrentChapter(chapters: Chapter[], currentIndex: number): Chapter | null {
        if (chapters.length === 0) {
            return null;
        }

        for (let i = chapters.length - 1; i >= 0; i--) {
            if (chapters[i].startIndex <= currentIndex) {
                return chapters[i];
            }
        }

        return null;
    }

    /**
     * 查找下一章节
     */
    static findNextChapter(chapters: Chapter[], currentChapter: Chapter): Chapter | null {
        const currentIndex = currentChapter.index;
        if (currentIndex < chapters.length - 1) {
            return chapters[currentIndex + 1];
        }
        return null;
    }

    /**
     * 查找上一章节
     */
    static findPreviousChapter(chapters: Chapter[], currentChapter: Chapter): Chapter | null {
        const currentIndex = currentChapter.index;
        if (currentIndex > 0) {
            return chapters[currentIndex - 1];
        }
        return null;
    }
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
