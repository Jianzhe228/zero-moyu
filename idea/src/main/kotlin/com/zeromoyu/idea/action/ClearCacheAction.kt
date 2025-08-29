package com.zeromoyu.idea.action

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.ui.Messages
import com.zeromoyu.idea.service.BookManagerService

class ClearCacheAction : AnAction("清理缓存", "清理插件缓存以释放内存", null) {
    
    private val logger = com.intellij.openapi.diagnostic.Logger.getInstance(ClearCacheAction::class.java)
    
    override fun actionPerformed(e: AnActionEvent) {
        try {
            val project = e.getData(CommonDataKeys.PROJECT) ?: return
            val bookManager = BookManagerService.getInstance()
            
            logger.info("Clear cache action triggered")
            
            // 显示确认对话框
            val result = Messages.showYesNoDialog(
                project,
                "确定要清理插件缓存吗？\n\n" +
                "这将清理除当前阅读书籍外的所有缓存，\n" +
                "可能需要重新加载其他书籍。",
                "清理缓存 - zero-moyu",
                "清理",
                "取消",
                Messages.getQuestionIcon()
            )
            
            if (result == Messages.YES) {
                // 记录清理前的内存使用
                logger.info("Memory usage before cleanup:")
                bookManager.logMemoryUsage()
                
                // 清理缓存
                bookManager.clearAllCache()
                
                // 强制垃圾回收
                bookManager.forceGarbageCollection()
                
                // 记录清理后的内存使用
                logger.info("Memory usage after cleanup:")
                bookManager.logMemoryUsage()
                
                Messages.showInfoMessage(
                    project,
                    "缓存清理完成！\n\n" +
                    "已清理除当前书籍外的所有缓存，\n" +
                    "详细信息请查看 IDE 日志。",
                    "清理完成"
                )
                
                logger.info("Cache cleanup completed successfully")
            } else {
                logger.info("Cache cleanup cancelled by user")
            }
            
        } catch (ex: Exception) {
            logger.error("Failed to clear cache", ex)
            val project = e.project
            if (project != null) {
                Messages.showErrorDialog(
                    project,
                    "缓存清理失败: ${ex.message}",
                    "错误"
                )
            }
        }
    }
    
    override fun update(e: AnActionEvent) {
        val project = e.project
        e.presentation.isEnabledAndVisible = project != null
    }
}