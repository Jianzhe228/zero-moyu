/**
 * 文件服务
 * 负责文件的读取、编码检测等操作
 */
export declare class FileService {
    /**
     * 读取文件内容并自动检测编码
     */
    readFileWithEncoding(filePath: string): string;
    /**
     * 检查文件是否存在
     */
    fileExists(filePath: string): boolean;
    /**
     * 获取文件大小
     */
    getFileSize(filePath: string): number;
    /**
     * 获取文件名（不含路径）
     */
    getFileName(filePath: string): string;
    /**
     * 获取文件扩展名
     */
    getFileExtension(filePath: string): string;
    /**
     * 检查是否为支持的文件类型
     */
    isSupportedFile(filePath: string): boolean;
    /**
     * 格式化文件大小
     */
    formatFileSize(bytes: number): string;
    /**
     * 获取文件信息
     */
    getFileInfo(filePath: string): any;
    /**
     * 尝试加载 iconv-lite 模块（用于中文编码转换）
     */
    private tryRequireIconv;
    /**
     * 简单的编码有效性检测
     */
    private isValidEncoding;
    /**
     * 选择文件对话框
     */
    selectFile(): Promise<string | undefined>;
    /**
     * 选择多个文件
     */
    selectMultipleFiles(): Promise<string[]>;
    /**
     * 选择文件夹
     */
    selectFolder(): Promise<string | undefined>;
    /**
     * 在文件夹中查找所有TXT文件
     */
    findTxtFilesInFolder(folderPath: string): Promise<string[]>;
}
//# sourceMappingURL=FileService.d.ts.map