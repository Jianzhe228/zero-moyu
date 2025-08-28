package com.zeromoyu.idea.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.ui.components.JBList
import com.intellij.ui.components.JBScrollPane
import com.zeromoyu.idea.model.Book
import com.zeromoyu.idea.service.BookManagerService
import com.zeromoyu.idea.utils.NotificationUtils
import java.awt.Dimension
import java.awt.Component
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.*

class ChapterListDialog(private val project: Project) : DialogWrapper(project, false) {
    private val bookManager = BookManagerService.getInstance()
    private lateinit var chapterList: JBList<ChapterItem>
    private var chapters: List<Book.Chapter> = emptyList()
    
    data class ChapterItem(
        val chapter: Book.Chapter,
        val index: Int,
        val isCurrent: Boolean = false
    )
    
    init {
        title = "📖 章节列表"
        setOKButtonText("跳转")
        init()
    }
    
    override fun createCenterPanel(): JComponent {
        val panel = JPanel()
        panel.layout = BoxLayout(panel, BoxLayout.Y_AXIS)
        
        // 加载章节
        loadChapters()
        
        if (chapters.isEmpty()) {
            // 没有章节时显示提示
            val emptyLabel = JLabel("未检测到章节")
            emptyLabel.alignmentX = Component.CENTER_ALIGNMENT
            panel.add(Box.createVerticalGlue())
            panel.add(emptyLabel)
            panel.add(Box.createVerticalGlue())
        } else {
            // 创建列表
            val listModel = DefaultListModel<ChapterItem>()
            val currentPage = bookManager.getCurrentBook()?.getCurrentPage() ?: 1
            
            chapters.forEachIndexed { index, chapter ->
                listModel.addElement(ChapterItem(
                    chapter, 
                    index, 
                    chapter.page <= currentPage && 
                    (index == chapters.size - 1 || chapters[index + 1].page > currentPage)
                ))
            }
            
            chapterList = JBList(listModel)
            chapterList.cellRenderer = ChapterListCellRenderer()
            chapterList.selectionMode = ListSelectionModel.SINGLE_SELECTION
            
            // 双击跳转
            chapterList.addMouseListener(object : MouseAdapter() {
                override fun mouseClicked(e: MouseEvent) {
                    if (e.clickCount == 2 && chapterList.selectedIndex >= 0) {
                        doOKAction()
                    }
                }
            })
            
            // 自动选中当前章节
            listModel.elements().asSequence().forEachIndexed { index, item ->
                if (item.isCurrent) {
                    chapterList.selectedIndex = index
                    chapterList.ensureIndexIsVisible(index)
                }
            }
            
            val scrollPane = JBScrollPane(chapterList)
            panel.add(scrollPane)
        }
        
        panel.preferredSize = Dimension(450, 400)
        return panel
    }
    
    private fun loadChapters() {
        chapters = bookManager.getDetailedChapterList()
    }
    
    override fun doOKAction() {
        val selected = chapterList.selectedValue
        if (selected != null) {
            // 跳转到章节
            val content = bookManager.getCurrentBook()?.jumpToChapter(selected.index) ?: ""
            bookManager.getCurrentBook()?.saveReadingProgress()
            
            // 关键修改：更新状态栏
            bookManager.updateStatusBar(project, content)
            
            NotificationUtils.showInfo(project, "已跳转到: ${selected.chapter.title}")
            super.doOKAction()
        }
    }
    
    private class ChapterListCellRenderer : DefaultListCellRenderer() {
        override fun getListCellRendererComponent(
            list: JList<*>?,
            value: Any?,
            index: Int,
            isSelected: Boolean,
            cellHasFocus: Boolean
        ): Component {
            super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus)
            
            if (value is ChapterItem) {
                text = buildString {
                    if (value.isCurrent) {
                        append("▶ ")
                        font = font.deriveFont(java.awt.Font.BOLD)
                    }
                    append(value.chapter.title)
                    append("  [第${value.chapter.page}页]")
                }
            }
            
            return this
        }
    }
}
