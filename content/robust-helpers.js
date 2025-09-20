// robust-helpers.js - Comprehensive helper functions for robust web scraping operations
// Provides enhanced utilities for waitForSelector, image gathering, URL normalization, and more

// Prevent duplicate initialization
if (window.RobustHelpers) {
  console.log('RobustHelpers already loaded, skipping...');
} else {
  window.RobustHelpers = true;

  class RobustHelpers {
    
    // =============================================================================
    // ROBUST SELECTOR WAITING
    // =============================================================================
    
    /**
     * Enhanced waitForSelector with multiple strategies and robust error handling
     * @param {string|string[]} selectors - CSS selector(s) to wait for
     * @param {Object} options - Configuration options
     * @returns {Promise<Element>} - The found element
     */
    static async waitForSelector(selectors, options = {}) {
      const config = {
        timeout: options.timeout || 10000,
        interval: options.interval || 100,
        visible: options.visible !== false,
        enabled: options.enabled !== false,
        multiple: options.multiple || false,
        retries: options.retries || 3,
        throwOnTimeout: options.throwOnTimeout !== false,
        context: options.context || document,
        ...options
      };

      // Normalize selectors to array
      const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
      
      for (let attempt = 1; attempt <= config.retries; attempt++) {
        try {
          const result = await this._waitForSelectorAttempt(selectorArray, config);
          if (result) {
            console.log(`✅ Selector found on attempt ${attempt}:`, 
              Array.isArray(selectors) ? selectors[0] : selectors);
            return config.multiple ? result : result[0];
          }
        } catch (error) {
          console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);
          if (attempt === config.retries) {
            if (config.throwOnTimeout) {
              throw new Error(`Failed to find selector after ${config.retries} attempts: ${selectorArray.join(', ')}`);
            }
            return null;
          }
          // Wait before retry
          await this.sleep(config.interval * attempt);
        }
      }
      
      return null;
    }

    /**
     * Single attempt to find selector
     * @private
     */
    static async _waitForSelectorAttempt(selectors, config) {
      const startTime = Date.now();
      
      while (Date.now() - startTime < config.timeout) {
        for (const selector of selectors) {
          try {
            const elements = config.multiple 
              ? Array.from(config.context.querySelectorAll(selector))
              : [config.context.querySelector(selector)].filter(Boolean);
            
            if (elements.length > 0) {
              // Filter by visibility if required
              const validElements = config.visible 
                ? elements.filter(el => this.isElementVisible(el))
                : elements;
              
              // Filter by enabled state if required  
              const enabledElements = config.enabled
                ? validElements.filter(el => this.isElementEnabled(el))
                : validElements;
                
              if (enabledElements.length > 0) {
                return enabledElements;
              }
            }
          } catch (error) {
            console.warn(`Invalid selector "${selector}":`, error.message);
          }
        }
        
        await this.sleep(config.interval);
      }
      
      return null;
    }

    // =============================================================================
    // IMAGE GATHERING UTILITIES
    // =============================================================================

    /**
     * Enhanced image gathering with comprehensive URL resolution and validation
     * @param {Object} options - Gathering options
     * @returns {Promise<Array>} - Array of image objects
     */
    static async gatherImages(options = {}) {
      const config = {
        selectors: options.selectors || [
          'img[src]',
          'img[data-src]',
          'img[data-lazy-src]',
          '[style*="background-image"]',
          'picture img',
          'figure img',
          '.image img',
          '[data-background]'
        ],
        minWidth: options.minWidth || 0,
        minHeight: options.minHeight || 0,
        formats: options.formats || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        includeThumbnails: options.includeThumbnails !== false,
        includeMetadata: options.includeMetadata !== false,
        deduplicateUrls: options.deduplicateUrls !== false,
        resolveUrls: options.resolveUrls !== false,
        validateImages: options.validateImages !== false,
        ...options
      };

      const imageResults = [];
      const seenUrls = new Set();

      // Gather from direct img elements
      for (const selector of config.selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          
          for (const element of elements) {
            const imageData = await this.extractImageFromElement(element, config);
            
            if (imageData && this.validateImageData(imageData, config)) {
              const normalizedUrl = this.normalizeUrl(imageData.url);
              
              if (!config.deduplicateUrls || !seenUrls.has(normalizedUrl)) {
                seenUrls.add(normalizedUrl);
                imageResults.push(imageData);
              }
            }
          }
        } catch (error) {
          console.warn(`Error processing selector "${selector}":`, error);
        }
      }

      // Gather from background images
      if (config.includeBackgrounds !== false) {
        const backgroundImages = await this.extractBackgroundImages(config);
        for (const bgImage of backgroundImages) {
          const normalizedUrl = this.normalizeUrl(bgImage.url);
          if (!config.deduplicateUrls || !seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            imageResults.push(bgImage);
          }
        }
      }

      console.log(`🖼️ Gathered ${imageResults.length} images from ${seenUrls.size} unique URLs`);
      return imageResults;
    }

    /**
     * Extract image data from a single element
     * @param {Element} element - DOM element to extract from
     * @param {Object} config - Configuration options
     * @returns {Promise<Object|null>} - Image data object or null
     */
    static async extractImageFromElement(element, config = {}) {
      try {
        let url = null;
        let thumbnailUrl = null;
        
        // Try multiple URL sources
        if (element.tagName === 'IMG') {
          url = element.src || element.dataset.src || element.dataset.lazySrc || 
                element.dataset.original || element.getAttribute('data-url');
          thumbnailUrl = element.dataset.thumbnail || element.dataset.thumb;
        } else {
          // Check for background images
          const style = window.getComputedStyle(element);
          const backgroundImage = style.backgroundImage;
          if (backgroundImage && backgroundImage !== 'none') {
            const matches = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
            url = matches ? matches[1] : null;
          }
          
          // Check data attributes
          url = url || element.dataset.background || element.dataset.image;
        }

        if (!url) return null;

        // Normalize and validate URL
        const normalizedUrl = this.normalizeUrl(url);
        if (!normalizedUrl || !this.isValidImageUrl(normalizedUrl, config.formats)) {
          return null;
        }

        // Get element dimensions
        const rect = element.getBoundingClientRect();
        const dimensions = await this.getImageDimensions(normalizedUrl).catch(() => ({ width: 0, height: 0 }));

        // Build image data object
        const imageData = {
          url: normalizedUrl,
          thumbnailUrl: thumbnailUrl ? this.normalizeUrl(thumbnailUrl) : null,
          element: element,
          dimensions: {
            natural: dimensions,
            displayed: {
              width: rect.width,
              height: rect.height
            }
          },
          metadata: config.includeMetadata ? await this.extractImageMetadata(element, normalizedUrl) : null,
          timestamp: Date.now()
        };

        return imageData;
      } catch (error) {
        console.warn('Error extracting image from element:', error);
        return null;
      }
    }

    /**
     * Extract background images from CSS
     * @param {Object} config - Configuration options
     * @returns {Promise<Array>} - Array of background image objects
     */
    static async extractBackgroundImages(config = {}) {
      const backgroundImages = [];
      const elements = document.querySelectorAll('*');
      
      for (const element of elements) {
        try {
          const style = window.getComputedStyle(element);
          const backgroundImage = style.backgroundImage;
          
          if (backgroundImage && backgroundImage !== 'none') {
            const urls = this.extractUrlsFromCssValue(backgroundImage);
            
            for (const url of urls) {
              const normalizedUrl = this.normalizeUrl(url);
              if (normalizedUrl && this.isValidImageUrl(normalizedUrl, config.formats)) {
                const dimensions = await this.getImageDimensions(normalizedUrl).catch(() => ({ width: 0, height: 0 }));
                
                backgroundImages.push({
                  url: normalizedUrl,
                  element: element,
                  type: 'background',
                  dimensions: { natural: dimensions },
                  metadata: config.includeMetadata ? await this.extractImageMetadata(element, normalizedUrl) : null,
                  timestamp: Date.now()
                });
              }
            }
          }
        } catch (error) {
          // Silently continue on individual element errors
        }
      }
      
      return backgroundImages;
    }

    // =============================================================================
    // URL NORMALIZATION UTILITIES
    // =============================================================================

    /**
     * Comprehensive URL normalization
     * @param {string} url - URL to normalize
     * @param {Object} options - Normalization options
     * @returns {string|null} - Normalized URL or null if invalid
     */
    static normalizeUrl(url, options = {}) {
      if (!url || typeof url !== 'string') return null;
      
      try {
        // Clean the URL
        let cleanUrl = url.trim();
        
        // Remove quotes and decode if needed
        cleanUrl = cleanUrl.replace(/^['"]|['"]$/g, '');
        
        // Handle data URLs
        if (cleanUrl.startsWith('data:')) {
          return options.allowDataUrls !== false ? cleanUrl : null;
        }
        
        // Handle protocol-relative URLs
        if (cleanUrl.startsWith('//')) {
          cleanUrl = window.location.protocol + cleanUrl;
        }
        
        // Handle relative URLs
        if (!cleanUrl.match(/^https?:/)) {
          cleanUrl = new URL(cleanUrl, window.location.href).href;
        }
        
        // Create URL object for validation and normalization
        const urlObj = new URL(cleanUrl);
        
        // Normalize protocol
        if (options.forceHttps && urlObj.protocol === 'http:') {
          urlObj.protocol = 'https:';
        }
        
        // Handle query parameters
        if (options.removeQueryParams) {
          urlObj.search = '';
        } else if (options.sortQueryParams) {
          const params = new URLSearchParams(urlObj.search);
          const sortedParams = new URLSearchParams();
          [...params.keys()].sort().forEach(key => {
            sortedParams.append(key, params.get(key));
          });
          urlObj.search = sortedParams.toString();
        }
        
        // Handle fragments
        if (options.removeFragment) {
          urlObj.hash = '';
        }
        
        // Handle trailing slashes
        if (options.removeTrailingSlash && urlObj.pathname.endsWith('/') && urlObj.pathname.length > 1) {
          urlObj.pathname = urlObj.pathname.slice(0, -1);
        }
        
        return urlObj.href;
      } catch (error) {
        console.warn('URL normalization failed:', error);
        return null;
      }
    }

    /**
     * Extract URLs from CSS values (e.g., background-image)
     * @param {string} cssValue - CSS property value
     * @returns {Array<string>} - Array of extracted URLs
     */
    static extractUrlsFromCssValue(cssValue) {
      const urls = [];
      const urlPattern = /url\(['"]?([^'"]+)['"]?\)/g;
      let match;
      
      while ((match = urlPattern.exec(cssValue)) !== null) {
        urls.push(match[1]);
      }
      
      return urls;
    }

    /**
     * Validate if URL is a valid image URL
     * @param {string} url - URL to validate
     * @param {Array<string>} allowedFormats - Allowed image formats
     * @returns {boolean} - True if valid image URL
     */
    static isValidImageUrl(url, allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']) {
      if (!url) return false;
      
      try {
        const urlObj = new URL(url);
        
        // Check for data URLs
        if (urlObj.protocol === 'data:') {
          return urlObj.pathname.startsWith('image/');
        }
        
        // Extract file extension
        const pathname = urlObj.pathname.toLowerCase();
        const extension = pathname.split('.').pop();
        
        // Check if extension is in allowed formats
        if (allowedFormats.includes(extension)) {
          return true;
        }
        
        // Check for common image URL patterns
        const imagePatterns = [
          /\/images?\//,
          /\/img\//,
          /\/photos?\//,
          /\/gallery\//,
          /\/media\//,
          /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i
        ];
        
        return imagePatterns.some(pattern => pattern.test(url));
      } catch (error) {
        return false;
      }
    }

    // =============================================================================
    // ADDITIONAL HELPER UTILITIES
    // =============================================================================

    /**
     * Check if element is visible
     * @param {Element} element - Element to check
     * @returns {boolean} - True if visible
     */
    static isElementVisible(element) {
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      
      return rect.width > 0 && 
             rect.height > 0 && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0' &&
             style.display !== 'none' &&
             element.offsetParent !== null;
    }

    /**
     * Check if element is enabled/interactive
     * @param {Element} element - Element to check
     * @returns {boolean} - True if enabled
     */
    static isElementEnabled(element) {
      if (!element) return false;
      
      const style = window.getComputedStyle(element);
      return !element.disabled && 
             style.pointerEvents !== 'none' &&
             !element.hasAttribute('aria-disabled');
    }

    /**
     * Click element with retries and various strategies
     * @param {Element} element - Element to click
     * @param {Object} options - Click options
     * @returns {Promise<boolean>} - True if click succeeded
     */
    static async clickElement(element, options = {}) {
      const config = {
        retries: options.retries || 3,
        scrollIntoView: options.scrollIntoView !== false,
        waitAfterScroll: options.waitAfterScroll || 300,
        clickStrategies: options.clickStrategies || ['click', 'dispatchEvent', 'mouseEvents'],
        ...options
      };

      if (!element) return false;

      for (let attempt = 1; attempt <= config.retries; attempt++) {
        try {
          // Scroll into view if requested
          if (config.scrollIntoView) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.sleep(config.waitAfterScroll);
          }

          // Check if element is clickable
          if (!this.isElementVisible(element) || !this.isElementEnabled(element)) {
            throw new Error('Element is not clickable');
          }

          // Try different click strategies
          for (const strategy of config.clickStrategies) {
            try {
              if (strategy === 'click') {
                element.click();
              } else if (strategy === 'dispatchEvent') {
                element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              } else if (strategy === 'mouseEvents') {
                element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              }
              
              console.log(`✅ Click succeeded with strategy "${strategy}" on attempt ${attempt}`);
              return true;
            } catch (strategyError) {
              console.warn(`Click strategy "${strategy}" failed:`, strategyError);
            }
          }
          
          throw new Error('All click strategies failed');
        } catch (error) {
          console.warn(`Click attempt ${attempt} failed:`, error.message);
          if (attempt === config.retries) {
            return false;
          }
          await this.sleep(200 * attempt);
        }
      }
      
      return false;
    }

    /**
     * Extract text content with various fallbacks
     * @param {Element} element - Element to extract text from
     * @param {Object} options - Extraction options
     * @returns {string} - Extracted text
     */
    static extractText(element, options = {}) {
      if (!element) return '';
      
      const config = {
        trim: options.trim !== false,
        preserveLineBreaks: options.preserveLineBreaks || false,
        maxLength: options.maxLength || null,
        fallbackToTitle: options.fallbackToTitle !== false,
        fallbackToAlt: options.fallbackToAlt !== false,
        ...options
      };

      let text = '';
      
      // Try various text extraction methods
      if (element.textContent) {
        text = element.textContent;
      } else if (element.innerText) {
        text = element.innerText;
      } else if (config.fallbackToTitle && element.title) {
        text = element.title;
      } else if (config.fallbackToAlt && element.alt) {
        text = element.alt;
      }

      // Process the text
      if (config.trim) {
        text = text.trim();
      }
      
      if (!config.preserveLineBreaks) {
        text = text.replace(/\s+/g, ' ');
      }
      
      if (config.maxLength && text.length > config.maxLength) {
        text = text.substring(0, config.maxLength) + '...';
      }

      return text;
    }

    /**
     * Sleep utility
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} - Promise that resolves after delay
     */
    static sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get image dimensions
     * @param {string} url - Image URL
     * @returns {Promise<Object>} - Object with width and height
     */
    static getImageDimensions(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      });
    }

    /**
     * Extract image metadata
     * @param {Element} element - Image element
     * @param {string} url - Image URL
     * @returns {Promise<Object>} - Metadata object
     */
    static async extractImageMetadata(element, url) {
      const metadata = {
        alt: element.alt || '',
        title: element.title || '',
        className: element.className || '',
        id: element.id || '',
        src: url,
        format: this.getImageFormat(url),
        attributes: {}
      };

      // Extract custom data attributes
      for (const attr of element.attributes) {
        if (attr.name.startsWith('data-')) {
          metadata.attributes[attr.name] = attr.value;
        }
      }

      return metadata;
    }

    /**
     * Get image format from URL
     * @param {string} url - Image URL
     * @returns {string} - Image format
     */
    static getImageFormat(url) {
      try {
        const urlObj = new URL(url);
        const extension = urlObj.pathname.split('.').pop().toLowerCase();
        return extension || 'unknown';
      } catch {
        return 'unknown';
      }
    }

    /**
     * Validate image data against criteria
     * @param {Object} imageData - Image data object
     * @param {Object} config - Validation config
     * @returns {boolean} - True if valid
     */
    static validateImageData(imageData, config = {}) {
      if (!imageData || !imageData.url) return false;
      
      // Check dimensions if specified
      if (config.minWidth || config.minHeight) {
        const width = imageData.dimensions?.natural?.width || imageData.dimensions?.displayed?.width || 0;
        const height = imageData.dimensions?.natural?.height || imageData.dimensions?.displayed?.height || 0;
        
        if (config.minWidth && width < config.minWidth) return false;
        if (config.minHeight && height < config.minHeight) return false;
      }
      
      // Check format if specified
      if (config.formats && Array.isArray(config.formats)) {
        const format = this.getImageFormat(imageData.url);
        if (!config.formats.includes(format)) return false;
      }
      
      return true;
    }

    /**
     * Performance monitoring helper
     * @param {string} operation - Operation name
     * @param {Function} fn - Function to monitor
     * @returns {Promise<any>} - Function result with timing
     */
    static async monitorPerformance(operation, fn) {
      const startTime = performance.now();
      try {
        const result = await fn();
        const endTime = performance.now();
        console.log(`⏱️ ${operation} completed in ${(endTime - startTime).toFixed(2)}ms`);
        return result;
      } catch (error) {
        const endTime = performance.now();
        console.error(`❌ ${operation} failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
        throw error;
      }
    }
  }

  // Export to global scope
  window.RobustHelpers = RobustHelpers;
  console.log('✅ RobustHelpers loaded successfully');
}