/**
 * 编码检测工具
 * 用于检测文本文件的编码格式
 */
export class EncodingDetector {
    
    /**
     * 检测文本编码
     */
    static detectEncoding(buffer: Buffer): string {
        // 检查 BOM
        const bom = this.checkBOM(buffer);
        if (bom) {
            return bom;
        }

        // 检查是否为 UTF-8
        if (this.isUTF8(buffer)) {
            return 'utf8';
        }

        // 检查是否为 GBK/GB2312
        if (this.isGBK(buffer)) {
            return 'gbk';
        }

        // 检查是否为 Big5
        if (this.isBig5(buffer)) {
            return 'big5';
        }

        // 默认返回 UTF-8
        return 'utf8';
    }

    /**
     * 检查 BOM (Byte Order Mark)
     */
    private static checkBOM(buffer: Buffer): string | null {
        if (buffer.length >= 3) {
            // UTF-8 BOM: EF BB BF
            if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                return 'utf8';
            }
        }

        if (buffer.length >= 2) {
            // UTF-16 LE BOM: FF FE
            if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
                return 'utf16le';
            }
            // UTF-16 BE BOM: FE FF
            if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
                return 'utf16be';
            }
        }

        return null;
    }

    /**
     * 检查是否为有效的 UTF-8
     */
    private static isUTF8(buffer: Buffer): boolean {
        let i = 0;
        while (i < buffer.length) {
            const byte = buffer[i];
            
            if (byte < 0x80) {
                // ASCII 字符
                i++;
            } else if ((byte >> 5) === 0x06) {
                // 110xxxxx - 2字节字符
                if (i + 1 >= buffer.length || (buffer[i + 1] >> 6) !== 0x02) {
                    return false;
                }
                i += 2;
            } else if ((byte >> 4) === 0x0E) {
                // 1110xxxx - 3字节字符
                if (i + 2 >= buffer.length || 
                    (buffer[i + 1] >> 6) !== 0x02 || 
                    (buffer[i + 2] >> 6) !== 0x02) {
                    return false;
                }
                i += 3;
            } else if ((byte >> 3) === 0x1E) {
                // 11110xxx - 4字节字符
                if (i + 3 >= buffer.length || 
                    (buffer[i + 1] >> 6) !== 0x02 || 
                    (buffer[i + 2] >> 6) !== 0x02 || 
                    (buffer[i + 3] >> 6) !== 0x02) {
                    return false;
                }
                i += 4;
            } else {
                return false;
            }
        }
        return true;
    }

    /**
     * 检查是否为 GBK 编码
     */
    private static isGBK(buffer: Buffer): boolean {
        let i = 0;
        let gbkCount = 0;
        let totalBytes = 0;

        while (i < buffer.length) {
            const byte = buffer[i];
            totalBytes++;

            if (byte < 0x80) {
                // ASCII 字符
                i++;
            } else if (byte >= 0x81 && byte <= 0xFE) {
                // GBK 双字节字符
                if (i + 1 >= buffer.length) {
                    break;
                }
                const byte2 = buffer[i + 1];
                if ((byte2 >= 0x40 && byte2 <= 0x7E) || (byte2 >= 0x80 && byte2 <= 0xFE)) {
                    gbkCount += 2;
                    i += 2;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }

        // 如果 GBK 字符占比超过 30%，认为是 GBK 编码
        return totalBytes > 0 && (gbkCount / totalBytes) > 0.3;
    }

    /**
     * 检查是否为 Big5 编码
     */
    private static isBig5(buffer: Buffer): boolean {
        let i = 0;
        let big5Count = 0;
        let totalBytes = 0;

        while (i < buffer.length) {
            const byte = buffer[i];
            totalBytes++;

            if (byte < 0x80) {
                // ASCII 字符
                i++;
            } else if (byte >= 0x81 && byte <= 0xFE) {
                // Big5 双字节字符
                if (i + 1 >= buffer.length) {
                    break;
                }
                const byte2 = buffer[i + 1];
                if ((byte2 >= 0x40 && byte2 <= 0x7E) || (byte2 >= 0xA1 && byte2 <= 0xFE)) {
                    big5Count += 2;
                    i += 2;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }

        // 如果 Big5 字符占比超过 30%，认为是 Big5 编码
        return totalBytes > 0 && (big5Count / totalBytes) > 0.3;
    }

    /**
     * 获取编码的显示名称
     */
    static getEncodingDisplayName(encoding: string): string {
        const encodingNames: { [key: string]: string } = {
            'utf8': 'UTF-8',
            'utf16le': 'UTF-16 LE',
            'utf16be': 'UTF-16 BE',
            'gbk': 'GBK',
            'gb2312': 'GB2312',
            'big5': 'Big5',
            'ascii': 'ASCII'
        };

        return encodingNames[encoding.toLowerCase()] || encoding.toUpperCase();
    }

    /**
     * 检查编码是否支持
     */
    static isSupportedEncoding(encoding: string): boolean {
        const supportedEncodings = [
            'utf8', 'utf16le', 'utf16be', 'gbk', 'gb2312', 'big5', 'ascii'
        ];
        return supportedEncodings.includes(encoding.toLowerCase());
    }
}
