package com.zeromoyu.idea.service

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.wm.WindowManager
import com.zeromoyu.idea.model.Book
import java.io.File

@State(
    name = "ThiefBookManager",
    storages = [Storage("thief-book-manager.xml")]
)
class BookManagerService : PersistentStateComponent<BookManagerService.BookManagerState> {
    
    data class BookManagerState(
        var currentBookPath: String = "",
        var recentFiles: List<String> = emptyList(),
        var fileLibrary: List<String> = emptyList(),
        var readingProgress: Map<String, Book.BookProgress> = emptyMap(),
        var pageSize: Int = 50,
        var lineBreak: String = " ",
        var maxRecentFiles: Int = 10,
        var maxCachedBooks: Int = 5
    )
    
    private var state = BookManagerState()
    private var currentBook: Book? = null
    private val logger = thisLogger()

    // 缓存管理
    private val bookCache = mutableMapOf<String, Book>()
    private val accessTimes = mutableMapOf<String, Long>()
    
    init {
        logger.info("BookManagerService initialized")
    }
    
    override fun getState(): BookManagerState {
        return state
    }
    
    override fun loadState(state: BookManagerState) {
        this.state = state
        logger.info("BookManagerService state loaded")
    }
    
    fun openBook(filePath: String): Boolean {
        try {
            val file = File(filePath)
            if (!file.exists() || !file.name.endsWith(".txt", ignoreCase = true)) {
                logger.warn("Invalid file: $filePath")
                return false
            }

            // 保存当前书籍的进度
            currentBook?.saveReadingProgress()

            // 检查缓存中是否已有该书籍
            currentBook = getBookFromCache(filePath)

            // 更新状态
            state.currentBookPath = filePath
            addToRecentFiles(filePath)

            // 通知状态栏更新
            notifyStatusBarUpdate()

            logger.info("Book opened: $filePath")
            return true
        } catch (e: Exception) {
            logger.error("Failed to open book: $filePath", e)
            return false
        }
    }

    private fun getBookFromCache(filePath: String): Book {
        updateAccessTime(filePath)

        if (!bookCache.containsKey(filePath)) {
            // 如果缓存已满，清理最少使用的Book实例
            cleanupLeastUsedBooks()

            val bookInstance = Book().apply {
                setBookFilePath(filePath)
                setConfig(this@BookManagerService.state.pageSize, this@BookManagerService.state.lineBreak)
                init()
            }

            bookCache[filePath] = bookInstance
            logger.info("Created new Book instance for: $filePath")
            logger.info("Current cache size: ${bookCache.size}/${state.maxCachedBooks}")
        }

        return bookCache[filePath]!!
    }

    private fun updateAccessTime(filePath: String) {
        accessTimes[filePath] = System.currentTimeMillis()
    }

    private fun cleanupLeastUsedBooks() {
        if (bookCache.size <= state.maxCachedBooks) {
            return
        }

        // 获取所有Book实例，按访问时间排序
        val bookEntries = bookCache.entries.map { (filePath, book) ->
            Triple(filePath, book, accessTimes[filePath] ?: 0L)
        }

        // 按访问时间升序排序（最久未使用的在前）
        val sortedEntries = bookEntries.sortedBy { it.third }

        // 计算需要清理的数量
        val cleanupCount = bookCache.size - state.maxCachedBooks
        val booksToCleanup = sortedEntries.take(cleanupCount)

        // 清理最久未使用的Book实例
        booksToCleanup.forEach { (filePath, book, _) ->
            cleanupBookInstance(filePath, book)
        }

        logger.info("Cleaned up $cleanupCount least used Book instances")
        logger.info("Cache size after cleanup: ${bookCache.size}/${state.maxCachedBooks}")
    }

    private fun cleanupBookInstance(filePath: String, book: Book) {
        // 清理Book实例的内存
        book.cleanup()

        // 从缓存中删除
        bookCache.remove(filePath)
        accessTimes.remove(filePath)

        logger.info("Cleaned up Book instance for: $filePath")
    }
    
    fun getCurrentBook(): Book? {
        return currentBook
    }
    
    fun getCurrentBookContent(): String {
        return currentBook?.getCurrentPageContent() ?: ""
    }
    
    fun nextPage(): String {
        val result = currentBook?.getNextPageContent() ?: "请先打开一本书"
        if (currentBook != null) {
            currentBook!!.saveReadingProgress()
            notifyStatusBarUpdate()
        }
        return result
    }

