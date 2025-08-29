package com.zeromoyu.idea.config

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.ui.ComboBox
import com.intellij.openapi.ui.Messages
import com.zeromoyu.idea.service.BookManagerService
import java.awt.*
import javax.swing.*
import javax.swing.event.DocumentEvent
import javax.swing.event.DocumentListener

class ZeroMoyuConfigurable : Configurable {
    
    private lateinit var pageSizeField: JTextField
    private lateinit var lineBreakField: JTextField
    private lateinit var maxRecentFilesField: JTextField
    private lateinit var resetButton: JButton
    private lateinit var panel: JPanel
    
    private val bookManager = BookManagerService.getInstance()
    
    override fun getDisplayName(): String = "zero-moyu"
    
    override fun createComponent(): JComponent? {
        panel = JPanel()
        panel.layout = BorderLayout()
        panel.border = BorderFactory.createEmptyBorder(20, 20, 20, 20)

        // 主内容面板
        val mainPanel = JPanel()
        mainPanel.layout = BoxLayout(mainPanel, BoxLayout.Y_AXIS)

        // 标题
        val titleLabel = JLabel("📚 zero-moyu 设置")
        titleLabel.font = titleLabel.font.deriveFont(Font.BOLD, 16f)
        titleLabel.alignmentX = Component.LEFT_ALIGNMENT
        titleLabel.border = BorderFactory.createEmptyBorder(0, 0, 20, 0)
        mainPanel.add(titleLabel)

        // 阅读设置组
        mainPanel.add(createReadingSettingsPanel())
        mainPanel.add(Box.createVerticalStrut(15))

        // 文件管理设置组
        mainPanel.add(createFileManagementPanel())
        mainPanel.add(Box.createVerticalStrut(15))

        // 性能监控设置组
        mainPanel.add(createPerformancePanel())
        mainPanel.add(Box.createVerticalStrut(20))

        // 按钮面板
        mainPanel.add(createButtonPanel())

        // 使用说明
        mainPanel.add(Box.createVerticalStrut(20))
        mainPanel.add(createHelpPanel())

        panel.add(mainPanel, BorderLayout.NORTH)

        // 加载当前设置
        loadCurrentSettings()
        setupListeners()

        return panel
    }

    private fun createReadingSettingsPanel(): JPanel {
        val groupPanel = JPanel()
        groupPanel.layout = BoxLayout(groupPanel, BoxLayout.Y_AXIS)
        groupPanel.border = BorderFactory.createTitledBorder(
            BorderFactory.createEtchedBorder(),
            "📖 阅读设置"
        )
        groupPanel.alignmentX = Component.LEFT_ALIGNMENT

        // 页面大小设置
        val pageSizePanel = createSettingRow(
            "每页文字数量:",
            "控制状态栏显示的文字数量",
            "50"
        )
        pageSizeField = pageSizePanel.second
        groupPanel.add(pageSizePanel.first)
        groupPanel.add(Box.createVerticalStrut(10))

        // 换行符设置
        val lineBreakPanel = createSettingRow(
            "换行分隔符:",
            "用于替换文本中的换行符",
            "空格"
        )
        lineBreakField = lineBreakPanel.second
        groupPanel.add(lineBreakPanel.first)

        return groupPanel
    }

    private fun createFileManagementPanel(): JPanel {
        val groupPanel = JPanel()
        groupPanel.layout = BoxLayout(groupPanel, BoxLayout.Y_AXIS)
        groupPanel.border = BorderFactory.createTitledBorder(
            BorderFactory.createEtchedBorder(),
            "📁 文件管理"
        )
        groupPanel.alignmentX = Component.LEFT_ALIGNMENT

        // 最近文件数量设置
        val maxRecentPanel = createSettingRow(
            "最近阅读列表最大数量:",
            "保存最近打开的书籍数量",
            "10"
        )
        maxRecentFilesField = maxRecentPanel.second
        groupPanel.add(maxRecentPanel.first)

        return groupPanel
    }

    private fun createPerformancePanel(): JPanel {
        val groupPanel = JPanel()
        groupPanel.layout = BoxLayout(groupPanel, BoxLayout.Y_AXIS)
        groupPanel.border = BorderFactory.createTitledBorder(
            BorderFactory.createEtchedBorder(),
            "⚡ 性能监控"
        )
        groupPanel.alignmentX = Component.LEFT_ALIGNMENT

        // 内存使用情况显示
        val memoryPanel = createMemoryInfoPanel()
        groupPanel.add(memoryPanel)
        groupPanel.add(Box.createVerticalStrut(10))

        // 操作按钮
        val actionPanel = createPerformanceActionPanel()
        groupPanel.add(actionPanel)

        return groupPanel
    }

