package com.zeromoyu.idea.action

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.zeromoyu.idea.service.BookManagerService
import com.zeromoyu.idea.ui.ChapterListDialog

class ShowChapterListAction : AnAction("显示章节列表", "显示当前书籍的章节列表", null) {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.getData(CommonDataKeys.PROJECT) ?: return
        val bookManager = BookManagerService.getInstance()

        if (!bookManager.ensureBookAvailable(project)) {
            return
        }

        ChapterListDialog(project).show()
    }
    
    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}