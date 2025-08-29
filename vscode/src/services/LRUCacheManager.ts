import { Book } from '../models/Book';
import { ConfigurationService } from './ConfigurationService';

export interface CacheEntry {
    book: Book;
    lastAccess: number;
    memorySize: number;
}

export class LRUCacheManager {
    private cache: Map<string, CacheEntry> = new Map();
    private maxCacheSize: number = 5; // 最大缓存图书数量
    private maxMemoryMB: number = 100; // 最大内存使用量（MB）
    private currentMemoryUsage: number = 0; // 当前内存使用量（字节）

    constructor(private configService: ConfigurationService) { }

    /**
     * 获取或创建图书实例
     */
    async getOrCreateBook(filePath: string): Promise<Book | null> {
        try {
            // 如果已缓存，更新访问时间并返回
            if (this.cache.has(filePath)) {
                const entry = this.cache.get(filePath)!;
                entry.lastAccess = Date.now();
                this.moveToFront(filePath);
                return entry.book;
            }

            // 创建新的图书实例
            const book = new Book(filePath, this.configService);
            await book.initialize();

            // 估算内存使用
            const memorySize = this.estimateMemorySize(book);

            // 检查是否需要清理缓存
            await this.ensureCacheSpace(memorySize);

            // 添加到缓存
            const entry: CacheEntry = {
                book,
                lastAccess: Date.now(),
                memorySize
            };

            this.cache.set(filePath, entry);
            this.currentMemoryUsage += memorySize;

            return book;
        } catch (error) {
            console.error(`Failed to get or create book: ${filePath}`, error);
            return null;
        }
    }

    /**
     * 移动到缓存最前面（LRU）
     */
    private moveToFront(filePath: string): void {
        const entry = this.cache.get(filePath);
        if (entry) {
            this.cache.delete(filePath);
            this.cache.set(filePath, entry);
        }
    }

    /**
     * 确保有足够的缓存空间
     */
    private async ensureCacheSpace(requiredSize: number): Promise<void> {
        const maxMemoryBytes = this.maxMemoryMB * 1024 * 1024;

        // 如果超过最大缓存数量或内存限制，清理最少使用的
        while (
            (this.cache.size >= this.maxCacheSize ||
                this.currentMemoryUsage + requiredSize > maxMemoryBytes) &&
            this.cache.size > 0
        ) {
            await this.evictLRU();
        }
    }

    /**
     * 清理最少使用的缓存项
     */
    private async evictLRU(): Promise<void> {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        // 找出最久未使用的缓存项
        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccess < oldestTime) {
                oldestTime = entry.lastAccess;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            await this.removeFromCache(oldestKey);
        }
    }

    /**
     * 从缓存中移除
     */
    async removeFromCache(filePath: string): Promise<void> {
        const entry = this.cache.get(filePath);
        if (entry) {
            try {
                // 安全释放资源
                if (entry.book && typeof entry.book.dispose === 'function') {
                    entry.book.dispose();
                }
                this.currentMemoryUsage -= entry.memorySize;
                this.cache.delete(filePath);
                console.log(`📤 Evicted from cache: ${filePath}`);
            } catch (error) {
                console.warn(`Error during cache eviction: ${error}`);
                // 即使出错也要删除缓存项
                this.cache.delete(filePath);
            }
        }
    }

    /**
     * 估算图书占用的内存大小
     */
    private estimateMemorySize(book: Book): number {
        try {
            // 基础内存占用（对象开销）
            let size = 1024; // 1KB base

            // 估算文本内容大小（假设每个字符2字节）
            const totalChars = book.getTotalPages() * 50; // 假设每页50字符
            size += totalChars * 2;

            // 章节信息占用
            const chapters = book.getChapterList();
            size += chapters.length * 100; // 每个章节约100字节

            return size;
        } catch {
            return 10240; // 默认10KB
        }
    }

    /**
     * 清理所有缓存
     */
    async clearAll(): Promise<void> {
        for (const [key] of this.cache.entries()) {
            await this.removeFromCache(key);
        }
        this.currentMemoryUsage = 0;
    }

    /**
     * 获取缓存统计信息
     */
    getStats(): {
        cacheSize: number;
        memoryUsageMB: number;
        maxMemoryMB: number;
        entries: Array<{ path: string; lastAccess: Date; sizeMB: number }>;
    } {
        const entries = Array.from(this.cache.entries()).map(([path, entry]) => ({
            path,
            lastAccess: new Date(entry.lastAccess),
            sizeMB: entry.memorySize / (1024 * 1024)
        }));

        return {
            cacheSize: this.cache.size,
            memoryUsageMB: this.currentMemoryUsage / (1024 * 1024),
            maxMemoryMB: this.maxMemoryMB,
            entries
        };
    }

    /**
     * 设置最大缓存大小
     */
    setMaxCacheSize(size: number): void {
        this.maxCacheSize = Math.max(1, size);
    }

    /**
     * 设置最大内存使用量
     */
    setMaxMemory(mb: number): void {
        this.maxMemoryMB = Math.max(10, mb);
    }
}