    private fun createMemoryInfoPanel(): JPanel {
        val panel = JPanel()
        panel.layout = BoxLayout(panel, BoxLayout.Y_AXIS)
        panel.alignmentX = Component.LEFT_ALIGNMENT

        // 内存信息标签
        val memoryLabel = JLabel("📊 内存使用情况:")
        memoryLabel.font = memoryLabel.font.deriveFont(Font.BOLD)
        panel.add(memoryLabel)

        // 内存详情面板
        val detailPanel = JPanel(GridLayout(3, 2, 10, 5))
        detailPanel.border = BorderFactory.createEmptyBorder(5, 20, 5, 0)

        val runtime = Runtime.getRuntime()
        val totalMemory = runtime.totalMemory() / 1024 / 1024
        val freeMemory = runtime.freeMemory() / 1024 / 1024
        val usedMemory = totalMemory - freeMemory
        val maxMemory = runtime.maxMemory() / 1024 / 1024

        detailPanel.add(JLabel("已使用内存:"))
        detailPanel.add(JLabel("${usedMemory} MB"))
        detailPanel.add(JLabel("可用内存:"))
        detailPanel.add(JLabel("${freeMemory} MB"))
        detailPanel.add(JLabel("最大内存:"))
        detailPanel.add(JLabel("${maxMemory} MB"))

        panel.add(detailPanel)

        return panel
    }

    private fun createPerformanceActionPanel(): JPanel {
        val panel = JPanel(FlowLayout(FlowLayout.LEFT, 0, 0))
        panel.alignmentX = Component.LEFT_ALIGNMENT

        // 清理缓存按钮
        val clearCacheButton = JButton("🧹 清理缓存")
        clearCacheButton.preferredSize = Dimension(120, 30)
        clearCacheButton.addActionListener {
            clearCache()
        }

        // 强制垃圾回收按钮
        val gcButton = JButton("♻️ 垃圾回收")
        gcButton.preferredSize = Dimension(120, 30)
        gcButton.addActionListener {
            forceGarbageCollection()
        }

        // 刷新内存信息按钮
        val refreshButton = JButton("🔄 刷新")
        refreshButton.preferredSize = Dimension(80, 30)
        refreshButton.addActionListener {
            refreshMemoryInfo()
        }

        panel.add(clearCacheButton)
        panel.add(Box.createHorizontalStrut(10))
        panel.add(gcButton)
        panel.add(Box.createHorizontalStrut(10))
        panel.add(refreshButton)

        return panel
    }

    private fun createSettingRow(labelText: String, description: String, defaultValue: String): Pair<JPanel, JTextField> {
        val rowPanel = JPanel()
        rowPanel.layout = BoxLayout(rowPanel, BoxLayout.Y_AXIS)
        rowPanel.alignmentX = Component.LEFT_ALIGNMENT

        // 标签和输入框行
        val inputPanel = JPanel(FlowLayout(FlowLayout.LEFT, 0, 0))
        val label = JLabel(labelText)
        label.preferredSize = Dimension(180, 25)
        inputPanel.add(label)

        val textField = JTextField(15)
        textField.preferredSize = Dimension(100, 25)
        inputPanel.add(textField)

        val defaultLabel = JLabel("(默认: $defaultValue)")
        defaultLabel.foreground = Color.GRAY
        defaultLabel.font = defaultLabel.font.deriveFont(Font.ITALIC, 12f)
        inputPanel.add(Box.createHorizontalStrut(10))
        inputPanel.add(defaultLabel)

        rowPanel.add(inputPanel)

        // 描述行
        val descLabel = JLabel("  $description")
        descLabel.foreground = Color.GRAY
        descLabel.font = descLabel.font.deriveFont(11f)
        rowPanel.add(descLabel)

        return Pair(rowPanel, textField)
    }

    private fun createButtonPanel(): JPanel {
        val buttonPanel = JPanel(FlowLayout(FlowLayout.LEFT))
        buttonPanel.alignmentX = Component.LEFT_ALIGNMENT

        resetButton = JButton("🔄 重置为默认值")
        resetButton.preferredSize = Dimension(150, 30)
        buttonPanel.add(resetButton)

        return buttonPanel
    }

    private fun createHelpPanel(): JPanel {
        val helpPanel = JPanel()
        helpPanel.layout = BoxLayout(helpPanel, BoxLayout.Y_AXIS)
        helpPanel.border = BorderFactory.createTitledBorder(
            BorderFactory.createEtchedBorder(),
            "💡 使用说明"
        )
        helpPanel.alignmentX = Component.LEFT_ALIGNMENT

        val tips = listOf(
            "• 每页文字数量: 控制状态栏显示的文字数量，建议50-200之间",
            "• 换行分隔符: 用于替换文本中的换行符，通常使用空格",
            "• 最近阅读列表: 保存最近打开的书籍记录，便于快速访问"
        )

        tips.forEach { tip ->
            val tipLabel = JLabel(tip)
            tipLabel.font = tipLabel.font.deriveFont(12f)
            tipLabel.alignmentX = Component.LEFT_ALIGNMENT
            tipLabel.border = BorderFactory.createEmptyBorder(2, 10, 2, 0)
            helpPanel.add(tipLabel)
        }

        return helpPanel
    }

