package com.zeromoyu.idea.ui

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import com.zeromoyu.idea.service.BookManagerService
import java.awt.event.MouseEvent
import java.util.concurrent.atomic.AtomicReference
import javax.swing.JComponent
import javax.swing.JLabel

class BookStatusBarWidgetFactory : StatusBarWidgetFactory {
    override fun getId(): String = "ZeroMoyuBookStatusBarWidget"
    
    override fun getDisplayName(): String = "ZeroMoyu-Book"
    
    override fun isAvailable(project: Project): Boolean = true
    
    override fun createWidget(project: Project): StatusBarWidget {
        return BookStatusBarWidget(project)
    }
    
    override fun canBeEnabledOn(statusBar: StatusBar): Boolean = true
    
    override fun disposeWidget(widget: StatusBarWidget) {
        // Widget will be disposed automatically
    }
}

class BookStatusBarWidget(private val project: Project) : StatusBarWidget, StatusBarWidget.TextPresentation {
    private var myComponent: JLabel? = null
    private val currentContent = AtomicReference("")
    private val bookManager = BookManagerService.getInstance()

    fun getComponent(): JComponent {
        if (myComponent == null) {
            myComponent = JLabel().apply {
                toolTipText = "ZeroMoyu-Book - 点击右键查看选项"
                addMouseListener(object : java.awt.event.MouseAdapter() {
                    override fun mouseClicked(e: MouseEvent) {
                        if (e.button == MouseEvent.BUTTON3) { // 右键点击
                            showContextMenu()
                        }
                    }
                })
            }
            updateContent()
        }
        return myComponent!!
    }

    override fun ID(): String = "ZeroMoyuBookStatusBarWidget"

    override fun getPresentation(): StatusBarWidget.WidgetPresentation = this

    override fun getText(): String = currentContent.get()

    override fun getAlignment(): Float = 0.0f

    override fun getTooltipText(): String = "ZeroMoyu-Book - 摸鱼看书神器"
    
    fun updateContent() {
        ApplicationManager.getApplication().invokeLater {
            try {
                val content = bookManager.getCurrentBookContent()
                currentContent.set(content)
                myComponent?.text = content

                // 添加调试日志
                val logger = com.intellij.openapi.diagnostic.Logger.getInstance(BookStatusBarWidget::class.java)
                logger.info("Status bar content updated: ${content.take(50)}...")
            } catch (e: Exception) {
                val logger = com.intellij.openapi.diagnostic.Logger.getInstance(BookStatusBarWidget::class.java)
                logger.error("Failed to update status bar content", e)
            }
        }
    }
    
    fun clearContent() {
        ApplicationManager.getApplication().invokeLater {
            currentContent.set("")
            myComponent?.text = ""

            // 添加调试日志
            val logger = com.intellij.openapi.diagnostic.Logger.getInstance(BookStatusBarWidget::class.java)
            logger.info("Status bar content cleared")
        }
    }
    
    private fun showContextMenu() {
        // TODO: 实现右键菜单，显示常用操作
        // 这里可以显示一个弹出菜单，包含翻页、章节导航等选项
    }
    
    override fun dispose() {
        myComponent = null
    }
}
