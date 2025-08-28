package com.zeromoyu.idea.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.ui.components.JBTextField
import com.zeromoyu.idea.service.BookManagerService
import com.zeromoyu.idea.utils.NotificationUtils
import java.awt.*
import javax.swing.*

class JumpToPageDialog(private val project: Project) : DialogWrapper(project, false) {
    private val bookManager = BookManagerService.getInstance()
    private lateinit var inputField: JBTextField
    private lateinit var statusLabel: JLabel
    
    init {
        title = "🔍 智能跳转"
        init()
    }
    
    override fun createCenterPanel(): JComponent {
        val panel = JPanel(BorderLayout())
        panel.border = BorderFactory.createEmptyBorder(20, 20, 20, 20)
        
        val book = bookManager.getCurrentBook()
        
        // 标题面板
        val titlePanel = JPanel(FlowLayout(FlowLayout.LEFT))
        val titleLabel = JLabel("🔍 智能跳转")
        titleLabel.font = titleLabel.font.deriveFont(Font.BOLD, 14f)
        titlePanel.add(titleLabel)
        panel.add(titlePanel, BorderLayout.NORTH)
        
        // 主内容面板
        val contentPanel = JPanel()
        contentPanel.layout = BoxLayout(contentPanel, BoxLayout.Y_AXIS)
        
        // 提示信息
        val hintPanel = JPanel(FlowLayout(FlowLayout.LEFT))
        val hintLabel = JLabel(if (book != null) {
            "📝 输入页码 (1-${book.totalPages}) 或搜索关键词"
        } else {
            "⚠️ 请先打开一本书"
        })
        hintLabel.foreground = Color.GRAY
        hintPanel.add(hintLabel)
        contentPanel.add(hintPanel)
        contentPanel.add(Box.createVerticalStrut(10))
        
        // 输入框
        val inputPanel = JPanel(FlowLayout(FlowLayout.LEFT))
        inputField = JBTextField(25)
        inputField.font = inputField.font.deriveFont(14f)
        inputField.isEnabled = book != null
        inputPanel.add(inputField)
        contentPanel.add(inputPanel)
        contentPanel.add(Box.createVerticalStrut(10))
        
        // 状态标签
        val statusPanel = JPanel(FlowLayout(FlowLayout.LEFT))
        statusLabel = JLabel(" ")
        statusLabel.foreground = Color(0, 120, 0)
        statusPanel.add(statusLabel)
        contentPanel.add(statusPanel)
        
        // 快捷提示
        if (book != null) {
            contentPanel.add(Box.createVerticalStrut(10))
            val tipsPanel = JPanel()
            tipsPanel.layout = BoxLayout(tipsPanel, BoxLayout.Y_AXIS)
            tipsPanel.border = BorderFactory.createTitledBorder("💡 使用提示")
            
            val tips = listOf(
                "• 输入数字跳转到指定页面",
                "• 输入文字搜索关键词",
                "• 当前页: ${book.currentPageNumber}/${book.totalPages}"
            )
            
            tips.forEach { tip ->
                val tipLabel = JLabel(tip)
                tipLabel.font = tipLabel.font.deriveFont(12f)
                tipLabel.alignmentX = Component.LEFT_ALIGNMENT
                tipLabel.border = BorderFactory.createEmptyBorder(2, 5, 2, 0)
                tipsPanel.add(tipLabel)
            }
            
            contentPanel.add(tipsPanel)
        }
        
        panel.add(contentPanel, BorderLayout.CENTER)
        
        panel.preferredSize = Dimension(400, if (book != null) 300 else 200)
        return panel
    }
    
    override fun doOKAction() {
        val input = inputField.text.trim()
        if (input.isEmpty()) {
            statusLabel.text = "⚠️ 请输入内容"
            statusLabel.foreground = Color.RED
            return
        }
        
        val book = bookManager.getCurrentBook()
        if (book == null) {
            NotificationUtils.showWarning(project, "请先打开一本书")
            return
        }
        
        try {
            val pageNumber = input.toInt()
            if (pageNumber in 1..book.totalPages) {
                val content = bookManager.jumpToPage(pageNumber)
                bookManager.updateStatusBar(project, content)
                NotificationUtils.showInfo(project, "✅ 已跳转到第$pageNumber 页")
                super.doOKAction()
            } else {
                statusLabel.text = "❌ 页码超出范围 (1-${book.totalPages})"
                statusLabel.foreground = Color.RED
            }
        } catch (e: NumberFormatException) {
            // 尝试搜索
            statusLabel.text = "🔍 正在搜索..."
            statusLabel.foreground = Color.BLUE
            
            val result = book.searchText(input)
            if (result != null) {
                bookManager.updateStatusBar(project, result)
                NotificationUtils.showInfo(project, "✅ 已跳转到包含 \"$input\" 的页面")
                super.doOKAction()
            } else {
                statusLabel.text = "❌ 未找到 \"$input\""
                statusLabel.foreground = Color.RED
            }
        }
    }
    
    override fun doCancelAction() {
        super.doCancelAction()
    }
}