    fun previousPage(): String {
        val result = currentBook?.getPreviousPageContent() ?: "请先打开一本书"
        if (currentBook != null) {
            currentBook!!.saveReadingProgress()
            notifyStatusBarUpdate()
        }
        return result
    }

    fun jumpToPage(pageNumber: Int): String {
        val result = currentBook?.getJumpingPage(pageNumber) ?: "请先打开一本书"
        if (currentBook != null) {
            currentBook!!.saveReadingProgress()
            notifyStatusBarUpdate()
        }
        return result
    }
    
    fun nextChapter(): String {
        val book = currentBook ?: return "请先打开一本书"

        return try {
            val result = book.jumpToNextChapter()
            if (result != null) {
                // 保存阅读进度
                book.saveReadingProgress()
                // 通知状态栏更新
                notifyStatusBarUpdate()
                result
            } else {
                val chapters = book.getChapters()
                if (chapters.isEmpty()) {
                    "当前书籍没有检测到章节"
                } else {
                    "已经是最后一章"
                }
            }
        } catch (ex: Exception) {
            logger.error("Next chapter navigation failed", ex)
            "章节导航失败: ${ex.message}"
        }
    }

    fun previousChapter(): String {
        val book = currentBook ?: return "请先打开一本书"

        return try {
            val result = book.jumpToPreviousChapter()
            if (result != null) {
                // 保存阅读进度
                book.saveReadingProgress()
                // 通知状态栏更新
                notifyStatusBarUpdate()
                result
            } else {
                val chapters = book.getChapters()
                if (chapters.isEmpty()) {
                    "当前书籍没有检测到章节"
                } else {
                    "已经是第一章"
                }
            }
        } catch (ex: Exception) {
            logger.error("Previous chapter navigation failed", ex)
            "章节导航失败: ${ex.message}"
        }
    }
    
    fun getChapterList(): List<String> {
        return currentBook?.getChapterList() ?: emptyList()
    }

    fun getDetailedChapterList(): List<Book.Chapter> {
        return currentBook?.getChapters() ?: emptyList()
    }
    
    fun hideContent() {
        // 学习VSCode插件的简单方式：直接清除状态栏信息
        ApplicationManager.getApplication().invokeLater {
            try {
                ProjectManager.getInstance().openProjects.forEach { project ->
                    // 只使用原生状态栏信息，简单可靠
                    WindowManager.getInstance().getStatusBar(project)?.setInfo("")
                }
                logger.info("Status bar content cleared successfully")
            } catch (e: Exception) {
                logger.error("Failed to clear status bar", e)
            }
        }
    }
    
    fun addToRecentFiles(filePath: String) {
        val recentList = state.recentFiles.toMutableList()
        recentList.remove(filePath)
        recentList.add(0, filePath)
        
        // 限制最近文件数量
        while (recentList.size > state.maxRecentFiles) {
            recentList.removeAt(recentList.size - 1)
        }
        
        state.recentFiles = recentList
    }
    
    fun getRecentFiles(): List<String> {
        return state.recentFiles
    }

    /**
     * 清除所有最近阅读记录
     */
    fun clearRecentFiles() {
        state.recentFiles = emptyList()
        logger.info("Cleared all recent files")
    }
    
    fun addToFileLibrary(filePath: String): Boolean {
        // 标准化文件路径，避免路径格式不同导致的重复
        val normalizedPath = File(filePath).absolutePath
        val library = state.fileLibrary.toMutableList()

        // 检查是否已存在（使用标准化路径比较）
        val exists = library.any { existingPath ->
            File(existingPath).absolutePath == normalizedPath
        }

        return if (!exists) {
            library.add(normalizedPath)
            state.fileLibrary = library
            logger.info("Added to library: $normalizedPath")
            true
        } else {
            logger.info("File already exists in library: $normalizedPath")
            false
        }
    }
    
    fun removeFromFileLibrary(filePath: String) {
        val library = state.fileLibrary.toMutableList()
        library.remove(filePath)
        state.fileLibrary = library
        logger.info("Removed from library: $filePath")
    }
    
    fun getFileLibrary(): List<String> {
        return state.fileLibrary
    }
    
    fun setPageSize(pageSize: Int) {
        state.pageSize = pageSize
        currentBook?.setConfig(pageSize, state.lineBreak)
        logger.info("Page size updated: $pageSize")
    }
    
    fun setLineBreak(lineBreak: String) {
        state.lineBreak = lineBreak
        currentBook?.setConfig(state.pageSize, lineBreak)
        logger.info("Line break updated: $lineBreak")
    }
    
    fun getPageSize(): Int = state.pageSize
    fun getLineBreak(): String = state.lineBreak
    fun getMaxRecentFiles(): Int = state.maxRecentFiles
    