    private fun clearCache() {
        try {
            // 清理书籍管理器的缓存
            bookManager.clearCache()

            // 强制垃圾回收
            System.gc()

            Messages.showInfoMessage("缓存已清理", "ZeroMoyu-Book")

            // 刷新内存信息
            refreshMemoryInfo()

        } catch (e: Exception) {
            Messages.showErrorDialog("清理缓存失败: ${e.message}", "错误")
        }
    }

    private fun forceGarbageCollection() {
        try {
            val beforeMemory = Runtime.getRuntime().let {
                (it.totalMemory() - it.freeMemory()) / 1024 / 1024
            }

            // 强制垃圾回收
            System.gc()
            System.runFinalization()
            System.gc()

            val afterMemory = Runtime.getRuntime().let {
                (it.totalMemory() - it.freeMemory()) / 1024 / 1024
            }

            val freedMemory = beforeMemory - afterMemory

            Messages.showInfoMessage(
                "垃圾回收完成\n释放内存: ${freedMemory} MB",
                "ZeroMoyu-Book"
            )

            // 刷新内存信息
            refreshMemoryInfo()

        } catch (e: Exception) {
            Messages.showErrorDialog("垃圾回收失败: ${e.message}", "错误")
        }
    }

    private fun refreshMemoryInfo() {
        // 重新创建组件来刷新内存信息
        // 这里可以通过事件机制来更新，但为了简单起见，显示提示信息
        Messages.showInfoMessage("内存信息已刷新，请重新打开设置页面查看最新数据", "提示")
    }

    private fun loadCurrentSettings() {
        pageSizeField.text = bookManager.getPageSize().toString()
        lineBreakField.text = bookManager.getLineBreak()
        maxRecentFilesField.text = bookManager.getMaxRecentFiles().toString()
    }
    
    private fun setupListeners() {
        resetButton.addActionListener {
            if (Messages.showYesNoDialog(
                    "确定要重置所有设置为默认值吗？",
                    "确认重置",
                    Messages.getQuestionIcon()
                ) == Messages.YES
            ) {
                pageSizeField.text = "50"
                lineBreakField.text = " "
                maxRecentFilesField.text = "10"
            }
        }
        
        // 添加文档监听器，启用"应用"按钮
        val documentListener = object : DocumentListener {
            override fun insertUpdate(e: DocumentEvent) = markModified()
            override fun removeUpdate(e: DocumentEvent) = markModified()
            override fun changedUpdate(e: DocumentEvent) = markModified()
        }
        
        pageSizeField.document.addDocumentListener(documentListener)
        lineBreakField.document.addDocumentListener(documentListener)
        maxRecentFilesField.document.addDocumentListener(documentListener)
    }
    
    private fun markModified() {
        // 标记配置已修改，这将启用"应用"按钮
        // IntelliJ Platform会自动处理这个逻辑
    }
    
    override fun isModified(): Boolean {
        try {
            return pageSizeField.text.toInt() != bookManager.getPageSize() ||
                   lineBreakField.text != bookManager.getLineBreak() ||
                   maxRecentFilesField.text.toInt() != bookManager.getMaxRecentFiles()
        } catch (e: NumberFormatException) {
            return true
        }
    }
    
    override fun apply() {
        try {
            val pageSize = pageSizeField.text.toInt()
            val lineBreak = lineBreakField.text
            val maxRecentFiles = maxRecentFilesField.text.toInt()
            
            // 验证设置
            if (pageSize <= 0) {
                Messages.showErrorDialog("每页文字数量必须大于0", "错误")
                return
            }

            if (maxRecentFiles <= 0) {
                Messages.showErrorDialog("最近阅读列表最大数量必须大于0", "错误")
                return
            }

            // 应用设置
            bookManager.setPageSize(pageSize)
            bookManager.setLineBreak(lineBreak)
            bookManager.setMaxRecentFiles(maxRecentFiles)

            Messages.showInfoMessage("设置已保存", "ZeroMoyu-Book")

        } catch (e: NumberFormatException) {
            Messages.showErrorDialog("请输入有效的数字", "错误")
        }
    }
    
    override fun reset() {
        loadCurrentSettings()
    }
    
    override fun disposeUIResources() {
        // 清理UI资源
    }
}
