// enhanced-queue.js - Enterprise-grade download queue with segmented downloads and persistence
// Based on download manager research patterns for professional image collection

export class EnhancedDownloadQueue {
  constructor(options = {}) {
    this.options = {
      concurrency: options.concurrency || 5,
      hostLimit: options.hostLimit || 3,
      retryLimit: options.retryLimit || 3,
      segmentSize: options.segmentSize || 1024 * 1024, // 1MB segments
      enableSegmentation: options.enableSegmentation !== false,
      persistState: options.persistState !== false,
      ...options
    };
        
    this.queue = [];
    this.active = new Map();
    this.completed = [];
    this.failed = [];
    this.paused = false;
    this.stopped = false;
        
    this.stats = {
      totalItems: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      startTime: null,
      endTime: null
    };
        
    this.hostQueues = new Map(); // Per-host concurrency tracking
    this.retryManager = new RetryManager(this.options.retryLimit);
    this.segmentManager = new SegmentManager(this.options.segmentSize);
    this.stateManager = new QueueStateManager();
        
    this.onProgress = () => {};
    this.onComplete = () => {};
    this.onError = () => {};
        
    if (this.options.persistState) {
      this.loadPersistedState();
    }
  }
    
  async add(item) {
    if (this.stopped) {return false;}
        
    // Validate and normalize item
    item = this.normalizeItem(item);
    if (!item) {return false;}
        
    // Check for duplicates
    if (this.isDuplicate(item)) {
      this.stats.skipped = (this.stats.skipped || 0) + 1;
      this.onProgress({
        type: 'duplicate_skipped',
        item,
        stats: this.getStats()
      });
      return false;
    }
        
    // Prepare item for download
    item.id = item.id || this.generateId();
    item.addedAt = Date.now();
    item.retries = 0;
    item.status = 'queued';
        
    // Check if file supports segmentation
    if (this.options.enableSegmentation) {
      const supportsRanges = await this.checkRangeSupport(item.url);
      item.supportsSegmentation = supportsRanges;
    }
        
    this.queue.push(item);
    this.stats.totalItems++;
        
    if (!this.stats.startTime) {
      this.stats.startTime = Date.now();
    }
        
    this.onProgress({
      type: 'item_added',
      item,
      queueSize: this.queue.length,
      stats: this.getStats()
    });
        
    if (this.options.persistState) {
      await this.persistState();
    }
        
    this.processNext();
    return true;
  }
    
  normalizeItem(item) {
    if (!item || !item.url) {return null;}
        
    return {
      url: item.url,
      filename: item.filename || this.extractFilename(item.url),
      folder: item.folder || '',
      headers: item.headers || {},
      metadata: item.metadata || {},
      ...item
    };
  }
    
  isDuplicate(item) {
    // Check URL duplicates
    const exists = this.queue.find(q => q.url === item.url) ||
                      this.active.has(item.url) ||
                      this.completed.find(c => c.url === item.url);
    return !!exists;
  }
    
