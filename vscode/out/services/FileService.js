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
exports.FileService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
/**
 * 文件服务
 * 负责文件的读取、编码检测等操作
 */
class FileService {
    /**
     * 读取文件内容并自动检测编码
     */
    readFileWithEncoding(filePath) {
        try {
            // 首先尝试读取文件的原始字节
            const buffer = fs.readFileSync(filePath);
            // 尝试不同的编码格式
            const encodings = ['utf8', 'gbk', 'gb2312', 'big5', 'utf16le'];
            for (const encoding of encodings) {
                try {
                    // 对于中文编码，需要特殊处理
                    if (encoding === 'gbk' || encoding === 'gb2312') {
                        const iconv = this.tryRequireIconv();
                        if (iconv) {
                            return iconv.decode(buffer, encoding);
                        }
                    }
                    else {
                        const content = buffer.toString(encoding);
                        // 简单的编码检测：检查是否包含乱码字符
                        if (this.isValidEncoding(content)) {
                            return content;
                        }
                    }
                }
                catch (error) {
                    // 继续尝试下一个编码
                    continue;
                }
            }
            // 如果所有编码都失败，使用默认的 UTF-8
            return buffer.toString('utf8');
        }
        catch (error) {
            throw new Error(`读取文件失败: ${error}`);
        }
    }
    /**
     * 检查文件是否存在
     */
    fileExists(filePath) {
        try {
            return fs.existsSync(filePath);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * 获取文件大小
     */
    getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        }
        catch (error) {
            return 0;
        }
    }
    /**
     * 获取文件名（不含路径）
     */
    getFileName(filePath) {
        return path.basename(filePath);
    }
    /**
     * 获取文件扩展名
     */
    getFileExtension(filePath) {
        return path.extname(filePath).toLowerCase();
    }
    /**
     * 检查是否为支持的文件类型
     */
    isSupportedFile(filePath) {
        const supportedExtensions = ['.txt', '.text'];
        const extension = this.getFileExtension(filePath);
        return supportedExtensions.includes(extension);
    }
    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    /**
     * 获取文件信息
     */
    getFileInfo(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return {
                name: this.getFileName(filePath),
                path: filePath,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                extension: this.getFileExtension(filePath),
                modified: stats.mtime,
                isSupported: this.isSupportedFile(filePath)
            };
        }
        catch (error) {
            return null;
        }
    }
    /**
     * 尝试加载 iconv-lite 模块（用于中文编码转换）
     */
    tryRequireIconv() {
        try {
            return eval('require')('iconv-lite');
        }
        catch (error) {
            // iconv-lite 未安装，返回 null
            return null;
        }
    }
    /**
     * 简单的编码有效性检测
     */
    isValidEncoding(content) {
        // 检查是否包含过多的替换字符（�）
        const replacementCharCount = (content.match(/�/g) || []).length;
        const totalLength = content.length;
        // 如果替换字符超过总长度的 5%，认为编码可能不正确
        if (totalLength > 0 && (replacementCharCount / totalLength) > 0.05) {
            return false;
        }
        // 检查是否包含常见的中文字符
        const chineseCharRegex = /[\u4e00-\u9fff]/;
        const hasChineseChars = chineseCharRegex.test(content);
        // 如果包含中文字符且没有太多替换字符，认为编码正确
        return !hasChineseChars || replacementCharCount < 10;
    }
    /**
     * 选择文件对话框
     */
    async selectFile() {
        const options = {
            canSelectMany: false,
            openLabel: '选择TXT文件',
            filters: {
                'Text files': ['txt', 'text'],
                'All files': ['*']
            }
        };
        const fileUri = await vscode.window.showOpenDialog(options);
        if (fileUri && fileUri[0]) {
            return fileUri[0].fsPath;
        }
        return undefined;
    }
    /**
     * 选择多个文件
     */
    async selectMultipleFiles() {
        const options = {
            canSelectMany: true,
            openLabel: '选择TXT文件（可多选）',
            filters: {
                'Text files': ['txt', 'text'],
                'All files': ['*']
            }
        };
        const fileUris = await vscode.window.showOpenDialog(options);
        if (fileUris) {
            return fileUris.map((uri) => uri.fsPath);
        }
        return [];
    }
    /**
     * 选择文件夹
     */
    async selectFolder() {
        const options = {
            canSelectMany: false,
            canSelectFiles: false,
            canSelectFolders: true,
            openLabel: '选择文件夹'
        };
        const folderUri = await vscode.window.showOpenDialog(options);
        if (folderUri && folderUri[0]) {
            return folderUri[0].fsPath;
        }
        return undefined;
    }
    /**
     * 在文件夹中查找所有TXT文件
     */
    async findTxtFilesInFolder(folderPath) {
        const txtFiles = [];
        const findTxtFilesRecursive = (dir) => {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        // 递归搜索子目录
                        findTxtFilesRecursive(fullPath);
                    }
                    else if (stat.isFile() && file.toLowerCase().endsWith('.txt')) {
                        txtFiles.push(fullPath);
                    }
                }
            }
            catch (error) {
                console.warn(`无法读取目录 ${dir}: ${error}`);
            }
        };
        findTxtFilesRecursive(folderPath);
        return txtFiles;
    }
}
exports.FileService = FileService;
//# sourceMappingURL=FileService.js.map