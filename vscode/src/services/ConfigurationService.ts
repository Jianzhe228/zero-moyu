// services/ConfigurationService.ts - 完整修复版本
import * as vscode from 'vscode';

export class ConfigurationService {
    private static readonly CONFIG_SECTION = 'zero-moyu';

    /**
     * 获取每页文字数量
     */
    getPageSize(): number {
        return vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
            .get<number>('pageSize', 50);
    }

    /**
     * 获取换行分隔符
     */
    getLineBreak(): string {
        return vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
            .get<string>('lineBreak', ' ');
    }

    /**
     * 获取最近阅读文件列表
     */
    getRecentFiles(): string[] {
        const files = vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
            .get<string[]>('recentFiles', []);
        // 返回数组的副本，避免 Proxy 问题
        return [...files];
    }

    /**
     * 更新最近阅读文件列表 - 修复版本
     */
    async updateRecentFiles(files: string[]): Promise<void> {
        try {
            // 创建纯净的数组副本，去除任何 Proxy
            const cleanFiles = JSON.parse(JSON.stringify(files));
            
            await vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
                .update('recentFiles', cleanFiles, vscode.ConfigurationTarget.Global);
            
            console.log('✅ Recent files updated successfully');
        } catch (error) {
            console.error('Error updating recent files:', error);
            throw error;
        }
    }

    /**
     * 获取图书库文件列表 - 修复版本
     */
    getFileLibrary(): string[] {
        const library = vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
            .get<string[]>('fileLibrary', []);
        // 返回数组的副本，避免 Proxy 问题
        return [...library];
    }

    /**
     * 更新图书库文件列表 - 完全修复版本（这是关键！）
     */
    async updateFileLibrary(files: string[]): Promise<void> {
        try {
            // 方法1：使用 JSON 序列化创建深拷贝，完全去除 Proxy
            const cleanFiles = JSON.parse(JSON.stringify(files));
            
            // 方法2：如果上面的方法不行，使用 map 创建新数组
            // const cleanFiles = files.map(f => String(f));
            
            // 获取配置对象
            const config = vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION);
            
            // 使用 await 等待更新完成
            await config.update('fileLibrary', cleanFiles, vscode.ConfigurationTarget.Global);
            
            console.log(`✅ File library updated successfully with ${cleanFiles.length} files`);
            
        } catch (error) {
            console.error('❌ Error updating file library:', error);
            
            // 备用方案：尝试直接设置
            try {
                const allConfig = vscode.workspace.getConfiguration();
                await allConfig.update(
                    `${ConfigurationService.CONFIG_SECTION}.fileLibrary`, 
                    files.filter(f => f), // 过滤掉任何 falsy 值
                    vscode.ConfigurationTarget.Global
                );
                console.log('✅ File library updated using fallback method');
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError);
                throw fallbackError;
            }
        }
    }

    /**
     * 获取阅读进度记录
     */
    getReadingProgress(filePath: string): any {
        const allProgress = vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
            .get<any>('readingProgress', {});
        return allProgress[filePath];
    }

    /**
     * 保存阅读进度 - 修复版本
     */
    async saveReadingProgress(filePath: string, progress: any): Promise<void> {
        try {
            const allProgress = vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
                .get<any>('readingProgress', {});
            
            // 创建深拷贝
            const newProgress = JSON.parse(JSON.stringify(allProgress));
            newProgress[filePath] = progress;
            
            await vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
                .update('readingProgress', newProgress, vscode.ConfigurationTarget.Global);
                
        } catch (error) {
            console.error('Error saving reading progress:', error);
        }
    }

    /**
     * 获取最近阅读列表最大数量
     */
    getMaxRecentFiles(): number {
        return vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
            .get<number>('maxRecentFiles', 10);
    }

    /**
     * 移除指定文件的阅读进度 - 修复版本
     */
    async removeReadingProgress(filePath: string): Promise<void> {
        try {
            const allProgress = vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
                .get<{[key: string]: any}>('readingProgress', {});

            // 创建深拷贝
            const newProgress = JSON.parse(JSON.stringify(allProgress));
            
            if (filePath in newProgress) {
                delete newProgress[filePath];
                
                await vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
                    .update('readingProgress', newProgress, vscode.ConfigurationTarget.Global);

                console.log(`✅ Removed reading progress for: ${filePath}`);
            }
        } catch (error) {
            console.error('Error removing reading progress:', error);
        }
    }

    /**
     * 清理配置
     */
    async clearAllProgress(): Promise<void> {
        try {
            await vscode.workspace.getConfiguration(ConfigurationService.CONFIG_SECTION)
                .update('readingProgress', {}, vscode.ConfigurationTarget.Global);
        } catch (error) {
            console.error('Error clearing all progress:', error);
        }
    }

    /**
     * 获取所有配置
     */
    getAllConfig(): any {
        return {
            pageSize: this.getPageSize(),
            lineBreak: this.getLineBreak(),
            maxRecentFiles: this.getMaxRecentFiles(),
            recentFilesCount: this.getRecentFiles().length,
            libraryCount: this.getFileLibrary().length
        };
    }
}