package com.zeromoyu.idea.action

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.zeromoyu.idea.service.BookManagerService
import com.zeromoyu.idea.utils.NotificationUtils

class NextPageAction : AnAction("下一页", "翻到下一页", null) {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.getRequiredData(CommonDataKeys.PROJECT)
        val bookManager = BookManagerService.getInstance()
        
        // 检查图书库状态
        if (!bookManager.ensureBookAvailable(project)) {
            return
        }
        
        val content = bookManager.nextPage()
        bookManager.updateStatusBar(project, content)
    }
    
    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}
