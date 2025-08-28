import * as vscode from 'vscode';

/**
 * 状态栏服务
 * 负责管理状态栏的显示和交互
 */
export class StatusBarService {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        // 创建状态栏项目
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.text = '📚';
        this.statusBarItem.tooltip = 'zero-moyu - 点击打开图书库';
        this.statusBarItem.command = 'extension.showFileLibrary';
        this.statusBarItem.show();
    }

    /**
     * 显示内容到状态栏 (使用原来的方式)
     */
    showContent(content: string): void {
        if (content && content.trim()) {
            // 使用原来的 setStatusBarMessage 方式显示内容
            vscode.window.setStatusBarMessage(`📖 ${content}`);
        }
    }

    /**
     * 显示格式化的图书内容（已包含页码信息）
     */
    showFormattedContent(formattedContent: string): void {
        if (formattedContent && formattedContent.trim()) {
            vscode.window.setStatusBarMessage(`📖 ${formattedContent}`);
        }
    }

    /**
     * 隐藏状态栏内容
     */
    hideContent(): void {
        // 清除状态栏消息
        vscode.window.setStatusBarMessage('');
        this.statusBarItem.text = '📚';
        this.statusBarItem.tooltip = 'zero-moyu - 点击打开图书库';
        this.statusBarItem.command = 'extension.showFileLibrary';
    }

    /**
     * 显示老板键伪装内容
     */
    showBossKey(): void {
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
    showError(message: string): void {
        vscode.window.setStatusBarMessage(`❌ ${message}`, 3000);
    }

    /**
     * 显示加载状态
     */
    showLoading(message: string = '加载中...'): void {
        vscode.window.setStatusBarMessage(`⏳ ${message}`);
    }

    /**
     * 显示成功信息
     */
    showSuccess(message: string): void {
        vscode.window.setStatusBarMessage(`✅ ${message}`, 2000);
    }

    /**
     * 显示页面信息
     */
    showPageInfo(currentPage: number, totalPages: number, content: string): void {
        const pageInfo = `(${currentPage}/${totalPages})`;
        // 使用 setStatusBarMessage 显示内容，这样会显示在左侧状态栏
        vscode.window.setStatusBarMessage(`📖 ${content} ${pageInfo}`);
    }

    /**
     * 显示图书信息
     */
    showBookInfo(bookName: string, currentPage: number, totalPages: number): void {
        vscode.window.setStatusBarMessage(`📚 ${bookName} (${currentPage}/${totalPages})`);
    }

    /**
     * 清空状态栏 - 当删除当前图书时使用
     */
    clearStatus(): void {
        this.statusBarItem.text = '$(book) 选择图书';
        this.statusBarItem.tooltip = '点击选择要阅读的图书';
        this.statusBarItem.show();
        console.log('🧹 Status bar cleared');
    }

    /**
     * 更新状态栏内容
     */
    update(text: string, tooltip?: string): void {
        this.statusBarItem.text = text;
        this.statusBarItem.tooltip = tooltip || text;
        this.statusBarItem.show();
    }

    /**
     * 清空状态栏
     */
    clear(): void {
        this.statusBarItem.text = '';
        this.statusBarItem.tooltip = '';
        this.statusBarItem.hide();
    }

    /**
     * 销毁状态栏项目
     */
    dispose(): void {
        this.statusBarItem.dispose();
    }
}
