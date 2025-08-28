package com.zeromoyu.idea.model

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.diagnostic.thisLogger
import com.zeromoyu.idea.service.BookManagerService
import java.io.File
import java.nio.charset.Charset
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Paths

@State(
    name = "ThiefBookReadingProgress",
    storages = [Storage("thief-book-reading-progress.xml")]
)
class Book : PersistentStateComponent<Book.ReadingProgressState> {
    
    data class ReadingProgressState(
        var progress: Map<String, BookProgress> = emptyMap()
    )
    
    data class BookProgress(
        var pageNumber: Int = 1,
        var lastRead: Long = 0,
        var totalPage: Int = 1
    )
    
    data class BookConfig(
        var pageSize: Int = 50,
        var lineBreak: String = " "
    )
    
    var currentPageNumber: Int = 1
    var pageSize: Int = 50
    var totalPages: Int = 0
    var start: Int = 0
    var end: Int = 0
    var filePath: String = ""
    
    private var cachedText: String? = null
    private var cachedFilePath: String = ""
    private var cachedConfig: BookConfig? = null
    
    private val logger = thisLogger()
    
    override fun getState(): ReadingProgressState {
        return ReadingProgressState(getAllProgress())
    }
    
    override fun loadState(state: ReadingProgressState) {
        // 状态会在需要时从持久化存储中读取
    }
    
    fun setBookFilePath(path: String) {
        filePath = path
        cachedText = null
        cachedFilePath = ""
        cachedConfig = null
        loadFileProgress()
    }
    
    fun setConfig(pageSize: Int, lineBreak: String) {
        if (cachedConfig == null) {
            cachedConfig = BookConfig()
        }
        cachedConfig!!.pageSize = pageSize
        cachedConfig!!.lineBreak = lineBreak
        this.pageSize = pageSize
        init()
    }
    
    private fun loadFileProgress() {
        val progress = getReadingProgress()
        if (progress != null) {
            currentPageNumber = progress.pageNumber
        }
    }
    
    private fun getReadingProgress(): BookProgress? {
        val service = ApplicationManager.getApplication().getService(BookManagerService::class.java)
        return service?.getReadingProgress(filePath)
    }
    
    fun getCurrentPage(): Int = currentPageNumber
    
    fun cleanup() {
        logger.info("Cleaning up Book instance for: $filePath")
        cachedText = null
        cachedFilePath = ""
        cachedConfig = null
        chapters = null
        currentPageNumber = 1
        totalPages = 0
        start = 0
        end = pageSize
        logger.info("Book instance cleaned up for: $filePath")
    }
    
    fun saveReadingProgress() {
        val progress = BookProgress(
            pageNumber = currentPageNumber,
            lastRead = System.currentTimeMillis(),
            totalPage = totalPages.coerceAtLeast(1)
        )

        val service = ApplicationManager.getApplication().getService(BookManagerService::class.java)
        service?.saveReadingProgress(filePath, progress)

        logger.info("Reading progress saved for: $filePath, page: $currentPageNumber")
    }
    
    private fun getAllProgress(): Map<String, BookProgress> {
        val service = ApplicationManager.getApplication().getService(BookManagerService::class.java)
        return service?.getReadingProgress() ?: emptyMap()
    }
    
    fun getPage(type: String): Int {
        var page = 0
        when (type) {
            "previous" -> {
                page = if (currentPageNumber <= 1) 1 else currentPageNumber - 1
            }
            "next" -> {
                page = if (currentPageNumber >= totalPages) totalPages else currentPageNumber + 1
            }
            "curr" -> {
                page = currentPageNumber
            }
        }
        currentPageNumber = page
        return page
    }
    
    fun updatePage() {
        // 页面状态现在完全由Book实例自己维护
    }
    
    fun getStartEnd() {
        start = (currentPageNumber - 1) * pageSize
        end = currentPageNumber * pageSize
        
        cachedText?.let { text ->
            start = maxOf(0, minOf(start, text.length))
            end = maxOf(start, minOf(end, text.length))
        }
    }
    
    fun formatStatusBarContent(content: String, pageInfo: String): String {
        val maxContentLength = 100
        val ellipsis = "..."
        val pageInfoSeparator = "    "
        
        logger.debug("formatStatusBarContent: pageInfo=\"$pageInfo\", content_length=${content.length}")
        
        return if (content.length > maxContentLength) {
            var truncatedContent = content.substring(0, maxContentLength - ellipsis.length)
            
            val lastSpace = maxOf(
                truncatedContent.lastIndexOf(' '),
                truncatedContent.lastIndexOf('，'),
                truncatedContent.lastIndexOf('。'),
                truncatedContent.lastIndexOf(','),
                truncatedContent.lastIndexOf('.')
            )
            
            truncatedContent = if (lastSpace > maxContentLength * 0.6) {
                truncatedContent.substring(0, lastSpace) + ellipsis
            } else {
                truncatedContent + ellipsis
            }
            
            val result = truncatedContent + pageInfoSeparator + pageInfo
            logger.debug("Truncated result: ${result.length} chars")
            result
        } else {
            val result = content + pageInfoSeparator + pageInfo
            logger.debug("Normal result: ${result.length} chars")
            result
        }
    }
    