  async checkRangeSupport(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.headers.get('accept-ranges') === 'bytes';
    } catch (_error) {
      return false;
    }
  }
    
  processNext() {
    if (this.paused || this.stopped) {return;}
    if (this.active.size >= this.options.concurrency) {return;}
        
    // Find next eligible item (considering host limits)
    const item = this.findNextEligibleItem();
    if (!item) {return;}
        
    // Remove from queue
    const index = this.queue.indexOf(item);
    this.queue.splice(index, 1);
        
    // Start download
    this.startDownload(item);
  }
    
  findNextEligibleItem() {
    for (const item of this.queue) {
      const host = new URL(item.url).hostname;
      const hostCount = Array.from(this.active.values())
        .filter(activeItem => new URL(activeItem.url).hostname === host).length;
            
      if (hostCount < this.options.hostLimit) {
        return item;
      }
    }
    return null;
  }
    
  async startDownload(item) {
    item.status = 'downloading';
    item.startedAt = Date.now();
    this.active.set(item.id, item);
        
    try {
      if (item.supportsSegmentation && this.shouldUseSegmentation(item)) {
        await this.startSegmentedDownload(item);
      } else {
        await this.startSingleDownload(item);
      }
    } catch (error) {
      this.handleDownloadError(item, error);
    }
  }
    
  shouldUseSegmentation(item) {
    // Use segmentation for files larger than 5MB
    return item.contentLength && item.contentLength > 5 * 1024 * 1024;
  }
    
  async startSegmentedDownload(item) {
    try {
      const segments = await this.segmentManager.createSegments(item);
      item.segments = segments;
      item.downloadedSegments = 0;
      item.totalSegments = segments.length;
            
      // Download segments concurrently
      const segmentPromises = segments.map((segment, index) => 
        this.downloadSegment(item, segment, index)
      );
            
      await Promise.all(segmentPromises);
      await this.assembleSegments(item);
      this.completeDownload(item);
            
    } catch (error) {
      this.handleDownloadError(item, error);
    }
  }
    
  async downloadSegment(item, segment, index) {
    const response = await fetch(item.url, {
      headers: {
        ...item.headers,
        'Range': `bytes=${segment.start}-${segment.end}`
      }
    });
        
    if (!response.ok) {
      throw new Error(`Segment ${index} failed: ${response.status}`);
    }
        
    const arrayBuffer = await response.arrayBuffer();
    segment.data = arrayBuffer;
    item.downloadedSegments++;
        
    this.onProgress({
      type: 'segment_completed',
      item,
      segment: index,
      progress: item.downloadedSegments / item.totalSegments,
      stats: this.getStats()
    });
  }
    
  async assembleSegments(item) {
    // Combine all segments into final file
    const totalSize = item.segments.reduce((sum, seg) => sum + seg.data.byteLength, 0);
    const combined = new Uint8Array(totalSize);
        
    let offset = 0;
    for (const segment of item.segments) {
      combined.set(new Uint8Array(segment.data), offset);
      offset += segment.data.byteLength;
    }
        
    // Create blob and download
    const blob = new Blob([combined]);
    const url = URL.createObjectURL(blob);
        
    const downloadId = await new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: url,
        filename: item.filename,
        conflictAction: 'uniquify'
      }, (id) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(id);
        }
      });
    });
        
    item.downloadId = downloadId;
    URL.revokeObjectURL(url);
  }
    
  async startSingleDownload(item) {
    const downloadId = await new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: item.url,
        filename: item.filename,
        headers: item.headers,
        conflictAction: 'uniquify'
      }, (id) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(id);
        }
      });
    });
        
    item.downloadId = downloadId;
    this.monitorDownload(item);
  }
    
  monitorDownload(item) {
    const checkProgress = () => {
      chrome.downloads.search({ id: item.downloadId }, (results) => {
        if (results.length === 0) {return;}
                
        const download = results[0];
        item.bytesReceived = download.bytesReceived;
        item.totalBytes = download.totalBytes;
                
        if (download.state === 'complete') {
          this.completeDownload(item);
        } else if (download.state === 'interrupted') {
          this.handleDownloadError(item, new Error(download.error || 'Download interrupted'));
        } else {
          // Continue monitoring
          setTimeout(checkProgress, 1000);
                    
          this.onProgress({
            type: 'download_progress',
            item,
            progress: item.totalBytes ? item.bytesReceived / item.totalBytes : 0,
            stats: this.getStats()
          });
        }
      });
    };
        
    checkProgress();
  }
    
  completeDownload(item) {
    this.active.delete(item.id);
    item.status = 'completed';
    item.completedAt = Date.now();
    item.duration = item.completedAt - item.startedAt;
        
    this.completed.push(item);
    this.stats.successful++;
    this.stats.processed++;
    this.stats.downloadedBytes += item.totalBytes || 0;
        
    this.onProgress({
      type: 'download_completed',
      item,
      stats: this.getStats()
    });
        
    if (this.options.persistState) {
      this.persistState();
    }
        
    this.processNext();
        
    // Check if queue is complete
    if (this.queue.length === 0 && this.active.size === 0) {
      this.stats.endTime = Date.now();
      this.onComplete({
        stats: this.getStats(),
        completed: this.completed,
        failed: this.failed
      });
    }
  }
    
  async handleDownloadError(item, error) {
    this.active.delete(item.id);
    item.lastError = error.message;
    item.lastErrorAt = Date.now();
        
    // Classify the error
    const errorInfo = this.retryManager.classifyError(error, item);
    item.errorType = errorInfo.type;
    item.errorCategory = errorInfo.category;
        
    const shouldRetry = await this.retryManager.shouldRetry(item, error);
        
    if (shouldRetry) {
      item.retries++;
      item.status = 'retrying';
            
      const delay = this.retryManager.getRetryDelay(item.retries, errorInfo.type);
            
      // Track retry history
      item.retryHistory = item.retryHistory || [];
      item.retryHistory.push({
        attempt: item.retries,
        error: error.message,
        errorType: errorInfo.type,
        delay: delay,
        timestamp: Date.now()
      });
            
      this.onProgress({
        type: 'download_retry',
        item,
        delay,
        attempt: item.retries,
        errorType: errorInfo.type,
        errorCategory: errorInfo.category,
        description: errorInfo.description,
        maxRetries: this.retryManager.maxRetries,
        stats: this.getStats()
      });
            
      setTimeout(() => {
        item.status = 'queued';
        this.queue.unshift(item); // Add to front for priority
        this.processNext();
      }, delay);
            
    } else {
      item.status = 'failed';
      item.failedAt = Date.now();
      item.finalError = error.message;
      item.finalErrorType = errorInfo.type;
            
      this.failed.push(item);
      this.stats.failed++;
      this.stats.processed++;
            
      this.onError({
        type: 'download_failed',
        item,
        error: error.message,
        errorType: errorInfo.type,
        errorCategory: errorInfo.category,
        description: errorInfo.description,
        retryHistory: item.retryHistory || [],
        stats: this.getStats()
      });
            
      if (this.options.persistState) {
        this.persistState();
      }
            
      this.processNext();
    }
  }
    
  getStats() {
    const now = Date.now();
    const elapsed = this.stats.startTime ? (now - this.stats.startTime) / 1000 : 0;
    const rate = elapsed > 0 ? this.stats.processed / elapsed : 0;
    const remaining = this.queue.length + this.active.size;
    const eta = rate > 0 ? remaining / rate : 0;
        
    return {
      ...this.stats,
      elapsed,
      rate: Math.round(rate * 100) / 100,
      eta: Math.round(eta),
      queueSize: this.queue.length,
      activeDownloads: this.active.size,
      remaining,
      successRate: this.stats.processed > 0 ? this.stats.successful / this.stats.processed : 0
    };
  }
    
  pause() {
    this.paused = true;
    this.onProgress({
      type: 'queue_paused',
      stats: this.getStats()
    });
  }
    
  resume() {
    if (!this.paused) {return;}
    this.paused = false;
    this.onProgress({
      type: 'queue_resumed',
      stats: this.getStats()
    });
    this.processNext();
  }
    
  stop() {
    this.stopped = true;
    this.paused = true;
        
    // Cancel all active downloads
    for (const item of this.active.values()) {
      if (item.downloadId) {
        chrome.downloads.cancel(item.downloadId);
      }
    }
        
    this.active.clear();
    this.stats.endTime = Date.now();
        
    this.onProgress({
      type: 'queue_stopped',
      stats: this.getStats()
    });
  }
    
  clear() {
    this.stop();
    this.queue = [];
    this.completed = [];
    this.failed = [];
    this.stats = {
      totalItems: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      startTime: null,
      endTime: null
    };
        
    if (this.options.persistState) {
      this.clearPersistedState();
    }
        
    this.onProgress({
      type: 'queue_cleared',
      stats: this.getStats()
    });
  }
    
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
    
  extractFilename(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'download';
    } catch {
      return 'download';
    }
  }
    
  async persistState() {
    if (!this.options.persistState) {return;}
        
    const state = {
      queue: this.queue,
      completed: this.completed.slice(-100), // Keep last 100
      failed: this.failed.slice(-50), // Keep last 50
      stats: this.stats,
      timestamp: Date.now()
    };
        
    await this.stateManager.save(state);
  }
    
  async loadPersistedState() {
    if (!this.options.persistState) {return;}
        
    const state = await this.stateManager.load();
    if (state) {
      this.queue = state.queue || [];
      this.completed = state.completed || [];
      this.failed = state.failed || [];
      this.stats = { ...this.stats, ...state.stats };
            
      // Resume queued items
      if (this.queue.length > 0) {
        this.onProgress({
          type: 'state_restored',
          queueSize: this.queue.length,
          stats: this.getStats()
        });
      }
    }
  }
    
  async clearPersistedState() {
    await this.stateManager.clear();
  }
}

