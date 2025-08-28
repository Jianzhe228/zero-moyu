/**
 * 状态栏服务
 * 负责管理状态栏的显示和交互
 */
export declare class StatusBarService {
    private statusBarItem;
    constructor();
    /**
     * 显示内容到状态栏 (使用原来的方式)
     */
    showContent(content: string): void;
    /**
     * 显示格式化的图书内容（已包含页码信息）
     */
    showFormattedContent(formattedContent: string): void;
    /**
     * 隐藏状态栏内容
     */
    hideContent(): void;
    /**
     * 显示老板键伪装内容
     */
    showBossKey(): void;
    /**
     * 显示错误信息
     */
    showError(message: string): void;
    /**
     * 显示加载状态
     */
    showLoading(message?: string): void;
    /**
     * 显示成功信息
     */
    showSuccess(message: string): void;
    /**
     * 显示页面信息
     */
    showPageInfo(currentPage: number, totalPages: number, content: string): void;
    /**
     * 显示图书信息
     */
    showBookInfo(bookName: string, currentPage: number, totalPages: number): void;
    /**
     * 清空状态栏 - 当删除当前图书时使用
     */
    clearStatus(): void;
    /**
     * 更新状态栏内容
     */
    update(text: string, tooltip?: string): void;
    /**
     * 清空状态栏
     */
    clear(): void;
    /**
     * 销毁状态栏项目
     */
    dispose(): void;
}
//# sourceMappingURL=StatusBarService.d.ts.map