    fun readFile(): String {
        if (filePath.isBlank()) {
            return ""
        }

        if (cachedText == null || cachedFilePath != filePath) {
            try {
                val bytes = Files.readAllBytes(Paths.get(filePath))
                val charset = detectCharset(bytes)
                val data = String(bytes, charset)

                val config = getCachedConfig()
                // 优化字符串处理：使用StringBuilder减少内存分配
                cachedText = processTextContent(data, config)
                cachedFilePath = filePath

                logger.info("Successfully loaded file: $filePath (${cachedText!!.length} chars)")
            } catch (e: Exception) {
                logger.error("Failed to read file: $filePath", e)
                return ""
            }
        }

        return cachedText ?: ""
    }

    private fun processTextContent(data: String, config: BookConfig): String {
        // 使用StringBuilder优化字符串处理性能
        val sb = StringBuilder(data.length)
        var i = 0
        while (i < data.length) {
            when (data[i]) {
                '\n' -> sb.append(config.lineBreak)
                '\r' -> sb.append(' ')
                '　' -> {
                    if (i + 1 < data.length && data[i + 1] == '　') {
                        sb.append(' ')
                        i++ // 跳过下一个全角空格
                    } else {
                        sb.append(data[i])
                    }
                }
                ' ' -> sb.append(' ')
                else -> sb.append(data[i])
            }
            i++
        }
        return sb.toString()
    }
    
    private fun detectCharset(bytes: ByteArray): Charset {
        // 简单的字符集检测，优先UTF-8
        return try {
            String(bytes, StandardCharsets.UTF_8)
            StandardCharsets.UTF_8
        } catch (e: Exception) {
            StandardCharsets.ISO_8859_1
        }
    }
    
    private fun getCachedConfig(): BookConfig {
        if (cachedConfig == null) {
            cachedConfig = BookConfig(
                pageSize = this.pageSize,
                lineBreak = " "
            )
        }
        return cachedConfig!!
    }
    
    fun init() {
        val text = readFile()
        val size = text.length
        totalPages = maxOf(1, (size + pageSize - 1) / pageSize)

        // 加载阅读进度
        loadFileProgress()

        getStartEnd()

        logger.info("Book initialized: $filePath, totalPages: $totalPages, currentPage: $currentPageNumber")
    }
    
    fun getCurrentPageContent(): String {
        val text = readFile()
        getStartEnd()

        return if (text.isEmpty()) {
            ""
        } else {
            val endIndex = minOf(end, text.length)
            val content = text.substring(start, endIndex)
            val pageInfo = "${currentPageNumber}/${totalPages}"
            formatStatusBarContent(content, pageInfo)
        }
    }
    
    fun getJumpingPage(targetPage: Int = currentPageNumber): String {
        if (targetPage < 1 || targetPage > totalPages) {
            return "页码超出范围 (1-$totalPages)"
        }
        
        currentPageNumber = targetPage
        getStartEnd()
        
        return getCurrentPageContent()
    }
    
    fun getPreviousPageContent(): String {
        getPage("previous")
        return getJumpingPage()
    }
    
    fun getNextPageContent(): String {
        getPage("next")
        return getJumpingPage()
    }
    
    // 章节数据类
    data class Chapter(
        val title: String,
        val position: Int,
        val page: Int
    )

    // 缓存章节列表
    private var chapters: List<Chapter>? = null

