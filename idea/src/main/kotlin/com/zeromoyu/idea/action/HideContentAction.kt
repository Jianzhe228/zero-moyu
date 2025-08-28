package com.zeromoyu.idea.action

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.zeromoyu.idea.service.BookManagerService

class HideContentAction : AnAction("隐藏阅读内容", "隐藏状态栏中的阅读内容", null) {

    override fun actionPerformed(e: AnActionEvent) {
        val bookManager = BookManagerService.getInstance()
        bookManager.hideContent()
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}