// Supporting classes

class RetryManager {
  constructor(maxRetries = 3, options = {}) {
    this.maxRetries = maxRetries;
    this.baseDelay = options.baseDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 30000; // 30 seconds
    this.jitterPercent = options.jitterPercent || 0.25; // 25% jitter
    this.authRetryEnabled = options.authRetryEnabled || false; // Don't retry auth errors by default
        
    // Error-specific configurations
    this.errorConfigs = {
      RATE_LIMIT: { baseDelay: 5000, maxDelay: 120000, multiplier: 2 },
      SERVER_ERROR: { baseDelay: 2000, maxDelay: 60000, multiplier: 2 },
      NETWORK_ERROR: { baseDelay: 1000, maxDelay: 30000, multiplier: 2 },
      AUTH_ERROR: { baseDelay: 0, maxDelay: 0, multiplier: 0 }, // No retry
      CAPTCHA_ERROR: { baseDelay: 0, maxDelay: 0, multiplier: 0 }, // No retry
      NOT_FOUND: { baseDelay: 0, maxDelay: 0, multiplier: 0 }, // No retry
      USER_CANCELLED: { baseDelay: 0, maxDelay: 0, multiplier: 0 }, // No retry
      UNKNOWN: { baseDelay: 1000, maxDelay: 30000, multiplier: 2 }
    };
  }
    
