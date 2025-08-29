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
import java.lang.ref.SoftReference

@State(
    name = "ZeroMoyuReadingProgress",
    storages = [Storage("zero-moyu-book-reading-progress.xml")]
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
    
    // 使用软引用缓存文本，允许在内存紧张时被回收
    private var cachedTextRef: SoftReference<String>? = null
    private var cachedFilePath: String = ""
    private var cachedConfig: BookConfig? = null
    
    // 使用软引用缓存章节信息
    private var chaptersRef: SoftReference<List<Chapter>>? = null
    
    private val logger = thisLogger()
    
    override fun getState(): ReadingProgressState {
        return ReadingProgressState(getAllProgress())
    }
    
    override fun loadState(state: ReadingProgressState) {
        // 状态会在需要时从持久化存储中读取
    }
    
    fun setBookFilePath(path: String) {
        filePath = path
        cachedTextRef = null
        cachedFilePath = ""
        cachedConfig = null
        chaptersRef = null
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
        try {
            val progress = getReadingProgress()
            if (progress != null) {
                currentPageNumber = progress.pageNumber
            }
        } catch (e: Exception) {
            logger.error("Failed to load file progress", e)
            currentPageNumber = 1
        }
    }
    
    private fun getReadingProgress(): BookProgress? {
        return try {
            val service = ApplicationManager.getApplication().getService(BookManagerService::class.java)
            service?.getReadingProgress(filePath)
        } catch (e: Exception) {
            logger.error("Failed to get reading progress", e)
            null
        }
    }
    
    fun getCurrentPage(): Int = currentPageNumber
    
    fun cleanup() {
        try {
            logger.info("Cleaning up Book instance for: $filePath")
            cachedTextRef?.clear()
            cachedTextRef = null
            cachedFilePath = ""
            cachedConfig = null
            chaptersRef?.clear()
            chaptersRef = null
            currentPageNumber = 1
            totalPages = 0
            start = 0
            end = pageSize
            
            // 建议垃圾回收
            System.gc()
            
            logger.info("Book instance cleaned up for: $filePath")
        } catch (e: Exception) {
            logger.error("Failed to cleanup book instance", e)
        }
    }
    
    fun saveReadingProgress() {
        try {
            val progress = BookProgress(
                pageNumber = currentPageNumber,
                lastRead = System.currentTimeMillis(),
                totalPage = totalPages.coerceAtLeast(1)
            )

            val service = ApplicationManager.getApplication().getService(BookManagerService::class.java)
            service?.saveReadingProgress(filePath, progress)

            logger.debug("Reading progress saved for: $filePath, page: $currentPageNumber")
        } catch (e: Exception) {
            logger.error("Failed to save reading progress", e)
        }
    }
    
    private fun getAllProgress(): Map<String, BookProgress> {
        return try {
            val service = ApplicationManager.getApplication().getService(BookManagerService::class.java)
            service?.getReadingProgress() ?: emptyMap()
        } catch (e: Exception) {
            logger.error("Failed to get all progress", e)
            emptyMap()
        }
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
        
        val cachedText = cachedTextRef?.get()
        cachedText?.let { text ->
            start = maxOf(0, minOf(start, text.length))
            end = maxOf(start, minOf(end, text.length))
        }
    }
    
    fun formatStatusBarContent(content: String, pageInfo: String): String {
        return try {
            val maxContentLength = 100
            val ellipsis = "..."
            val pageInfoSeparator = "    "
            
            if (content.length > maxContentLength) {
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
                
                truncatedContent + pageInfoSeparator + pageInfo
            } else {
                content + pageInfoSeparator + pageInfo
            }
        } catch (e: Exception) {
            logger.error("Failed to format status bar content", e)
            pageInfo
        }
    }
    
    fun readFile(): String {
        if (filePath.isBlank()) {
            return ""
        }

        // 尝试从软引用中获取缓存的文本
        var cachedText = cachedTextRef?.get()
        
        if (cachedText == null || cachedFilePath != filePath) {
            try {
                val bytes = Files.readAllBytes(Paths.get(filePath))
                val charset = detectCharset(bytes)
                val data = String(bytes, charset)

                val config = getCachedConfig()
                // 优化字符串处理
                cachedText = processTextContent(data, config)
                
                // 使用软引用缓存文本
                cachedTextRef = SoftReference(cachedText)
                cachedFilePath = filePath

                logger.info("Successfully loaded file: $filePath (${cachedText.length} chars)")
            } catch (e: OutOfMemoryError) {
                logger.error("Out of memory loading file: $filePath", e)
                // 清理缓存并重试
                cleanup()
                System.gc()
                return ""
            } catch (e: Exception) {
                logger.error("Failed to read file: $filePath", e)
                return ""
            }
        }

        return cachedText ?: ""
    }

    private fun processTextContent(data: String, config: BookConfig): String {
        return try {
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
            sb.toString()
        } catch (e: Exception) {
            logger.error("Failed to process text content", e)
            data
        }
    }
    
    private fun detectCharset(bytes: ByteArray): Charset {
        return try {
            // BOM检测
            when {
                bytes.size >= 3 && bytes[0] == 0xEF.toByte() && bytes[1] == 0xBB.toByte() && bytes[2] == 0xBF.toByte() -> {
                    StandardCharsets.UTF_8
                }
                bytes.size >= 2 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xFE.toByte() -> {
                    StandardCharsets.UTF_16LE
                }
                bytes.size >= 2 && bytes[0] == 0xFE.toByte() && bytes[1] == 0xFF.toByte() -> {
                    StandardCharsets.UTF_16BE
                }
                else -> {
                    // 尝试UTF-8解码
                    String(bytes, StandardCharsets.UTF_8)
                    StandardCharsets.UTF_8
                }
            }
        } catch (e: Exception) {
            // 降级到GBK（中文Windows默认编码）
            try {
                Charset.forName("GBK")
            } catch (e2: Exception) {
                StandardCharsets.ISO_8859_1
            }
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
        try {
            val text = readFile()
            val size = text.length
            totalPages = maxOf(1, (size + pageSize - 1) / pageSize)

            // 加载阅读进度
            loadFileProgress()

            getStartEnd()

            logger.info("Book initialized: $filePath, totalPages: $totalPages, currentPage: $currentPageNumber")
        } catch (e: Exception) {
            logger.error("Failed to initialize book", e)
            totalPages = 1
            currentPageNumber = 1
        }
    }
    
    fun getCurrentPageContent(): String {
        return try {
            val text = readFile()
            getStartEnd()

            if (text.isEmpty()) {
                ""
            } else {
                val endIndex = minOf(end, text.length)
                val content = text.substring(start, endIndex)
                val pageInfo = "${currentPageNumber}/${totalPages}"
                formatStatusBarContent(content, pageInfo)
            }
        } catch (e: Exception) {
            logger.error("Failed to get current page content", e)
            ""
        }
    }
    
    fun getJumpingPage(targetPage: Int = currentPageNumber): String {
        return try {
            if (targetPage < 1 || targetPage > totalPages) {
                return "页码超出范围 (1-$totalPages)"
            }
            
            currentPageNumber = targetPage
            getStartEnd()
            
            getCurrentPageContent()
        } catch (e: Exception) {
            logger.error("Failed to jump to page", e)
            "跳转失败: ${e.message}"
        }
    }
    
    fun getPreviousPageContent(): String {
        return try {
            getPage("previous")
            getJumpingPage()
        } catch (e: Exception) {
            logger.error("Failed to get previous page", e)
            "翻页失败: ${e.message}"
        }
    }
    
    fun getNextPageContent(): String {
        return try {
            getPage("next")
            getJumpingPage()
        } catch (e: Exception) {
            logger.error("Failed to get next page", e)
            "翻页失败: ${e.message}"
        }
    }
    
    // 章节数据类
    data class Chapter(
        val title: String,
        val position: Int,
        val page: Int
    )

    // 章节识别功能
    fun detectChapters(): List<Chapter> {
        return try {
            // 尝试从软引用缓存中获取
            var chapters = chaptersRef?.get()
            if (chapters != null) {
                return chapters
            }
            
            init()
            val text = readFile()
            chapters = mutableListOf()
            val usedPositions = mutableSetOf<Int>()

            logger.debug("开始章节检测...")

            val patterns = listOf(
                Regex("""第[一二三四五六七八九十百千万\d]+章[\s：:,.。]"""),
                Regex("""第\d+章[\s：:,.。]"""),
                Regex("""Chapter\s+[IVXLCDM\d]+[\s：:,.]""", RegexOption.IGNORE_CASE),
                Regex("""Chapter\s+[A-Za-z]+[\s：:,.]""", RegexOption.IGNORE_CASE),
                Regex("""第[一二三四五六七八九十百千万\d]+节[\s：:,.。]"""),
                Regex("""第\d+节[\s：:,.。]""")
            )

            val config = getCachedConfig()
            val lineBreak = config.lineBreak

            for (pattern in patterns) {
                pattern.findAll(text).forEach { match ->
                    val position = match.range.first
                    val chapterTitle = match.value

                    if (usedPositions.contains(position)) {
                        return@forEach
                    }

                    val prevChar = if (position > 0) text[position - 1].toString() else ""
                    if (prevChar.isNotEmpty() && Regex("""[\w\u4e00-\u9fa5]""").matches(prevChar)) {
                        return@forEach
                    }

                    usedPositions.add(position)

                    val page = (position / pageSize) + 1

                    var cleanTitle = chapterTitle.replace(Regex("""[\s：:,.。]+$"""), "")

                    var fullTitle = cleanTitle

                    val contentStart = position + chapterTitle.length
                    val contentEnd = text.indexOf(lineBreak, contentStart)

                    if (contentEnd != -1) {
                        val content = text.substring(contentStart, contentEnd).trim()
                        if (content.isNotEmpty()) {
                            val cleanContent = content.replace(Regex("""^[：:\s]+"""), "").trim()
                            if (cleanContent.isNotEmpty()) {
                                fullTitle += " $cleanContent"
                            }
                        }
                    }

                    if (fullTitle.length > 40) {
                        fullTitle = fullTitle.substring(0, 40) + "..."
                    }

                    chapters.add(Chapter(
                        title = fullTitle,
                        position = position,
                        page = page
                    ))
                }
            }

            chapters.sortBy { it.position }

            // 使用软引用缓存章节信息
            chaptersRef = SoftReference(chapters)

            logger.debug("章节检测完成，共检测到 ${chapters.size} 个章节")
            chapters
        } catch (e: Exception) {
            logger.error("Failed to detect chapters", e)
            emptyList()
        }
    }

    fun getChapters(): List<Chapter> {
        return try {
            chaptersRef?.get() ?: detectChapters()
        } catch (e: Exception) {
            logger.error("Failed to get chapters", e)
            emptyList()
        }
    }

    fun getChapterList(): List<String> {
        return try {
            getChapters().map { it.title }
        } catch (e: Exception) {
            logger.error("Failed to get chapter list", e)
            emptyList()
        }
    }

    fun jumpToChapter(chapterIndex: Int): String {
        return try {
            val chapters = getChapters()

            if (chapterIndex < 0 || chapterIndex >= chapters.size) {
                return "章节索引超出范围"
            }

            val chapter = chapters[chapterIndex]
            getJumpingPage(chapter.page)
        } catch (e: Exception) {
            logger.error("Failed to jump to chapter", e)
            "跳转失败: ${e.message}"
        }
    }

    fun jumpToPreviousChapter(): String? {
        return try {
            val chapters = getChapters()
            val currentPage = getCurrentPage()

            for (i in chapters.size - 1 downTo 0) {
                if (chapters[i].page < currentPage) {
                    return jumpToChapter(i)
                }
            }

            if (chapters.isNotEmpty()) {
                return jumpToChapter(0)
            }

            null
        } catch (e: Exception) {
            logger.error("Failed to jump to previous chapter", e)
            null
        }
    }

    fun jumpToNextChapter(): String? {
        return try {
            val chapters = getChapters()
            val currentPage = getCurrentPage()

            for (i in chapters.indices) {
                if (chapters[i].page > currentPage) {
                    return jumpToChapter(i)
                }
            }

            if (chapters.isNotEmpty()) {
                return jumpToChapter(chapters.size - 1)
            }

            null
        } catch (e: Exception) {
            logger.error("Failed to jump to next chapter", e)
            null
        }
    }

    fun getCurrentChapter(): Chapter? {
        return try {
            val chapters = getChapters()
            val currentPage = getCurrentPage()

            for (i in chapters.size - 1 downTo 0) {
                if (chapters[i].page <= currentPage) {
                    return chapters[i]
                }
            }

            null
        } catch (e: Exception) {
            logger.error("Failed to get current chapter", e)
            null
        }
    }

    fun navigateToChapter(chapterIndex: Int): String {
        return jumpToChapter(chapterIndex)
    }
    
    fun searchText(keyword: String): String? {
        return try {
            if (keyword.trim().isEmpty()) {
                return null
            }
            
            val text = readFile()
            val keywordIndex = text.indexOf(keyword)
            
            if (keywordIndex == -1) {
                return null
            }
            
            val targetPage = (keywordIndex / pageSize) + 1
            
            getJumpingPage(targetPage)
        } catch (e: Exception) {
            logger.error("Failed to search text", e)
            null
        }
    }
}