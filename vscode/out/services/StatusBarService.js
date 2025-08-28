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
exports.StatusBarService = void 0;
const vscode = __importStar(require("vscode"));
/**
 * 状态栏服务
 * 负责管理状态栏的显示和交互
 */
class StatusBarService {
    constructor() {
        // 创建状态栏项目
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = '📚';
        this.statusBarItem.tooltip = 'zero-moyu - 点击打开图书库';
        this.statusBarItem.command = 'extension.showFileLibrary';
        this.statusBarItem.show();
    }
    /**
     * 显示内容到状态栏 (使用原来的方式)
     */
    showContent(content) {
        if (content && content.trim()) {
            // 使用原来的 setStatusBarMessage 方式显示内容
            vscode.window.setStatusBarMessage(`📖 ${content}`);
        }
    }
    /**
     * 显示格式化的图书内容（已包含页码信息）
     */
    showFormattedContent(formattedContent) {
        if (formattedContent && formattedContent.trim()) {
            vscode.window.setStatusBarMessage(`📖 ${formattedContent}`);
        }
    }
    /**
     * 隐藏状态栏内容
     */
    hideContent() {
        // 清除状态栏消息
        vscode.window.setStatusBarMessage('');
        this.statusBarItem.text = '📚';
        this.statusBarItem.tooltip = 'zero-moyu - 点击打开图书库';
        this.statusBarItem.command = 'extension.showFileLibrary';
    }
    /**
     * 显示老板键伪装内容
     */
    showBossKey() {
        const codeExamples = [
            'Java - System.out.println("Hello World");',
            'C++ - cout << "Hello, world!" << endl;',
            'C - printf("Hello, World!");',
            'Python - print("Hello, World!")',
            'PHP - echo "Hello World!";',
            'Ruby - puts "Hello World!";',
            'Perl - print "Hello, World!";',
            'Lua - print("Hello World!")',
            'Scala - println("Hello, world!")',
            'Golang - fmt.Println("Hello, World!")',
            'JavaScript - console.log("Hello, World!");',
            'TypeScript - console.log("Hello, World!");',
            'C# - Console.WriteLine("Hello, World!");',
            'Swift - print("Hello, World!")',
            'Kotlin - println("Hello, World!")',
            'Rust - println!("Hello, World!");'
        ];
        const randomIndex = Math.floor(Math.random() * codeExamples.length);
        const randomCode = codeExamples[randomIndex];
        // 使用 setStatusBarMessage 显示伪装代码
        vscode.window.setStatusBarMessage(`💻 ${randomCode}`);
    }
    /**
     * 显示错误信息
     */
    showError(message) {
        vscode.window.setStatusBarMessage(`❌ ${message}`, 3000);
    }
    /**
     * 显示加载状态
     */
    showLoading(message = '加载中...') {
        vscode.window.setStatusBarMessage(`⏳ ${message}`);
    }
    /**
     * 显示成功信息
     */
    showSuccess(message) {
        vscode.window.setStatusBarMessage(`✅ ${message}`, 2000);
    }
    /**
     * 显示页面信息
     */
    showPageInfo(currentPage, totalPages, content) {
        const pageInfo = `(${currentPage}/${totalPages})`;
        // 使用 setStatusBarMessage 显示内容，这样会显示在左侧状态栏
        vscode.window.setStatusBarMessage(`📖 ${content} ${pageInfo}`);
    }
    /**
     * 显示图书信息
     */
    showBookInfo(bookName, currentPage, totalPages) {
        vscode.window.setStatusBarMessage(`📚 ${bookName} (${currentPage}/${totalPages})`);
    }
    /**
     * 清空状态栏 - 当删除当前图书时使用
     */
    clearStatus() {
        this.statusBarItem.text = '$(book) 选择图书';
        this.statusBarItem.tooltip = '点击选择要阅读的图书';
        this.statusBarItem.show();
        console.log('🧹 Status bar cleared');
    }
    /**
     * 更新状态栏内容
     */
    update(text, tooltip) {
        this.statusBarItem.text = text;
        this.statusBarItem.tooltip = tooltip || text;
        this.statusBarItem.show();
    }
    /**
     * 清空状态栏
     */
    clear() {
        this.statusBarItem.text = '';
        this.statusBarItem.tooltip = '';
        this.statusBarItem.hide();
    }
    /**
     * 销毁状态栏项目
     */
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.StatusBarService = StatusBarService;
//# sourceMappingURL=StatusBarService.js.map