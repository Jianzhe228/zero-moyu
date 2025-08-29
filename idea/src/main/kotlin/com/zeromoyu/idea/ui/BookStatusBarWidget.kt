package com.zeromoyu.idea.ui

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import com.intellij.openapi.util.Disposer
import com.intellij.util.Consumer
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
        Disposer.dispose(widget)
    }
}

/**
 * 兼容213+版本的StatusBarWidget实现
 */
class BookStatusBarWidget(private val project: Project) : StatusBarWidget {
    private var myComponent: JLabel? = null
    private val currentContent = AtomicReference("")
    private val bookManager = BookManagerService.getInstance()
    private var statusBar: StatusBar? = null
    private val logger = com.intellij.openapi.diagnostic.Logger.getInstance(BookStatusBarWidget::class.java)

    // 实现 install 方法（213版本需要）
    @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
    override fun install(statusBar: StatusBar) {
        this.statusBar = statusBar
        logger.info("BookStatusBarWidget installed")
    }

    override fun ID(): String = "ZeroMoyuBookStatusBarWidget"

    // 实现 getPresentation 方法
    @Suppress("OVERRIDE_DEPRECATION")
    override fun getPresentation(): StatusBarWidget.WidgetPresentation {
        return BookStatusBarPresentation()
    }

    // 内部类实现 TextPresentation
    private inner class BookStatusBarPresentation : StatusBarWidget.TextPresentation {
        
        override fun getText(): String = currentContent.get()

        override fun getAlignment(): Float = 0.0f

        override fun getTooltipText(): String = "ZeroMoyu-Book - 摸鱼看书神器"
        
        // 实现 getClickConsumer（213版本需要）
        @Suppress("OVERRIDE_DEPRECATION")
        override fun getClickConsumer(): Consumer<MouseEvent>? {
            return Consumer { e ->
                if (e.button == MouseEvent.BUTTON3) {
                    showContextMenu()
                }
            }
        }
    }

    fun getComponent(): JComponent {
        if (myComponent == null) {
            myComponent = JLabel().apply {
                toolTipText = "ZeroMoyu-Book - 点击右键查看选项"
                addMouseListener(object : java.awt.event.MouseAdapter() {
                    override fun mouseClicked(e: MouseEvent) {
                        if (e.button == MouseEvent.BUTTON3) {
                            showContextMenu()
                        }
                    }
                })
            }
            updateContent()
        }
        return myComponent!!
    }
    
    fun updateContent() {
        ApplicationManager.getApplication().invokeLater {
            try {
                val content = bookManager.getCurrentBookContent()
                currentContent.set(content)
                myComponent?.text = content
                
                // 更新状态栏
                statusBar?.updateWidget(ID())
                
                logger.debug("Status bar content updated: ${content.take(50)}...")
            } catch (e: Exception) {
                logger.error("Failed to update status bar content", e)
            }
        }
    }
    
    fun clearContent() {
        ApplicationManager.getApplication().invokeLater {
            currentContent.set("")
            myComponent?.text = ""
            
            // 更新状态栏
            statusBar?.updateWidget(ID())
            
            logger.info("Status bar content cleared")
        }
    }
    
    private fun showContextMenu() {
        // TODO: 实现右键菜单
        logger.info("Context menu requested")
    }
    
    override fun dispose() {
        myComponent = null
        statusBar = null
        logger.info("BookStatusBarWidget disposed")
    }
}