    fun setMaxRecentFiles(max: Int) {
        state.maxRecentFiles = max
        // 立即清理超出限制的最近文件
        val recentList = state.recentFiles.toMutableList()
        while (recentList.size > max) {
            recentList.removeAt(recentList.size - 1)
        }
        state.recentFiles = recentList
    }
    
    fun saveReadingProgress(progress: Map<String, Book.BookProgress>) {
        state.readingProgress = progress
        logger.info("Reading progress saved for ${progress.size} books")
    }

    fun saveReadingProgress(filePath: String, progress: Book.BookProgress) {
        val currentProgress = state.readingProgress.toMutableMap()
        currentProgress[filePath] = progress
        state.readingProgress = currentProgress
        logger.info("Reading progress saved for: $filePath, page: ${progress.pageNumber}")
    }

    fun getReadingProgress(): Map<String, Book.BookProgress> {
        return state.readingProgress
    }
    
    fun openLastReadBook(): Boolean {
        val recentFiles = state.recentFiles
        if (recentFiles.isEmpty()) {
            return false
        }
        
        // 尝试找到第一个存在的文件
        for (filePath in recentFiles) {
            val file = File(filePath)
            if (file.exists() && file.name.endsWith(".txt", ignoreCase = true)) {
                return openBook(filePath)
            } else {
                // 文件不存在或不是txt文件，从最近阅读列表中移除
                removeFromRecentFiles(filePath)
            }
        }
        
        // 所有最近的文件都不存在
        return false
    }
    
    fun refreshCurrentBookConfig(): Boolean {
        return currentBook?.let { book ->
            book.setConfig(state.pageSize, state.lineBreak)
            true
        } ?: false
    }
    
    fun getBookInfo(filePath: String): BookInfo? {
        return try {
            val file = File(filePath)
            if (file.exists()) {
                BookInfo(
                    name = file.nameWithoutExtension,
                    path = filePath,
                    size = file.length(),
                    lastModified = file.lastModified()
                )
            } else {
                null
            }
        } catch (e: Exception) {
            logger.error("Failed to get book info: $filePath", e)
            null
        }
    }
    
    data class BookInfo(
        val name: String,
        val path: String,
        val size: Long,
        val lastModified: Long
    )

    // 从文件库中删除图书 - 增强版本，修复缓存清理问题
    fun removeBookFromLibrary(filePath: String): Boolean {
        return try {
            // 标准化路径，确保路径匹配
            val normalizedPath = File(filePath).absolutePath

            logger.info("Removing book from library: $filePath (normalized: $normalizedPath)")

            // 从文件库中移除（同时检查原路径和标准化路径）
            val updatedLibrary = state.fileLibrary.filter { existingPath ->
                val existingNormalized = File(existingPath).absolutePath
                existingNormalized != normalizedPath && existingPath != filePath
            }
            state.fileLibrary = updatedLibrary

            // 从缓存中移除对应的Book实例（检查所有可能的路径格式）
            val pathsToCheck = listOf(filePath, normalizedPath)
            pathsToCheck.forEach { pathToCheck ->
                val book = bookCache[pathToCheck]
                if (book != null) {
                    cleanupBookInstance(pathToCheck, book)
                    logger.info("Cleaned up cached book instance for: $pathToCheck")
                }
            }

            // 从最近阅读列表中移除
            removeFromRecentFiles(filePath)
            removeFromRecentFiles(normalizedPath)

            // 从阅读进度中移除
            val updatedProgress = state.readingProgress.toMutableMap()
            updatedProgress.remove(filePath)
            updatedProgress.remove(normalizedPath)
            state.readingProgress = updatedProgress

            // 如果移除的是当前正在阅读的文件，清空当前状态
            val currentNormalized = if (state.currentBookPath.isNotEmpty()) {
                File(state.currentBookPath).absolutePath
            } else ""

            if (state.currentBookPath == filePath ||
                state.currentBookPath == normalizedPath ||
                currentNormalized == normalizedPath) {

                state.currentBookPath = ""
                currentBook = null

                // 清空状态栏显示
                hideContent()

                logger.info("Current book was removed, cleared current state and status bar")
            }

            logger.info("Successfully removed book from library: $filePath")
            true
        } catch (e: Exception) {
            logger.error("Failed to remove book from library: $filePath", e)
            false
        }
    }

