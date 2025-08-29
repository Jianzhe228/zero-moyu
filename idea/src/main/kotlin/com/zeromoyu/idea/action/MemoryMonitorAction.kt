package com.zeromoyu.idea.action

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.ui.Messages
import com.zeromoyu.idea.service.BookManagerService

class MemoryMonitorAction : AnAction("内存监控", "显示插件内存使用情况", null) {
    
    private val logger = com.intellij.openapi.diagnostic.Logger.getInstance(MemoryMonitorAction::class.java)
    
    override fun actionPerformed(e: AnActionEvent) {
        try {
            val project = e.getData(CommonDataKeys.PROJECT) ?: return
            val bookManager = BookManagerService.getInstance()
            
            logger.info("Memory monitor action triggered")
            
            // 记录内存使用情况
            bookManager.logMemoryUsage()
            
            // 获取JVM内存信息
            val runtime = Runtime.getRuntime()
            val totalMemory = runtime.totalMemory()
            val freeMemory = runtime.freeMemory()
            val usedMemory = totalMemory - freeMemory
            val maxMemory = runtime.maxMemory()
            
            val memoryInfo = buildString {
                appendLine("🔍 zero-moyu 内存监控")
                appendLine()
                appendLine("📊 JVM 内存使用:")
                appendLine("  - 已用内存: ${formatBytes(usedMemory)}")
                appendLine("  - 总内存: ${formatBytes(totalMemory)}")
                appendLine("  - 最大内存: ${formatBytes(maxMemory)}")
                appendLine("  - 内存使用: ${(usedMemory * 100 / totalMemory)}%")
                appendLine()
                appendLine("📚 插件缓存:")
                appendLine("  - 详细信息请查看 IDE 日志")
                appendLine()
                appendLine("💡 提示:")
                appendLine("  - 如果内存使用过高，可以尝试清理缓存")
                appendLine("  - 建议定期重启 IDE 以释放内存")
            }
            
            Messages.showInfoMessage(
                project,
                memoryInfo,
                "内存监控 - zero-moyu"
            )
            
        } catch (ex: Exception) {
            logger.error("Failed to show memory monitor", ex)
            val project = e.project
            if (project != null) {
                Messages.showErrorDialog(
                    project,
                    "内存监控失败: ${ex.message}",
                    "错误"
                )
            }
        }
    }
    
    override fun update(e: AnActionEvent) {
        val project = e.project
        e.presentation.isEnabledAndVisible = project != null
    }
    
    private fun formatBytes(bytes: Long): String {
        return when {
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> "${bytes / 1024} KB"
            bytes < 1024 * 1024 * 1024 -> "${bytes / (1024 * 1024)} MB"
            else -> "${bytes / (1024 * 1024 * 1024)} GB"
        }
    }
}