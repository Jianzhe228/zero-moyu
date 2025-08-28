/// <reference types="node" />
/// <reference types="node" />
/**
 * 编码检测工具
 * 用于检测文本文件的编码格式
 */
export declare class EncodingDetector {
    /**
     * 检测文本编码
     */
    static detectEncoding(buffer: Buffer): string;
    /**
     * 检查 BOM (Byte Order Mark)
     */
    private static checkBOM;
    /**
     * 检查是否为有效的 UTF-8
     */
    private static isUTF8;
    /**
     * 检查是否为 GBK 编码
     */
    private static isGBK;
    /**
     * 检查是否为 Big5 编码
     */
    private static isBig5;
    /**
     * 获取编码的显示名称
     */
    static getEncodingDisplayName(encoding: string): string;
    /**
     * 检查编码是否支持
     */
    static isSupportedEncoding(encoding: string): boolean;
}
//# sourceMappingURL=EncodingDetector.d.ts.map