  async shouldRetry(item, error) {
    if (item.retries >= this.maxRetries) {return false;}
        
    const errorInfo = this.classifyError(error, item);
        
    // Check if error type is retryable
    const config = this.errorConfigs[errorInfo.type] || this.errorConfigs.UNKNOWN;
    if (config.maxDelay === 0) {
      return false; // Non-retryable error type
    }
        
    // Special handling for auth errors
    if (errorInfo.type === 'AUTH_ERROR' && !this.authRetryEnabled) {
      return false;
    }
        
    // Check if this is an authentication-required site
    if (this.isAuthRequiredSite(item.url) && 
            (errorInfo.type === 'AUTH_ERROR' || errorInfo.type === 'CAPTCHA_ERROR')) {
      return false;
    }
        
    return true;
  }
    
  classifyError(error, _item) {
    const errorStr = error.message ? error.message.toLowerCase() : error.toString().toLowerCase();
        
    // Authentication errors
    if (this.matchesPatterns(errorStr, [
      'unauthorized', 'forbidden', 'login required', 'authentication',
      '401', '403', 'access denied', 'permission denied'
    ])) {
      return {
        type: 'AUTH_ERROR',
        category: 'authentication',
        description: 'Authentication required - manual login needed'
      };
    }
        
    // Captcha/bot detection
    if (this.matchesPatterns(errorStr, [
      'captcha', 'bot', 'automated', 'verification', 'challenge',
      'human verification', 'recaptcha'
    ])) {
      return {
        type: 'CAPTCHA_ERROR',
        category: 'authentication',
        description: 'Captcha or bot detection - manual verification needed'
      };
    }
        
    // Rate limiting
    if (this.matchesPatterns(errorStr, [
      'rate limit', 'too many requests', '429', 'throttled',
      'quota exceeded', 'bandwidth exceeded'
    ])) {
      return {
        type: 'RATE_LIMIT',
        category: 'throttling',
        description: 'Rate limited - will retry with longer delays'
      };
    }
        
    // Server errors (temporary)
    if (this.matchesPatterns(errorStr, [
      '500', '502', '503', '504', 'server error', 'internal error',
      'bad gateway', 'service unavailable', 'gateway timeout'
    ])) {
      return {
        type: 'SERVER_ERROR',
        category: 'temporary',
        description: 'Server error - temporary issue, will retry'
      };
    }
        
    // Network errors
    if (this.matchesPatterns(errorStr, [
      'network', 'timeout', 'connection', 'dns', 'unreachable',
      'host not found', 'connection refused', 'connection reset'
    ])) {
      return {
        type: 'NETWORK_ERROR',
        category: 'temporary',
        description: 'Network error - temporary issue, will retry'
      };
    }
        
    // File not found
    if (this.matchesPatterns(errorStr, [
      '404', 'not found', 'file not found', 'resource not found'
    ])) {
      return {
        type: 'NOT_FOUND',
        category: 'permanent',
        description: 'File not found on server'
      };
    }
        
    // User cancelled
    if (this.matchesPatterns(errorStr, [
      'user_canceled', 'cancelled', 'aborted', 'user aborted'
    ])) {
      return {
        type: 'USER_CANCELLED',
        category: 'permanent',
        description: 'Download cancelled by user'
      };
    }
        
    return {
      type: 'UNKNOWN',
      category: 'unknown',
      description: 'Unknown error - will retry with standard backoff'
    };
  }
    
