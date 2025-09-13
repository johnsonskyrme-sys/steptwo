// common-utils.js - Shared utility functions for STEPTWO V2
// Reduces code duplication across content scripts and background

// Utility class for common operations
class StepTwoUtils {
  // URL validation and parsing
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  static getHostname(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }
  
  static getFileExtension(url) {
    try {
      const pathname = new URL(url).pathname;
      const ext = pathname.split('.').pop().toLowerCase();
      return ext && ext.length <= 4 ? ext : '';
    } catch {
      return '';
    }
  }
  
  // Image validation
  static isImageUrl(url) {
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'];
    const ext = this.getFileExtension(url);
    return imageExts.includes(ext);
  }
  
  static isValidImageSize(width, height, minWidth = 0, minHeight = 0) {
    const w = parseInt(width) || 0;
    const h = parseInt(height) || 0;
    return w >= minWidth && h >= minHeight;
  }
  
  // Filter utilities
  static createDefaultFilters() {
    return {
      minWidth: 0,
      minHeight: 0,
      maxSize: 0,
      allowedTypes: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff'],
      skipDuplicates: false,
      skipSmallImages: true
    };
  }
  
  static validateFilters(filters) {
    const defaults = this.createDefaultFilters();
    return {
      ...defaults,
      ...filters,
      minWidth: Math.max(0, parseInt(filters.minWidth) || 0),
      minHeight: Math.max(0, parseInt(filters.minHeight) || 0),
      maxSize: Math.max(0, parseInt(filters.maxSize) || 0)
    };
  }
  
  // DOM utilities
  static isElementVisible(element) {
    if (!element) {return false;}
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }
  
  static getElementSelector(element) {
    if (!element) {return '';}
    
    // Try ID first
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Try unique class combinations
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length === 1) {
        return `.${classes[0]}`;
      }
    }
    
    // Fall back to tag name
    return element.tagName.toLowerCase();
  }
  
  // Performance utilities
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  // Async utilities
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static async withTimeout(promise, timeoutMs) {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    );
    
    return Promise.race([promise, timeout]);
  }
  
  // Settings utilities
  static getDefaultSettings() {
    return {
      concurrency: 5,
      retryLimit: 3,
      hostLimit: 3,
      timeout: 30000,
      filters: this.createDefaultFilters(),
      filename: {
        pattern: '[title]_[index].[ext]',
        folder: 'STEPTWO'
      }
    };
  }
  
  static mergeSettings(defaults, userSettings) {
    const merged = { ...defaults };
    
    for (const [key, value] of Object.entries(userSettings || {})) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = { ...merged[key], ...value };
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }
  
  // Logging utilities
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[STEPTWO ${level.toUpperCase()}]`;
    
    if (data) {
      console[level](`${prefix} ${message}`, data);
    } else {
      console[level](`${prefix} ${message}`);
    }
    
    // Send to background for centralized logging
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage({
          type: 'LOG_MESSAGE',
          level: level.toUpperCase(),
          message,
          data,
          timestamp
        }).catch(() => {}); // Ignore if background script is not available
      } catch (_error) {
        // Ignore messaging errors
      }
    }
  }
  
  // Version comparison utilities
  static compareVersions(a, b) {
    if (!a || !b) {return 0;}
    
    // Normalize versions by splitting and padding
    const aParts = a.toString().split('.').map(x => parseInt(x) || 0);
    const bParts = b.toString().split('.').map(x => parseInt(x) || 0);
    
    // Pad arrays to same length
    const maxLength = Math.max(aParts.length, bParts.length);
    while (aParts.length < maxLength) {aParts.push(0);}
    while (bParts.length < maxLength) {bParts.push(0);}
    
    // Compare each part
    for (let i = 0; i < maxLength; i++) {
      if (aParts[i] > bParts[i]) {return 1;}
      if (aParts[i] < bParts[i]) {return -1;}
    }
    
    return 0;
  }

  // Gallery detection utilities
  static detectGalleryElements(document = window.document) {
    const indicators = [
      // Count images
      () => document.querySelectorAll('img').length,
      // Gallery-specific selectors
      () => document.querySelectorAll('[class*="gallery"], [class*="grid"], [class*="photo"]').length,
      // Lazy loading indicators
      () => document.querySelectorAll('[data-src], [loading="lazy"]').length,
      // Product grids
      () => document.querySelectorAll('[class*="product"], [class*="item-grid"]').length
    ];
    
    const scores = indicators.map(indicator => {
      try {
        return indicator();
      } catch {
        return 0;
      }
    });
    
    return {
      imageCount: scores[0],
      galleryElements: scores[1],
      lazyElements: scores[2],
      productElements: scores[3],
      totalScore: scores.reduce((sum, score) => sum + score, 0),
      isLikelyGallery: scores[0] >= 10 || scores[1] >= 3 || scores[2] >= 5
    };
  }
}

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = StepTwoUtils;
} else if (typeof window !== 'undefined') {
  // Browser environment
  window.StepTwoUtils = StepTwoUtils;
} else if (typeof self !== 'undefined') {
  // Web Worker or Service Worker environment
  self.StepTwoUtils = StepTwoUtils;
}