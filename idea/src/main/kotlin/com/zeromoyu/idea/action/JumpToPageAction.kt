package com.zeromoyu.idea.action

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.zeromoyu.idea.service.BookManagerService
import com.zeromoyu.idea.ui.JumpToPageDialog

class JumpToPageAction : AnAction("跳转页面", "跳转到指定页面", null) {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.getData(CommonDataKeys.PROJECT) ?: return
        val bookManager = BookManagerService.getInstance()
        
        if (!bookManager.ensureBookAvailable(project)) {
            return
        }
        
        JumpToPageDialog(project).show()
    }
    
    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}