  matchesPatterns(text, patterns) {
    return patterns.some(pattern => text.includes(pattern));
  }
    
  isAuthRequiredSite(url) {
    try {
      const hostname = new URL(url).hostname;
      // Check against known auth-required sites
      const authSites = [
        'mirrorpix.com',
        'actionpress.de',
        'imago-images.com',
        'gettyimages.com',
        'gettyimages.co.uk',
        'shutterstock.com'
      ];
      return authSites.some(site => hostname.includes(site));
    } catch {
      return false;
    }
  }
    
  getRetryDelay(attemptNumber, errorType = 'UNKNOWN') {
    const config = this.errorConfigs[errorType] || this.errorConfigs.UNKNOWN;
        
    if (config.maxDelay === 0) {
      return 0; // Non-retryable
    }
        
    // Exponential backoff: baseDelay * multiplier^(attempt-1)
    const exponentialDelay = config.baseDelay * Math.pow(config.multiplier, attemptNumber - 1);
        
    // Add jitter to prevent thundering herd
    const jitterMultiplier = 1 + (Math.random() * 2 - 1) * this.jitterPercent;
        
    // Apply jitter and cap at max delay
    const finalDelay = Math.min(config.maxDelay, exponentialDelay * jitterMultiplier);
        
    return Math.round(finalDelay);
  }
    
  getRetryStatistics(items) {
    const stats = {
      totalRetries: 0,
      errorTypes: {},
      avgRetriesPerItem: 0,
      maxRetries: 0
    };
        
    let itemsWithRetries = 0;
        
    items.forEach(item => {
      if (item.retries && item.retries > 0) {
        stats.totalRetries += item.retries;
        stats.maxRetries = Math.max(stats.maxRetries, item.retries);
        itemsWithRetries++;
                
        if (item.errorType) {
          stats.errorTypes[item.errorType] = (stats.errorTypes[item.errorType] || 0) + 1;
        }
      }
    });
        
    stats.avgRetriesPerItem = itemsWithRetries > 0 ? stats.totalRetries / itemsWithRetries : 0;
        
    return stats;
  }
}

class SegmentManager {
  constructor(segmentSize = 1024 * 1024) {
    this.segmentSize = segmentSize;
  }
    
  async createSegments(item) {
    // Get file size
    const response = await fetch(item.url, { method: 'HEAD' });
    const contentLength = parseInt(response.headers.get('content-length'));
        
    if (!contentLength || contentLength < this.segmentSize * 2) {
      // File too small for segmentation
      return [{ start: 0, end: contentLength - 1 }];
    }
        
    item.contentLength = contentLength;
    const segments = [];
    const numSegments = Math.ceil(contentLength / this.segmentSize);
        
    for (let i = 0; i < numSegments; i++) {
      const start = i * this.segmentSize;
      const end = Math.min(start + this.segmentSize - 1, contentLength - 1);
            
      segments.push({
        index: i,
        start,
        end,
        size: end - start + 1,
        data: null,
        completed: false
      });
    }
        
    return segments;
  }
}

class QueueStateManager {
  constructor() {
    this.storageKey = 'steptwo_enhanced_queue_state';
  }
    
  async save(state) {
    try {
      await chrome.storage.local.set({
        [this.storageKey]: JSON.stringify(state)
      });
    } catch (error) {
      console.error('Failed to persist queue state:', error);
    }
  }
    
  async load() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const stateStr = result[this.storageKey];
      return stateStr ? JSON.parse(stateStr) : null;
    } catch (error) {
      console.error('Failed to load queue state:', error);
      return null;
    }
  }
    
  async clear() {
    try {
      await chrome.storage.local.remove(this.storageKey);
    } catch (error) {
      console.error('Failed to clear queue state:', error);
    }
  }
}