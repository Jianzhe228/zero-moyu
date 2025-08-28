export declare class ConfigurationService {
    private static readonly CONFIG_SECTION;
    /**
     * 获取每页文字数量
     */
    getPageSize(): number;
    /**
     * 获取换行分隔符
     */
    getLineBreak(): string;
    /**
     * 获取最近阅读文件列表
     */
    getRecentFiles(): string[];
    /**
     * 更新最近阅读文件列表 - 修复版本
     */
    updateRecentFiles(files: string[]): Promise<void>;
    /**
     * 获取图书库文件列表 - 修复版本
     */
    getFileLibrary(): string[];
    /**
     * 更新图书库文件列表 - 完全修复版本（这是关键！）
     */
    updateFileLibrary(files: string[]): Promise<void>;
    /**
     * 获取阅读进度记录
     */
    getReadingProgress(filePath: string): any;
    /**
     * 保存阅读进度 - 修复版本
     */
    saveReadingProgress(filePath: string, progress: any): Promise<void>;
    /**
     * 获取最近阅读列表最大数量
     */
    getMaxRecentFiles(): number;
    /**
     * 移除指定文件的阅读进度 - 修复版本
     */
    removeReadingProgress(filePath: string): Promise<void>;
    /**
     * 清理配置
     */
    clearAllProgress(): Promise<void>;
    /**
     * 获取所有配置
     */
    getAllConfig(): any;
}
//# sourceMappingURL=ConfigurationService.d.ts.map