    // 清理所有缓存（除当前文件外）
    fun clearAllCache() {
        val currentFilePath = state.currentBookPath
        val booksToRemove = bookCache.keys.filter { it != currentFilePath }

        booksToRemove.forEach { filePath ->
            val book = bookCache[filePath]
            if (book != null) {
                cleanupBookInstance(filePath, book)
            }
        }

        logger.info("Cleared all cache except current file")
    }

    private fun removeFromRecentFiles(filePath: String) {
        val normalizedPath = File(filePath).absolutePath
        state.recentFiles = state.recentFiles.filter { existingPath ->
            val existingNormalized = File(existingPath).absolutePath
            existingNormalized != normalizedPath && existingPath != filePath
        }
    }

    fun getReadingProgress(filePath: String): Book.BookProgress? {
        return state.readingProgress[filePath]
    }

    /**
     * 确保有可用的图书
     * @return true 如果有可用图书，false 如果需要用户选择
     */
    fun ensureBookAvailable(project: com.intellij.openapi.project.Project): Boolean {
        // 检查当前是否有打开的书
        if (currentBook != null) {
            // 验证当前书是否仍然存在
            val currentPath = currentBook!!.filePath
            if (File(currentPath).exists()) {
                return true
            }
            // 当前书已被删除
            currentBook = null
            state.currentBookPath = ""
        }
        
        // 检查图书库
        val library = getFileLibrary()
        if (library.isEmpty()) {
            com.zeromoyu.idea.utils.NotificationUtils.showWarning(project, "图书库为空，请先添加图书")
            return false
        }
        
        // 尝试打开上次阅读的书
        if (openLastReadBook()) {
            return true
        }
        
        // 提示用户选择图书
        com.zeromoyu.idea.utils.NotificationUtils.showInfo(project, "请选择一本图书开始阅读")
        return false
    }
    
    /**
     * 获取图书进度
     */
    fun getBookProgress(filePath: String): Book.BookProgress {
        return state.readingProgress[filePath] ?: Book.BookProgress(1, 0, 1)
    }
    
    /**
     * 更新状态栏
     */
    fun updateStatusBar(project: com.intellij.openapi.project.Project, content: String) {
        ApplicationManager.getApplication().invokeLater {
            WindowManager.getInstance().getStatusBar(project)?.setInfo(content)
        }
    }

    // 缓存上次的状态栏内容，避免重复更新
    private var lastStatusBarContent: String = ""

    private fun notifyStatusBarUpdate() {
        ApplicationManager.getApplication().invokeLater {
            try {
                // 统一使用原生状态栏信息，简单可靠
                val content = getCurrentBookContent()

                // 性能优化：只有内容变化时才更新UI
                if (content != lastStatusBarContent) {
                    ProjectManager.getInstance().openProjects.forEach { project ->
                        WindowManager.getInstance().getStatusBar(project)?.setInfo(content)
                    }
                    lastStatusBarContent = content
                    logger.info("Status bar content updated: ${content.take(50)}...")
                } else {
                    logger.debug("Status bar content unchanged, skipping update")
                }
            } catch (e: Exception) {
                logger.error("Failed to update status bar", e)
            }
        }
    }

    // 内存监控和优化
    fun logMemoryUsage() {
        val totalBooks = bookCache.size
        var totalMemory = 0L

        // 估算内存使用量
        bookCache.values.forEach { book ->
            // 估算每个Book实例的内存占用
            val textLength = book.readFile().length
            totalMemory += textLength * 2L // 假设每个字符2字节
        }

        logger.info("📊 Memory usage:")
        logger.info("  - Cached Book instances: $totalBooks/${state.maxCachedBooks}")
        logger.info("  - Estimated text cache: ${formatFileSize(totalMemory)}")
        logger.info("  - Current file: ${state.currentBookPath.ifEmpty { "None" }}")
    }

    private fun formatFileSize(bytes: Long): String {
        return when {
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> "${bytes / 1024} KB"
            bytes < 1024 * 1024 * 1024 -> "${bytes / (1024 * 1024)} MB"
            else -> "${bytes / (1024 * 1024 * 1024)} GB"
        }
    }

    // 清理缓存
    fun clearCache() {
        bookCache.clear()
        accessTimes.clear()
        logger.info("🧹 Cache cleared - bookCache: ${bookCache.size}, accessTimes: ${accessTimes.size}")
        logMemoryUsage()
    }

    // 强制垃圾回收（仅用于调试）
    fun forceGarbageCollection() {
        System.gc()
        logger.info("🗑️ Forced garbage collection")
        logMemoryUsage()
    }

    companion object {
        fun getInstance(): BookManagerService {
            return ApplicationManager.getApplication().getService(BookManagerService::class.java)
        }
    }
}
