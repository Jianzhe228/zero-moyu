package com.zeromoyu.idea.action

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.zeromoyu.idea.service.BookManagerService
import com.zeromoyu.idea.utils.NotificationUtils

class PreviousChapterAction : AnAction("上一章", "跳转到上一章", null) {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.getRequiredData(CommonDataKeys.PROJECT)
        val bookManager = BookManagerService.getInstance()
        
        if (!bookManager.ensureBookAvailable(project)) {
            return
        }

        val content = bookManager.previousChapter()
        if (content.contains("已经是第一章") || content.contains("没有检测到章节")) {
            NotificationUtils.showInfo(project, content)
        } else {
            bookManager.updateStatusBar(project, content)
        }
    }
    
    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}
