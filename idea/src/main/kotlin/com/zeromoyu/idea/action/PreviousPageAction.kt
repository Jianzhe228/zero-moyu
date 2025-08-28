package com.zeromoyu.idea.action

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.zeromoyu.idea.service.BookManagerService

class PreviousPageAction : AnAction("上一页", "翻到上一页", null) {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.getRequiredData(CommonDataKeys.PROJECT)
        val bookManager = BookManagerService.getInstance()
        
        if (!bookManager.ensureBookAvailable(project)) {
            return
        }
        
        val content = bookManager.previousPage()
        bookManager.updateStatusBar(project, content)
    }
    
    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}
