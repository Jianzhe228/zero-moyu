package com.zeromoyu.idea.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.ui.components.JBList
import com.intellij.ui.components.JBScrollPane
import com.zeromoyu.idea.service.BookManagerService
import com.zeromoyu.idea.utils.NotificationUtils
import java.awt.*
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import javax.swing.*

class RecentBooksDialog(private val project: Project) : DialogWrapper(project, false) {
    private val bookManager = BookManagerService.getInstance()
    private lateinit var bookList: JBList<RecentBookItem>
    
    data class RecentBookItem(
        val path: String,
        val name: String,
        val lastRead: Long,
        val progress: String
    )
    
    init {
        title = "📖 最近阅读"
        setOKButtonText("打开")
        init()
    }
    
    override fun createCenterPanel(): JComponent {
        val panel = JPanel(BorderLayout())
        panel.preferredSize = Dimension(500, 400)
        
        val listModel = DefaultListModel<RecentBookItem>()
        bookManager.getRecentFiles().forEach { path ->
            if (File(path).exists()) {
                val progress = bookManager.getBookProgress(path)
                listModel.addElement(RecentBookItem(
                    path = path,
                    name = File(path).nameWithoutExtension,
                    lastRead = progress.lastRead,
                    progress = "${progress.pageNumber}/${progress.totalPage}"
                ))
            }
        }
        
        if (listModel.isEmpty) {
            // 没有最近阅读时显示提示
            val emptyPanel = JPanel(GridBagLayout())
            val label = JLabel("暂无最近阅读记录")
            label.foreground = Color.GRAY
            emptyPanel.add(label)
            panel.add(emptyPanel, BorderLayout.CENTER)
        } else {
            bookList = JBList(listModel)
            bookList.cellRenderer = RecentBookCellRenderer()
            bookList.selectionMode = ListSelectionModel.SINGLE_SELECTION
            
            // 双击打开
            bookList.addMouseListener(object : MouseAdapter() {
                override fun mouseClicked(e: MouseEvent) {
                    if (e.clickCount == 2 && bookList.selectedIndex >= 0) {
                        doOKAction()
                    }
                }
            })
            
            val scrollPane = JBScrollPane(bookList)
            scrollPane.border = BorderFactory.createCompoundBorder(
                BorderFactory.createEmptyBorder(10, 10, 10, 10),
                BorderFactory.createLineBorder(Color.LIGHT_GRAY)
            )
            panel.add(scrollPane, BorderLayout.CENTER)
        }
        
        return panel
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
    
    private class RecentBookCellRenderer : DefaultListCellRenderer() {
        private val dateFormat = SimpleDateFormat("MM-dd HH:mm")
        
        override fun getListCellRendererComponent(
            list: JList<*>?,
            value: Any?,
            index: Int,
            isSelected: Boolean,
            cellHasFocus: Boolean
        ): Component {
            super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus)
            
            if (value is RecentBookItem) {
                text = buildString {
                    append("${index + 1}. ")
                    append(value.name)
                    append("  [${value.progress}]")
                    if (value.lastRead > 0) {
                        append("  ")
                        append(dateFormat.format(Date(value.lastRead)))
                    }
                }
            }
            
            border = BorderFactory.createEmptyBorder(8, 10, 8, 10)
            
            return this
        }
    }
}
