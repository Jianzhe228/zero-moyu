import * as vscode from 'vscode';
import { CommandManager } from './commands/CommandManager';
import { BookManagerService } from './services/BookManagerService';
import { ConfigurationService } from './services/ConfigurationService';
import { StatusBarService } from './services/StatusBarService';

/**
 * VS Code 扩展激活入口点
 * 负责初始化所有服务和命令
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 zero-moyu extension is now active!');

    try {
        // 初始化核心服务
        const configService = new ConfigurationService();
        const statusBarService = new StatusBarService();
        const bookManagerService = new BookManagerService(context, configService);
        
        // 注入状态栏服务，以便在打开图书时自动更新状态栏
        bookManagerService.setStatusBarService(statusBarService);
        
        // 初始化命令管理器
        const commandManager = new CommandManager(
            context,
            bookManagerService,
            configService,
            statusBarService
        );

        // 注册所有命令
        commandManager.registerAllCommands();

        // 监听配置变化
        const configChangeListener = vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('zero-moyu')) {
                console.log('📝 Configuration changed, updating book settings...');
                bookManagerService.refreshConfiguration();
                
                // 重新显示当前页面以应用新设置
                const currentBook = bookManagerService.getCurrentBook();
                if (currentBook) {
                    const formattedContent = currentBook.getFormattedCurrentPageContent();
                    statusBarService.showFormattedContent(formattedContent);
                }
                
                console.log('✅ Book configuration updated successfully');
            }
        });

        // 将监听器添加到上下文中，确保正确清理
        context.subscriptions.push(configChangeListener);

        console.log('✅ zero-moyu extension activated successfully!');
        
    } catch (error) {
        console.error('❌ Failed to activate zero-moyu extension:', error);
        vscode.window.showErrorMessage(`Failed to activate zero-moyu: ${error}`);
    }
}

/**
 * VS Code 扩展停用时调用
 */
export function deactivate() {
    console.log('👋 zero-moyu extension is being deactivated');
}
