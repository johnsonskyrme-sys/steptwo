// enhanced-error-handler.js - Comprehensive error recovery system
// Inspired by DownThemAll retry logic and multiple extension error handling patterns

// Prevent duplicate declarations
if (window.EnhancedErrorHandler) {
  console.log('EnhancedErrorHandler already loaded, skipping...');
} else {

class EnhancedErrorHandler {
  constructor(options = {}) {
    this.options = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      enableLogging: options.enableLogging !== false,
      enableUserNotification: options.enableUserNotification !== false,
      ...options
    };

    this.retryStrategies = this.initializeRetryStrategies();
    this.errorStats = {
      total: 0,
      byType: {},
      recoverable: 0,
      unrecoverable: 0,
      retryAttempts: 0
    };
    
    this.activeRetries = new Map();
    this.circuitBreakers = new Map();
  }

  initializeRetryStrategies() {
    return {
      NETWORK_ERROR: {
        maxRetries: 3,
        backoff: 'exponential',
        recoverable: true,
        userAction: false,
        description: 'Network connection issue - retrying with exponential backoff'
      },
      TIMEOUT: {
        maxRetries: 2,
        backoff: 'linear',
        recoverable: true,
        userAction: false,
        description: 'Request timeout - retrying with increased timeout'
      },
      DOM_CHANGED: {
        maxRetries: 1,
        backoff: 'immediate',
        recoverable: true,
        userAction: false,
        description: 'Page structure changed - re-analyzing DOM'
      },
      SELECTOR_NOT_FOUND: {
        maxRetries: 2,
        backoff: 'immediate',
        recoverable: true,
        userAction: false,
        description: 'Selector not found - trying fallback selectors'
      },
      PERMISSION_DENIED: {
        maxRetries: 0,
        backoff: 'none',
        recoverable: false,
        userAction: true,
        description: 'Permission denied - user action required'
      },
      QUOTA_EXCEEDED: {
        maxRetries: 1,
        backoff: 'linear',
        recoverable: true,
        userAction: false,
        description: 'Storage quota exceeded - cleaning up and retrying'
      },
      RATE_LIMITED: {
        maxRetries: 3,
        backoff: 'exponential',
        recoverable: true,
        userAction: false,
        description: 'Rate limited by server - backing off'
      },
      AUTHENTICATION_ERROR: {
        maxRetries: 1,
        backoff: 'immediate',
        recoverable: false,
        userAction: true,
        description: 'Authentication failed - please log in and try again'
      },
      DOWNLOAD_FAILED: {
        maxRetries: 2,
        backoff: 'exponential',
        recoverable: true,
        userAction: false,
        description: 'Download failed - retrying with different approach'
      },
      CONTENT_BLOCKED: {
        maxRetries: 0,
        backoff: 'none',
        recoverable: false,
        userAction: true,
        description: 'Content blocked by site - manual intervention needed'
      },
      MEMORY_ERROR: {
        maxRetries: 1,
        backoff: 'immediate',
        recoverable: true,
        userAction: false,
        description: 'Memory limit reached - optimizing and retrying'
      },
      UNKNOWN_ERROR: {
        maxRetries: 1,
        backoff: 'linear',
        recoverable: true,
        userAction: false,
        description: 'Unknown error occurred - attempting recovery'
      }
    };
  }

  // Main error handling method
  async handleError(error, context = {}) {
    this.errorStats.total++;
    
    try {
      // Normalize error
      const normalizedError = this.normalizeError(error);
      const errorType = this.classifyError(normalizedError, context);
      
      // Update statistics
      this.errorStats.byType[errorType] = (this.errorStats.byType[errorType] || 0) + 1;
      
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(errorType)) {
        return this.createErrorResult(normalizedError, errorType, 'CIRCUIT_BREAKER_OPEN');
      }
      
      // Get retry strategy
      const strategy = this.retryStrategies[errorType] || this.retryStrategies.UNKNOWN_ERROR;
      
      // Log error
      if (this.options.enableLogging) {
        this.logError(normalizedError, errorType, strategy, context);
      }
      
      // Check if retry is possible
      const retryKey = this.getRetryKey(context);
      const currentRetries = this.activeRetries.get(retryKey) || 0;
      
      if (currentRetries >= strategy.maxRetries) {
        this.errorStats.unrecoverable++;
        return this.handleUnrecoverableError(normalizedError, errorType, strategy, context);
      }
      
      // Increment retry count
      this.activeRetries.set(retryKey, currentRetries + 1);
      this.errorStats.retryAttempts++;
      
      // Execute retry strategy
      const result = await this.executeRetryStrategy(normalizedError, errorType, strategy, context);
      
      // Clear retry count on success
      if (result.success) {
        this.activeRetries.delete(retryKey);
        this.errorStats.recoverable++;
      }
      
      return result;
      
    } catch (handlerError) {
      console.error('Error handler failed:', handlerError);
      return this.createErrorResult(error, 'HANDLER_ERROR', 'FATAL');
    }
  }

  // Normalize different error types to consistent format
  normalizeError(error) {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
        originalError: error
      };
    }
    
    if (typeof error === 'string') {
      return {
        message: error,
        name: 'StringError',
        originalError: new Error(error)
      };
    }
    
    if (error && typeof error === 'object') {
      return {
        message: error.message || 'Unknown error',
        name: error.name || error.type || 'ObjectError',
        code: error.code,
        status: error.status,
        originalError: error
      };
    }
    
    return {
      message: 'Unknown error occurred',
      name: 'UnknownError',
      originalError: error
    };
  }

  // Classify error into specific type
  classifyError(error, context) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    // Network errors
    if (name.includes('network') || message.includes('network') || 
        message.includes('fetch') || message.includes('connection') ||
        error.code === 'NETWORK_ERROR') {
      return 'NETWORK_ERROR';
    }
    
    // Timeout errors
    if (name.includes('timeout') || message.includes('timeout') ||
        error.code === 'TIMEOUT') {
      return 'TIMEOUT';
    }
    
    // DOM errors
    if (message.includes('dom') || message.includes('element') ||
        message.includes('selector') || message.includes('not found')) {
      return 'SELECTOR_NOT_FOUND';
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('denied') ||
        message.includes('forbidden') || error.status === 403) {
      return 'PERMISSION_DENIED';
    }
    
    // Rate limiting
    if (message.includes('rate') || message.includes('limit') ||
        error.status === 429) {
      return 'RATE_LIMITED';
    }
    
    // Authentication errors
    if (message.includes('auth') || message.includes('login') ||
        error.status === 401) {
      return 'AUTHENTICATION_ERROR';
    }
    
    // Storage/quota errors
    if (message.includes('quota') || message.includes('storage') ||
        name.includes('quota')) {
      return 'QUOTA_EXCEEDED';
    }
    
    // Download errors
    if (context.operation === 'download' || message.includes('download')) {
      return 'DOWNLOAD_FAILED';
    }
    
    // Memory errors
    if (message.includes('memory') || message.includes('heap') ||
        name.includes('memory')) {
      return 'MEMORY_ERROR';
    }
    
    // Content blocking
    if (message.includes('blocked') || message.includes('csp') ||
        error.status === 451) {
      return 'CONTENT_BLOCKED';
    }
    
    return 'UNKNOWN_ERROR';
  }

  // Execute specific retry strategy
  async executeRetryStrategy(error, errorType, strategy, context) {
    try {
      // Pre-retry actions
      await this.preRetryActions(errorType, context);
      
      // Calculate delay
      const delay = this.calculateBackoff(strategy.backoff, context.retryCount || 0);
      
      // Wait before retry
      if (delay > 0) {
        await this.wait(delay);
      }
      
      // Execute recovery actions
      await this.executeRecoveryActions(errorType, context);
      
      // Retry the original operation
      if (context.retryFunction) {
        const result = await context.retryFunction();
        return this.createSuccessResult(result, errorType, strategy);
      }
      
      return this.createErrorResult(error, errorType, 'NO_RETRY_FUNCTION');
      
    } catch (retryError) {
      return this.createErrorResult(retryError, errorType, 'RETRY_FAILED');
    }
  }

  // Pre-retry actions based on error type
  async preRetryActions(errorType, context) {
    switch (errorType) {
      case 'QUOTA_EXCEEDED':
        await this.cleanupStorage();
        break;
        
      case 'MEMORY_ERROR':
        await this.optimizeMemoryUsage();
        break;
        
      case 'DOM_CHANGED':
        await this.refreshPageAnalysis();
        break;
        
      case 'RATE_LIMITED':
        this.updateCircuitBreaker(errorType);
        break;
    }
  }

  // Execute recovery actions
  async executeRecoveryActions(errorType, context) {
    switch (errorType) {
      case 'SELECTOR_NOT_FOUND':
        await this.refreshSelectors(context);
        break;
        
      case 'NETWORK_ERROR':
        await this.checkNetworkConnectivity();
        break;
        
      case 'TIMEOUT':
        if (context.timeoutMs) {
          context.timeoutMs *= 1.5; // Increase timeout
        }
        break;
        
      case 'DOWNLOAD_FAILED':
        await this.switchDownloadMethod(context);
        break;
    }
  }

  // Calculate backoff delay
  calculateBackoff(strategy, retryCount) {
    const baseDelay = this.options.baseDelay;
    
    switch (strategy) {
      case 'exponential':
        return Math.min(baseDelay * Math.pow(2, retryCount), this.options.maxDelay);
        
      case 'linear':
        return Math.min(baseDelay * (retryCount + 1), this.options.maxDelay);
        
      case 'immediate':
        return 0;
        
      case 'none':
      default:
        return 0;
    }
  }

  // Circuit breaker pattern
  isCircuitBreakerOpen(errorType) {
    const breaker = this.circuitBreakers.get(errorType);
    if (!breaker) {return false;}
    
    const now = Date.now();
    if (now > breaker.resetTime) {
      this.circuitBreakers.delete(errorType);
      return false;
    }
    
    return breaker.failures >= breaker.threshold;
  }

  updateCircuitBreaker(errorType) {
    const now = Date.now();
    const breaker = this.circuitBreakers.get(errorType) || {
      failures: 0,
      threshold: 5,
      resetTime: now + 60000 // 1 minute
    };
    
    breaker.failures++;
    breaker.resetTime = now + 60000;
    
    this.circuitBreakers.set(errorType, breaker);
  }

  // Utility methods
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getRetryKey(context) {
    return `${context.operation || 'unknown'}_${context.url || 'nourl'}_${context.selector || 'noselector'}`;
  }

  // Recovery action implementations
  async cleanupStorage() {
    try {
      // Clear temporary data
      const storage = await chrome.storage.local.get();
      const keysToRemove = Object.keys(storage).filter(key => 
        key.startsWith('temp_') || key.startsWith('cache_')
      );
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
    } catch (_error) {
      console.warn('Storage cleanup failed:', error);
    }
  }

  async optimizeMemoryUsage() {
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Clear cached data
    window.cachedData = {};
    
    // Notify background to optimize
    try {
      await chrome.runtime.sendMessage({type: 'OPTIMIZE_MEMORY'});
    } catch (_error) {
      console.warn('Memory optimization message failed:', error);
    }
  }

  async refreshPageAnalysis() {
    // Re-analyze page structure
    try {
      await chrome.runtime.sendMessage({type: 'REFRESH_PAGE_ANALYSIS'});
    } catch (_error) {
      console.warn('Page analysis refresh failed:', error);
    }
  }

  async refreshSelectors(context) {
    // Try to get updated selectors
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_FALLBACK_SELECTORS',
        currentSelector: context.selector,
        url: window.location.href
      });
      
      if (response && response.selectors) {
        context.fallbackSelectors = response.selectors;
      }
    } catch (_error) {
      console.warn('Selector refresh failed:', error);
    }
  }

  async checkNetworkConnectivity() {
    return navigator.onLine;
  }

  async switchDownloadMethod(context) {
    // Try alternative download approach
    if (context.downloadMethod === 'fetch') {
      context.downloadMethod = 'xhr';
    } else if (context.downloadMethod === 'xhr') {
      context.downloadMethod = 'chrome_downloads';
    }
  }

  // Handle unrecoverable errors
  async handleUnrecoverableError(error, errorType, strategy, context) {
    if (this.options.enableUserNotification && strategy.userAction) {
      await this.notifyUser(error, errorType, strategy);
    }
    
    return this.createErrorResult(error, errorType, 'UNRECOVERABLE');
  }

  async notifyUser(error, errorType, strategy) {
    const notification = {
      type: 'error',
      title: 'Scraping Error',
      message: strategy.description || error.message,
      errorType: errorType,
      userAction: strategy.userAction
    };
    
    try {
      await chrome.runtime.sendMessage({
        type: 'SHOW_USER_NOTIFICATION',
        notification: notification
      });
    } catch (_error) {
      console.warn('User notification failed:', error);
    }
  }

  // Result creation helpers
  createSuccessResult(result, errorType, strategy) {
    return {
      success: true,
      result: result,
      errorType: errorType,
      strategy: strategy.description,
      recoveredFromError: true
    };
  }

  createErrorResult(error, errorType, reason) {
    return {
      success: false,
      error: error,
      errorType: errorType,
      reason: reason,
      recoverable: this.retryStrategies[errorType]?.recoverable || false
    };
  }

  // Logging
  logError(error, errorType, strategy, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: error.message,
      errorType: errorType,
      strategy: strategy.description,
      context: {
        url: context.url || window.location.href,
        operation: context.operation,
        retryCount: this.activeRetries.get(this.getRetryKey(context)) || 0
      }
    };
    
    console.error('Enhanced Error Handler:', logEntry);
    
    // Send to background for storage
    try {
      chrome.runtime.sendMessage({
        type: 'LOG_ERROR',
        logEntry: logEntry
      });
    } catch (_error) {
      console.warn('Error logging failed:', error);
    }
  }

  // Get comprehensive error statistics
  getStats() {
    return {
      ...this.errorStats,
      successRate: this.errorStats.total > 0 ? 
        this.errorStats.recoverable / this.errorStats.total : 1,
      activeRetries: this.activeRetries.size,
      circuitBreakers: Array.from(this.circuitBreakers.keys())
    };
  }

  // Reset statistics
  resetStats() {
    this.errorStats = {
      total: 0,
      byType: {},
      recoverable: 0,
      unrecoverable: 0,
      retryAttempts: 0
    };
    this.activeRetries.clear();
  }
}

// Export for use in other modules
window.EnhancedErrorHandler = EnhancedErrorHandler;

// Usage example:
// const errorHandler = new EnhancedErrorHandler({
//   maxRetries: 3,
//   enableLogging: true,
//   enableUserNotification: true
// });
//
// try {
//   const result = await someOperation();
// } catch (_error) {
//   const recovery = await errorHandler.handleError(error, {
//     operation: 'scraping',
//     url: window.location.href,
//     retryFunction: () => someOperation()
//   });
//   
//   if (recovery.success) {
//     console.log('Recovered from error:', recovery.result);
//   } else {
//     console.error('Could not recover:', recovery.error);
//   }
// }

}

// Export to window for use in other modules
window.EnhancedErrorHandler = EnhancedErrorHandler;

}