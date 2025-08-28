package com.zeromoyu.idea.ui

import com.intellij.openapi.fileChooser.FileChooser
import com.intellij.openapi.fileChooser.FileChooserDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.ui.Messages
import com.intellij.ui.components.JBList
import com.intellij.ui.components.JBScrollPane
import com.zeromoyu.idea.service.BookManagerService
import com.zeromoyu.idea.utils.NotificationUtils
import java.awt.*
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.io.File
import javax.swing.*
import javax.swing.event.ListSelectionEvent

class BookLibraryDialog(private val project: Project) : DialogWrapper(project, false) {
    private val bookManager = BookManagerService.getInstance()
    private lateinit var bookList: JBList<BookItem>
    private lateinit var listModel: DefaultListModel<BookItem>
    private lateinit var addButton: JButton
    private lateinit var removeButton: JButton
    private lateinit var infoLabel: JLabel  // 添加成员变量
    
    data class BookItem(
        val path: String,
        val name: String,
        val progress: String,
        val isCurrentBook: Boolean = false
    )
    
    init {
        title = "📚 图书库"
        setOKButtonText("打开")
        setCancelButtonText("关闭")
        init()
    }
    
    override fun createCenterPanel(): JComponent {
        val panel = JPanel(BorderLayout())
        panel.preferredSize = Dimension(650, 500)
        
        // 顶部工具栏
        val toolbar = createToolbar()
        panel.add(toolbar, BorderLayout.NORTH)
        
        // 图书列表
        listModel = DefaultListModel()
        bookList = JBList(listModel)
        bookList.cellRenderer = BookListCellRenderer()
        bookList.selectionMode = ListSelectionModel.MULTIPLE_INTERVAL_SELECTION
        
        // 添加选择监听器
        bookList.addListSelectionListener { e: ListSelectionEvent ->
            if (!e.valueIsAdjusting) {
                updateButtonStates()
            }
        }
        
        // 双击打开图书
        bookList.addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                if (e.clickCount == 2 && bookList.selectedIndex >= 0) {
                    doOKAction()
                }
            }
        })
        
        val scrollPane = JBScrollPane(bookList)
        scrollPane.border = BorderFactory.createCompoundBorder(
            BorderFactory.createEmptyBorder(5, 10, 5, 10),
            BorderFactory.createLineBorder(Color.LIGHT_GRAY)
        )
        panel.add(scrollPane, BorderLayout.CENTER)
        
        // 底部信息栏
        val infoPanel = createInfoPanel()
        panel.add(infoPanel, BorderLayout.SOUTH)
        
        // 加载图书列表
        loadBooks()
        
        return panel
    }
    
    private fun createToolbar(): JComponent {
        val toolbar = JPanel(FlowLayout(FlowLayout.LEFT))
        toolbar.border = BorderFactory.createEmptyBorder(5, 10, 5, 10)
        toolbar.background = Color(245, 245, 245)
        
        addButton = JButton("➕ 添加图书")
        addButton.toolTipText = "支持批量选择多个文件或文件夹"
        addButton.preferredSize = Dimension(120, 30)
        addButton.addActionListener { addBooks() }
        
        removeButton = JButton("➖ 删除图书")
        removeButton.toolTipText = "删除选中的图书（支持多选）"
        removeButton.preferredSize = Dimension(120, 30)
        removeButton.isEnabled = false
        removeButton.addActionListener { removeBooks() }
        
        toolbar.add(addButton)
        toolbar.add(removeButton)
        
        return toolbar
    }
    
    private fun createInfoPanel(): JComponent {
        val infoPanel = JPanel(FlowLayout(FlowLayout.LEFT))
        infoPanel.border = BorderFactory.createEmptyBorder(5, 15, 5, 15)
        infoPanel.background = Color(245, 245, 245)
        
        infoLabel = JLabel("📚 共 0 本书")  // 初始化
        infoLabel.foreground = Color.GRAY
        infoLabel.font = infoLabel.font.deriveFont(12f)
        infoPanel.add(infoLabel)
        
        return infoPanel
    }
    
    private fun updateBookCount() {
        val totalBooks = listModel.size()
        infoLabel.text = "📚 共 $totalBooks 本书"
    }
    
    private fun loadBooks() {
        listModel.clear()
        val library = bookManager.getFileLibrary()
        val currentBookPath = bookManager.getCurrentBook()?.filePath ?: ""
        
        library.forEach { path ->
            val file = File(path)
            if (file.exists()) {
                val progress = bookManager.getBookProgress(path)
                val item = BookItem(
                    path = path,
                    name = file.nameWithoutExtension,
                    progress = "${progress.pageNumber}/${progress.totalPage}",
                    isCurrentBook = path == currentBookPath
                )
                listModel.addElement(item)
            }
        }
        
        updateButtonStates()
        updateBookCount()  // 关键修改：加载后更新数量
    }
    
    private fun updateButtonStates() {
        removeButton.isEnabled = !bookList.isSelectionEmpty
    }
    
    private fun addBooks() {
        val descriptor = FileChooserDescriptor(true, true, false, false, true, true).apply {
            title = "选择图书文件或文件夹"
            description = "支持批量选择TXT文件或包含TXT文件的文件夹"
            withFileFilter { virtualFile ->
                virtualFile.isDirectory || virtualFile.name.endsWith(".txt", ignoreCase = true)
            }
        }
        
        FileChooser.chooseFiles(descriptor, project, null) { files ->
            var addedCount = 0
            var skippedCount = 0
            val addedBooks = mutableListOf<String>()
            
            files.forEach { virtualFile ->
                if (virtualFile.isDirectory) {
                    val txtFiles = findTxtFiles(File(virtualFile.path))
                    txtFiles.forEach { path ->
                        if (bookManager.addToFileLibrary(path)) {
                            addedCount++
                            addedBooks.add(File(path).nameWithoutExtension)
                        } else {
                            skippedCount++
                        }
                    }
                } else if (virtualFile.name.endsWith(".txt", ignoreCase = true)) {
                    if (bookManager.addToFileLibrary(virtualFile.path)) {
                        addedCount++
                        addedBooks.add(virtualFile.nameWithoutExtension)
                    } else {
                        skippedCount++
                    }
                }
            }
            
            // 刷新列表
            loadBooks()
            
            // 显示简化的结果通知
            val message = when {
                addedCount > 0 && skippedCount > 0 -> "✅ 添加了 $addedCount 本，跳过 $skippedCount 本重复"
                addedCount > 0 -> "✅ 成功添加 $addedCount 本书"
                skippedCount > 0 -> "⚠️ 所选书籍已存在"
                else -> "未添加任何书籍"
            }
            NotificationUtils.showInfo(project, message)
        }
    }
    
    private fun findTxtFiles(dir: File): List<String> {
        val result = mutableListOf<String>()
        dir.listFiles()?.forEach { file ->
            when {
                file.isFile && file.name.endsWith(".txt", ignoreCase = true) -> {
                    result.add(file.absolutePath)
                }
                file.isDirectory -> {
                    result.addAll(findTxtFiles(file))
                }
            }
        }
        return result
    }
    
    private fun removeBooks() {
        val selectedIndices = bookList.selectedIndices
        if (selectedIndices.isEmpty()) return
        
        val selectedBooks = selectedIndices.map { listModel.getElementAt(it) }
        
        // 简化确认对话框
        if (selectedBooks.size > 1) {
            val result = Messages.showYesNoDialog(
                project,
                "确定要删除选中的 ${selectedBooks.size} 本书吗？",
                "确认删除",
                Messages.getQuestionIcon()
            )
            if (result != Messages.YES) return
        }
        
        var currentBookRemoved = false
        
        selectedBooks.forEach { book ->
            if (book.isCurrentBook) {
                currentBookRemoved = true
            }
            bookManager.removeBookFromLibrary(book.path)
        }
        
        // 刷新列表
        loadBooks()
        
        // 简化的通知
        val message = if (currentBookRemoved) {
            "已删除 ${selectedBooks.size} 本书（包括当前阅读）"
        } else {
            "已删除 ${selectedBooks.size} 本书"
        }
        NotificationUtils.showInfo(project, message)
    }
    
    override fun doOKAction() {
        val selected = bookList.selectedValue
        if (selected != null) {
            if (bookManager.openBook(selected.path)) {
                bookManager.updateStatusBar(project, bookManager.getCurrentBookContent())
                super.doOKAction()
            }
        }
    }
    
    // 美化的渲染器
    private class BookListCellRenderer : DefaultListCellRenderer() {
        override fun getListCellRendererComponent(
            list: JList<*>?,
            value: Any?,
            index: Int,
            isSelected: Boolean,
            cellHasFocus: Boolean
        ): Component {
            super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus)
            
            if (value is BookItem) {
                text = buildString {
                    if (value.isCurrentBook) append("📖 ") else append("📕 ")
                    append(value.name)
                    append("  ")
                }
                
                // 创建进度标签
                val progressText = "[${value.progress}]"
                
                if (value.isCurrentBook) {
                    font = font.deriveFont(Font.BOLD)
                    if (!isSelected) {
                        foreground = Color(0, 120, 0)
                    }
                }
                
                // 添加进度信息到末尾
                text += progressText
            }
            
            border = BorderFactory.createEmptyBorder(5, 10, 5, 10)
            
            return this
        }
    }
}
