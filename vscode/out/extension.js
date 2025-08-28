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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const CommandManager_1 = require("./commands/CommandManager");
const BookManagerService_1 = require("./services/BookManagerService");
const ConfigurationService_1 = require("./services/ConfigurationService");
const StatusBarService_1 = require("./services/StatusBarService");
/**
 * VS Code 扩展激活入口点
 * 负责初始化所有服务和命令
 */
function activate(context) {
    console.log('🚀 zero-moyu extension is now active!');
    try {
        // 初始化核心服务
        const configService = new ConfigurationService_1.ConfigurationService();
        const statusBarService = new StatusBarService_1.StatusBarService();
        const bookManagerService = new BookManagerService_1.BookManagerService(context, configService);
        // 注入状态栏服务，以便在打开图书时自动更新状态栏
        bookManagerService.setStatusBarService(statusBarService);
        // 初始化命令管理器
        const commandManager = new CommandManager_1.CommandManager(context, bookManagerService, configService, statusBarService);
        // 注册所有命令
        commandManager.registerAllCommands();
        // 监听配置变化
        const configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
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
    }
    catch (error) {
        console.error('❌ Failed to activate zero-moyu extension:', error);
        vscode.window.showErrorMessage(`Failed to activate zero-moyu: ${error}`);
    }
}
exports.activate = activate;
/**
 * VS Code 扩展停用时调用
 */
function deactivate() {
    console.log('👋 zero-moyu extension is being deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map