    // 章节识别功能 - 完全学习VSCode插件的实现
    fun detectChapters(): List<Chapter> {
        init()
        val text = readFile()
        val chapters = mutableListOf<Chapter>()
        val usedPositions = mutableSetOf<Int>()

        logger.info("开始章节检测...")

        // 更精确的章节检测 - 完全按照VSCode插件的模式
        val patterns = listOf(
            // 中文章节：第X章 + 空格/标点
            Regex("""第[一二三四五六七八九十百千万\d]+章[\s：:,.。]"""),
            // 数字章节：第1章 + 空格/标点
            Regex("""第\d+章[\s：:,.。]"""),
            // 英文章节：Chapter 1 + 空格/标点
            Regex("""Chapter\s+[IVXLCDM\d]+[\s：:,.]""", RegexOption.IGNORE_CASE),
            // 英文章节：Chapter One + 空格/标点
            Regex("""Chapter\s+[A-Za-z]+[\s：:,.]""", RegexOption.IGNORE_CASE),
            // 中文章节：第X节 + 空格/标点
            Regex("""第[一二三四五六七八九十百千万\d]+节[\s：:,.。]"""),
            // 数字章节：第1节 + 空格/标点
            Regex("""第\d+节[\s：:,.。]""")
        )

        // 获取配置中的分隔符 - 这是关键！
        val config = getCachedConfig()
        val lineBreak = config.lineBreak

        // 对每种模式进行搜索
        for (pattern in patterns) {
            pattern.findAll(text).forEach { match ->
                val position = match.range.first
                val chapterTitle = match.value

                // 避免重复的位置
                if (usedPositions.contains(position)) {
                    return@forEach
                }

                // 检查是否是独立的章节标题（不在单词中间）
                val prevChar = if (position > 0) text[position - 1].toString() else ""
                if (prevChar.isNotEmpty() && Regex("""[\w\u4e00-\u9fa5]""").matches(prevChar)) {
                    return@forEach // 前面有字符，可能是单词的一部分
                }

                usedPositions.add(position)

                // 计算章节所在的页码
                val page = (position / pageSize) + 1

                // 清理章节标题（移除后面的标点符号）
                var cleanTitle = chapterTitle.replace(Regex("""[\s：:,.。]+$"""), "")

                // 尝试获取完整的章节标题
                var fullTitle = cleanTitle

                // 在标题后面查找内容，直到遇到分隔符或文件结束
                val contentStart = position + chapterTitle.length
                val contentEnd = text.indexOf(lineBreak, contentStart)

                if (contentEnd != -1) {
                    val content = text.substring(contentStart, contentEnd).trim()
                    if (content.isNotEmpty()) {
                        // 清理内容，移除多余的标点符号
                        val cleanContent = content.replace(Regex("""^[：:\s]+"""), "").trim()
                        if (cleanContent.isNotEmpty()) {
                            fullTitle += " $cleanContent"
                        }
                    }
                }

                // 限制标题长度
                if (fullTitle.length > 40) {
                    fullTitle = fullTitle.substring(0, 40) + "..."
                }

                chapters.add(Chapter(
                    title = fullTitle,
                    position = position,
                    page = page
                ))

                logger.info("检测到章节: $fullTitle (位置: $position, 页码: $page)")
            }
        }

        // 按位置排序
        chapters.sortBy { it.position }

        // 缓存章节信息
        this.chapters = chapters

        logger.info("章节检测完成，共检测到 ${chapters.size} 个章节")
        return chapters
    }

    // 获取章节列表
    fun getChapters(): List<Chapter> {
        if (chapters == null) {
            chapters = detectChapters()
        }
        return chapters ?: emptyList()
    }

    // 获取章节标题列表（兼容旧接口）
    fun getChapterList(): List<String> {
        return getChapters().map { it.title }
    }

    // 跳转到指定章节
    fun jumpToChapter(chapterIndex: Int): String {
        val chapters = getChapters()

        if (chapterIndex < 0 || chapterIndex >= chapters.size) {
            return "章节索引超出范围"
        }

        val chapter = chapters[chapterIndex]
        return getJumpingPage(chapter.page)
    }

    // 跳转到上一章
    fun jumpToPreviousChapter(): String? {
        val chapters = getChapters()
        val currentPage = getCurrentPage()

        // 找到当前页之前的最后一个章节
        for (i in chapters.size - 1 downTo 0) {
            if (chapters[i].page < currentPage) {
                return jumpToChapter(i)
            }
        }

        // 如果没有找到，跳转到第一章
        if (chapters.isNotEmpty()) {
            return jumpToChapter(0)
        }

        return null
    }

    // 跳转到下一章
    fun jumpToNextChapter(): String? {
        val chapters = getChapters()
        val currentPage = getCurrentPage()

        // 找到当前页之后的第一个章节
        for (i in chapters.indices) {
            if (chapters[i].page > currentPage) {
                return jumpToChapter(i)
            }
        }

        // 如果没有找到，跳转到最后一章
        if (chapters.isNotEmpty()) {
            return jumpToChapter(chapters.size - 1)
        }

        return null
    }

    // 获取当前章节信息
    fun getCurrentChapter(): Chapter? {
        val chapters = getChapters()
        val currentPage = getCurrentPage()

        // 找到当前页对应的章节
        for (i in chapters.size - 1 downTo 0) {
            if (chapters[i].page <= currentPage) {
                return chapters[i]
            }
        }

        return null
    }

    // 兼容旧的navigateToChapter方法
    fun navigateToChapter(chapterIndex: Int): String {
        return jumpToChapter(chapterIndex)
    }


    
    // 搜索文字并跳转到对应页面
    fun searchText(keyword: String): String? {
        if (keyword.trim().isEmpty()) {
            return null
        }
        
        val text = readFile()
        val keywordIndex = text.indexOf(keyword)
        
        if (keywordIndex == -1) {
            return null
        }
        
        // 计算关键词所在的页码
        val targetPage = (keywordIndex / pageSize) + 1
        
        // 跳转到该页
        return getJumpingPage(targetPage)
    }
}
