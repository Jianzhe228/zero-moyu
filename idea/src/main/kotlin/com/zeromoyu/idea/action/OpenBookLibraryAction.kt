package com.zeromoyu.idea.action

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.zeromoyu.idea.ui.BookLibraryDialog

class OpenBookLibraryAction : AnAction("打开图书库", "打开图书库管理界面", null) {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.getData(CommonDataKeys.PROJECT) ?: return
        BookLibraryDialog(project).show()
    }
    
    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}