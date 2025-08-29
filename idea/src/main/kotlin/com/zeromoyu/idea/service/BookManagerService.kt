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
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

@State(
    name = "ZeroMoyuBookManager",
    storages = [Storage("zero-moyu-book-manager.xml")]
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
        var maxCachedBooks: Int = 5,
        var maxMemoryUsage: Long = 50 * 1024 * 1024 // 50MB默认内存限制
    )
    
    // LRU缓存实现
    private class LRUBookCache(private val maxSize: Int, private val maxMemory: Long) {
        private val cache = ConcurrentHashMap<String, Book>()
        private val accessOrder = ConcurrentHashMap<String, AtomicLong>()
        private val memorySizes = ConcurrentHashMap<String, Long>()
        private val accessCounter = AtomicLong(0)
        private val logger = thisLogger()
        
        fun get(filePath: String, creator: () -> Book): Book {
            // 更新访问时间
            accessOrder[filePath] = AtomicLong(accessCounter.incrementAndGet())
            
            return cache.computeIfAbsent(filePath) {
                // 检查内存和数量限制
                checkCapacity()
                
                val book = creator()
                
                // 估算内存占用
                val estimatedSize = estimateBookMemory(book)
                memorySizes[filePath] = estimatedSize
                
                logger.info("Created new Book instance for: $filePath (${estimatedSize / 1024}KB)")
                book
            }
        }
        
        private fun checkCapacity() {
            // 检查数量限制
            while (cache.size >= maxSize) {
                evictLeastRecentlyUsed()
            }
            
            // 检查内存限制
            while (getTotalMemoryUsage() > maxMemory) {
                evictLargestOrLeastUsed()
            }
        }
        
        private fun evictLeastRecentlyUsed() {
            val oldest = accessOrder.minByOrNull { it.value.get() }
            oldest?.let { (filePath, _) ->
                remove(filePath)
                logger.info("Evicted least recently used book: $filePath")
            }
        }
        
        private fun evictLargestOrLeastUsed() {
            // 优先移除内存占用最大且最久未使用的
            val candidate = cache.keys
                .map { filePath -> 
                    Triple(filePath, memorySizes[filePath] ?: 0L, accessOrder[filePath]?.get() ?: 0L)
                }
                .sortedWith(compareBy({ -it.second }, { it.third }))
                .firstOrNull()
            
            candidate?.let { (filePath, _, _) ->
                remove(filePath)
                logger.info("Evicted book for memory management: $filePath")
            }
        }
        
        fun remove(filePath: String) {
            try {
                cache.remove(filePath)?.apply {
                    cleanup()
                }
                accessOrder.remove(filePath)
                memorySizes.remove(filePath)
            } catch (e: Exception) {
                logger.error("Error removing book from cache: $filePath", e)
            }
        }
        
        fun clear() {
            cache.values.forEach { book ->
                try {
                    book.cleanup()
                } catch (e: Exception) {
                    logger.error("Error cleaning up book", e)
                }
            }
            cache.clear()
            accessOrder.clear()
            memorySizes.clear()
        }
        
        fun clearExcept(currentPath: String?) {
            cache.entries.filter { it.key != currentPath }.forEach { (path, book) ->
                try {
                    book.cleanup()
                    cache.remove(path)
                    accessOrder.remove(path)
                    memorySizes.remove(path)
                } catch (e: Exception) {
                    logger.error("Error clearing book: $path", e)
                }
            }
        }
        
        fun contains(filePath: String): Boolean = cache.containsKey(filePath)
        
        fun size(): Int = cache.size
        
        fun getTotalMemoryUsage(): Long = memorySizes.values.sum()
        
        fun getMemoryInfo(): String {
            return buildString {
                appendLine("📊 Cache Memory Info:")
                appendLine("  Total cached books: ${cache.size}/$maxSize")
                appendLine("  Total memory usage: ${formatFileSize(getTotalMemoryUsage())}/${formatFileSize(maxMemory)}")
                
                memorySizes.entries.sortedByDescending { it.value }.take(5).forEach { (path, size) ->
                    val fileName = File(path).name
                    appendLine("  - $fileName: ${formatFileSize(size)}")
                }
            }
        }
        
        private fun estimateBookMemory(book: Book): Long {
            return try {
                val text = book.readFile()
                // 估算：字符串内容 + 章节缓存 + 其他数据结构
                (text.length * 2L) + 10240 // 2 bytes per char + overhead
            } catch (e: Exception) {
                logger.error("Error estimating book memory", e)
                1024L // 默认1KB
            }
        }
        
        private fun formatFileSize(bytes: Long): String {
            return when {
                bytes < 1024 -> "$bytes B"
                bytes < 1024 * 1024 -> "${bytes / 1024} KB"
                bytes < 1024 * 1024 * 1024 -> "${bytes / (1024 * 1024)} MB"
                else -> "${bytes / (1024 * 1024 * 1024)} GB"
            }
        }
    }
    
    private var state = BookManagerState()
    private var currentBook: Book? = null
    private val logger = thisLogger()
    
    // 使用新的LRU缓存
    private lateinit var bookCache: LRUBookCache
    
    // 缓存上次的状态栏内容，避免重复更新
    private var lastStatusBarContent: String = ""
    
    init {
        initializeCache()
        logger.info("BookManagerService initialized with LRU cache")
    }
    
    private fun initializeCache() {
        bookCache = LRUBookCache(state.maxCachedBooks, state.maxMemoryUsage)
    }
    
    override fun getState(): BookManagerState {
        return state
    }
    
    override fun loadState(state: BookManagerState) {
        this.state = state
        initializeCache()
        logger.info("BookManagerService state loaded")
    }
    
    fun openBook(filePath: String): Boolean {
        return try {
            val file = File(filePath)
            if (!file.exists() || !file.name.endsWith(".txt", ignoreCase = true)) {
                logger.warn("Invalid file: $filePath")
                return false
            }
    
            // 保存当前书籍的进度
            saveCurrentBookProgress()
    
            // 先获取配置值
            val pageSize = state.pageSize
            val lineBreak = state.lineBreak
    
            // 从LRU缓存获取Book实例
            currentBook = bookCache.get(filePath) {
                Book().apply {
                    setBookFilePath(filePath)
                    setConfig(pageSize, lineBreak)  // 使用局部变量
                    init()
                }
            }
    
            // 更新状态
            state.currentBookPath = filePath
            addToRecentFiles(filePath)
    
            // 异步通知状态栏更新
            notifyStatusBarUpdateAsync()
    
            logger.info("Book opened: $filePath")
            true
        } catch (e: Exception) {
            logger.error("Failed to open book: $filePath", e)
            false
        }
    }
    
    private fun saveCurrentBookProgress() {
        try {
            currentBook?.saveReadingProgress()
        } catch (e: Exception) {
            logger.error("Failed to save reading progress", e)
        }
    }
    
    private fun notifyStatusBarUpdateAsync() {
        ApplicationManager.getApplication().invokeLater {
            try {
                val content = getCurrentBookContent()
                
                // 只有内容变化时才更新UI
                if (content != lastStatusBarContent) {
                    ProjectManager.getInstance().openProjects.forEach { project ->
                        try {
                            WindowManager.getInstance().getStatusBar(project)?.setInfo(content)
                        } catch (e: Exception) {
                            logger.error("Failed to update status bar for project", e)
                        }
                    }
                    lastStatusBarContent = content
                    logger.debug("Status bar updated: ${content.take(50)}...")
                }
            } catch (e: Exception) {
                logger.error("Failed to update status bar", e)
            }
        }
    }
    
    fun getCurrentBook(): Book? {
        return currentBook
    }
    
    fun getCurrentBookContent(): String {
        return try {
            currentBook?.getCurrentPageContent() ?: ""
        } catch (e: Exception) {
            logger.error("Failed to get current book content", e)
            ""
        }
    }
    
    fun nextPage(): String {
        return try {
            val result = currentBook?.getNextPageContent() ?: "请先打开一本书"
            if (currentBook != null) {
                saveCurrentBookProgress()
                notifyStatusBarUpdateAsync()
            }
            result
        } catch (e: Exception) {
            logger.error("Failed to navigate to next page", e)
            "翻页失败: ${e.message}"
        }
    }

    fun previousPage(): String {
        return try {
            val result = currentBook?.getPreviousPageContent() ?: "请先打开一本书"
            if (currentBook != null) {
                saveCurrentBookProgress()
                notifyStatusBarUpdateAsync()
            }
            result
        } catch (e: Exception) {
            logger.error("Failed to navigate to previous page", e)
            "翻页失败: ${e.message}"
        }
    }

    fun jumpToPage(pageNumber: Int): String {
        return try {
            val result = currentBook?.getJumpingPage(pageNumber) ?: "请先打开一本书"
            if (currentBook != null) {
                saveCurrentBookProgress()
                notifyStatusBarUpdateAsync()
            }
            result
        } catch (e: Exception) {
            logger.error("Failed to jump to page", e)
            "跳转失败: ${e.message}"
        }
    }
    
    fun nextChapter(): String {
        val book = currentBook ?: return "请先打开一本书"

        return try {
            val result = book.jumpToNextChapter()
            if (result != null) {
                saveCurrentBookProgress()
                notifyStatusBarUpdateAsync()
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
                saveCurrentBookProgress()
                notifyStatusBarUpdateAsync()
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
        return try {
            currentBook?.getChapterList() ?: emptyList()
        } catch (e: Exception) {
            logger.error("Failed to get chapter list", e)
            emptyList()
        }
    }

    fun getDetailedChapterList(): List<Book.Chapter> {
        return try {
            currentBook?.getChapters() ?: emptyList()
        } catch (e: Exception) {
            logger.error("Failed to get detailed chapter list", e)
            emptyList()
        }
    }
    
    fun hideContent() {
        ApplicationManager.getApplication().invokeLater {
            try {
                ProjectManager.getInstance().openProjects.forEach { project ->
                    try {
                        WindowManager.getInstance().getStatusBar(project)?.setInfo("")
                    } catch (e: Exception) {
                        logger.error("Failed to clear status bar for project", e)
                    }
                }
                lastStatusBarContent = ""
                logger.info("Status bar content cleared successfully")
            } catch (e: Exception) {
                logger.error("Failed to clear status bar", e)
            }
        }
    }
    
    fun addToRecentFiles(filePath: String) {
        try {
            val recentList = state.recentFiles.toMutableList()
            recentList.remove(filePath)
            recentList.add(0, filePath)
            
            while (recentList.size > state.maxRecentFiles) {
                recentList.removeAt(recentList.size - 1)
            }
            
            state.recentFiles = recentList
        } catch (e: Exception) {
            logger.error("Failed to add to recent files", e)
        }
    }
    
    fun getRecentFiles(): List<String> {
        return state.recentFiles
    }

    fun clearRecentFiles() {
        try {
            state.recentFiles = emptyList()
            logger.info("Cleared all recent files")
        } catch (e: Exception) {
            logger.error("Failed to clear recent files", e)
        }
    }
    
    fun addToFileLibrary(filePath: String): Boolean {
        return try {
            val normalizedPath = File(filePath).absolutePath
            val library = state.fileLibrary.toMutableList()

            val exists = library.any { existingPath ->
                File(existingPath).absolutePath == normalizedPath
            }

            if (!exists) {
                library.add(normalizedPath)
                state.fileLibrary = library
                logger.info("Added to library: $normalizedPath")
                true
            } else {
                logger.info("File already exists in library: $normalizedPath")
                false
            }
        } catch (e: Exception) {
            logger.error("Failed to add to file library", e)
            false
        }
    }
    
    fun removeFromFileLibrary(filePath: String) {
        try {
            val library = state.fileLibrary.toMutableList()
            library.remove(filePath)
            state.fileLibrary = library
            logger.info("Removed from library: $filePath")
        } catch (e: Exception) {
            logger.error("Failed to remove from file library", e)
        }
    }
    
    fun getFileLibrary(): List<String> {
        return state.fileLibrary
    }
    
    fun setPageSize(pageSize: Int) {
        try {
            state.pageSize = pageSize
            currentBook?.setConfig(pageSize, state.lineBreak)
            logger.info("Page size updated: $pageSize")
        } catch (e: Exception) {
            logger.error("Failed to set page size", e)
        }
    }
    
    fun setLineBreak(lineBreak: String) {
        try {
            state.lineBreak = lineBreak
            currentBook?.setConfig(state.pageSize, lineBreak)
            logger.info("Line break updated: $lineBreak")
        } catch (e: Exception) {
            logger.error("Failed to set line break", e)
        }
    }
    
    fun getPageSize(): Int = state.pageSize
    fun getLineBreak(): String = state.lineBreak
    fun getMaxRecentFiles(): Int = state.maxRecentFiles
    
    fun setMaxRecentFiles(max: Int) {
        try {
            state.maxRecentFiles = max
            val recentList = state.recentFiles.toMutableList()
            while (recentList.size > max) {
                recentList.removeAt(recentList.size - 1)
            }
            state.recentFiles = recentList
        } catch (e: Exception) {
            logger.error("Failed to set max recent files", e)
        }
    }
    
    fun saveReadingProgress(progress: Map<String, Book.BookProgress>) {
        try {
            state.readingProgress = progress
            logger.info("Reading progress saved for ${progress.size} books")
        } catch (e: Exception) {
            logger.error("Failed to save reading progress", e)
        }
    }

    fun saveReadingProgress(filePath: String, progress: Book.BookProgress) {
        try {
            val currentProgress = state.readingProgress.toMutableMap()
            currentProgress[filePath] = progress
            state.readingProgress = currentProgress
            logger.info("Reading progress saved for: $filePath, page: ${progress.pageNumber}")
        } catch (e: Exception) {
            logger.error("Failed to save reading progress for file", e)
        }
    }

    fun getReadingProgress(): Map<String, Book.BookProgress> {
        return state.readingProgress
    }
    
    fun openLastReadBook(): Boolean {
        return try {
            val recentFiles = state.recentFiles
            if (recentFiles.isEmpty()) {
                return false
            }
            
            for (filePath in recentFiles) {
                val file = File(filePath)
                if (file.exists() && file.name.endsWith(".txt", ignoreCase = true)) {
                    return openBook(filePath)
                } else {
                    removeFromRecentFiles(filePath)
                }
            }
            
            false
        } catch (e: Exception) {
            logger.error("Failed to open last read book", e)
            false
        }
    }
    
    fun refreshCurrentBookConfig(): Boolean {
        return try {
            currentBook?.let { book ->
                book.setConfig(state.pageSize, state.lineBreak)
                true
            } ?: false
        } catch (e: Exception) {
            logger.error("Failed to refresh current book config", e)
            false
        }
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

    fun removeBookFromLibrary(filePath: String): Boolean {
        return try {
            val normalizedPath = File(filePath).absolutePath

            logger.info("Removing book from library: $filePath (normalized: $normalizedPath)")

            // 从文件库中移除
            val updatedLibrary = state.fileLibrary.filter { existingPath ->
                val existingNormalized = File(existingPath).absolutePath
                existingNormalized != normalizedPath && existingPath != filePath
            }
            state.fileLibrary = updatedLibrary

            // 从LRU缓存中移除
            listOf(filePath, normalizedPath).forEach { pathToCheck ->
                if (bookCache.contains(pathToCheck)) {
                    bookCache.remove(pathToCheck)
                    logger.info("Removed from LRU cache: $pathToCheck")
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

    fun clearAllCache() {
        try {
            val currentFilePath = state.currentBookPath
            bookCache.clearExcept(currentFilePath)
            logger.info("Cleared all cache except current file")
        } catch (e: Exception) {
            logger.error("Failed to clear all cache", e)
        }
    }

    private fun removeFromRecentFiles(filePath: String) {
        try {
            val normalizedPath = File(filePath).absolutePath
            state.recentFiles = state.recentFiles.filter { existingPath ->
                val existingNormalized = File(existingPath).absolutePath
                existingNormalized != normalizedPath && existingPath != filePath
            }
        } catch (e: Exception) {
            logger.error("Failed to remove from recent files", e)
        }
    }

    fun getReadingProgress(filePath: String): Book.BookProgress? {
        return state.readingProgress[filePath]
    }

    fun ensureBookAvailable(project: com.intellij.openapi.project.Project): Boolean {
        return try {
            // 检查当前是否有打开的书
            if (currentBook != null) {
                val currentPath = currentBook!!.filePath
                if (File(currentPath).exists()) {
                    return true
                }
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
            false
        } catch (e: Exception) {
            logger.error("Failed to ensure book available", e)
            false
        }
    }
    
    fun getBookProgress(filePath: String): Book.BookProgress {
        return state.readingProgress[filePath] ?: Book.BookProgress(1, 0, 1)
    }
    
    fun updateStatusBar(project: com.intellij.openapi.project.Project, content: String) {
        ApplicationManager.getApplication().invokeLater {
            try {
                WindowManager.getInstance().getStatusBar(project)?.setInfo(content)
                lastStatusBarContent = content
            } catch (e: Exception) {
                logger.error("Failed to update status bar", e)
            }
        }
    }

    // 内存监控和优化
    fun logMemoryUsage() {
        try {
            logger.info(bookCache.getMemoryInfo())
            
            // JVM内存信息
            val runtime = Runtime.getRuntime()
            val totalMemory = runtime.totalMemory() / 1024 / 1024
            val freeMemory = runtime.freeMemory() / 1024 / 1024
            val usedMemory = totalMemory - freeMemory
            val maxMemory = runtime.maxMemory() / 1024 / 1024
            
            logger.info("📊 JVM Memory Info:")
            logger.info("  Used: ${usedMemory}MB, Free: ${freeMemory}MB, Max: ${maxMemory}MB")
        } catch (e: Exception) {
            logger.error("Failed to log memory usage", e)
        }
    }

    // 清理缓存
    fun clearCache() {
        try {
            bookCache.clear()
            logger.info("🧹 Cache cleared")
            logMemoryUsage()
        } catch (e: Exception) {
            logger.error("Failed to clear cache", e)
        }
    }

    // 强制垃圾回收
    fun forceGarbageCollection() {
        try {
            System.gc()
            // 移除了 System.runFinalization()
            Thread.sleep(100) // 给GC一点时间
            System.gc()
            logger.info("🗑️ Forced garbage collection")
            logMemoryUsage()
        } catch (e: Exception) {
            logger.error("Failed to force garbage collection", e)
        }
    }

    companion object {
        fun getInstance(): BookManagerService {
            return ApplicationManager.getApplication().getService(BookManagerService::class.java)
        }
    }
}