// injector.js - Enhanced injector with smart loading and gallery detection

(async () => {
  // Check if we're running in a Chrome extension context
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
    console.log('🌐 STEPTWO: Not running in Chrome extension context, skipping content script initialization');
    return;
  }

  // Import utility functions dynamically
  const { createStatusIndicator, setTextContent } = await import(chrome.runtime.getURL('lib/lib-utilities.js'));
  
  let profiles = {};
  let autoDetect = true;
  const _currentSettings = {}; // Kept for future use
  let siteProfile = null;
  let enhancedModulesLoaded = false;
  let enhancedSelector = null;
  let macroSystem = null;
  let isGalleryPage = false;
  const _selectorCache = new Map(); // Kept for future use
  let galleryDetectionCache = null;
  
  // Smart gallery detection to avoid loading scripts on irrelevant pages
  function detectGalleryPage() {
    if (galleryDetectionCache !== null) {return galleryDetectionCache;}
    
    // Use performance monitoring if available
    const measureFunc = window.globalPerformanceMonitor?.measureSync || ((name, fn) => fn());
    
    return measureFunc('gallery-detection', () => {
      const galleryIndicators = [
        // Enhanced image count indicators with quality check
        () => {
          const images = document.querySelectorAll('img');
          const significantImages = Array.from(images).filter(img => {
            const rect = img.getBoundingClientRect();
            return rect.width > 50 && rect.height > 50; // Filter small icons/avatars
          });
          return significantImages.length >= 8;
        },
        
        // Enhanced title/URL patterns with more keywords
        () => /gallery|portfolio|photos?|images?|album|collection|catalog|artwork|media|browse|search|stock|pic/i.test(document.title || ''),
        () => /gallery|portfolio|photos?|images?|album|collection|catalog|browse|search|media|pic/i.test(window.location.pathname),
        
        // Enhanced DOM structure patterns
        () => document.querySelector([
          '[class*="gallery"]', '[class*="portfolio"]', '[class*="photo"]', 
          '[class*="image-grid"]', '[class*="grid"]', '[class*="masonry"]',
          '[class*="thumbnail"]', '[class*="tile"]', '[class*="card-grid"]',
          '[class*="media-grid"]', '[class*="asset-grid"]'
        ].join(', ')) !== null,
        
        () => document.querySelector([
          '[data-gallery]', '[data-portfolio]', '[data-photos]', '[data-grid]',
          '[data-masonry]', '[data-lightbox]', '[data-fancybox]', '[data-photoswipe]'
        ].join(', ')) !== null,
        
        // E-commerce and marketplace patterns
        () => document.querySelector([
          '.product-grid', '.product-list', '.products', '[class*="product-item"]',
          '.listing-grid', '.search-results', '.browse-grid', '.category-grid'
        ].join(', ')) !== null,
        
        // Social media and content platforms
        () => document.querySelector([
          '[role="grid"] img', '.photo-grid', '.image-grid', '.content-grid',
          '.feed img', '.timeline img', '.posts img', '.cards img'
        ].join(', ')) !== null,
        
        // Advanced lazy loading and modern patterns
        () => document.querySelectorAll([
          '[data-src]', '[data-lazy]', '[loading="lazy"]', '[data-srcset]',
          'img[src*="placeholder"]', 'img[src*="loading"]'
        ].join(', ')).length >= 5,
        
        // Stock photo and professional sites patterns
        () => {
          const professionalIndicators = [
            'stock', 'premium', 'royalty', 'license', 'download', 'resolution',
            'watermark', 'preview', 'comp', 'editorial', 'commercial'
          ];
          const text = (document.title + ' ' + document.body.textContent).toLowerCase();
          return professionalIndicators.some(indicator => text.includes(indicator));
        },
        
        // Pagination indicators (suggests image browsing)
        () => document.querySelector([
          '.pagination', '.page-numbers', '[class*="pager"]', '.load-more',
          '[aria-label*="next"]', '[aria-label*="page"]', '.infinite-scroll'
        ].join(', ')) !== null,
        
        // Image container patterns
        () => {
          const containers = document.querySelectorAll([
            'figure', '.figure', '.image-container', '.photo-container',
            '.thumbnail-container', '.media-container'
          ].join(', '));
          return containers.length >= 6;
        }
      ];
    
      isGalleryPage = galleryIndicators.some(indicator => {
        try {
          return indicator();
        } catch (_error) {
          return false;
        }
      });
    
      galleryDetectionCache = isGalleryPage;
      console.log(`📊 Gallery detection result: ${isGalleryPage ? 'Gallery page detected' : 'Not a gallery page'}`);
      return isGalleryPage;
    }, { url: window.location.href });
  }
  
  // Cached selector system for performance
  class SelectorCache {
    constructor() {
      this.cache = new Map();
      this.sitePatterns = new Map();
      this.maxCacheSize = 100;
    }
    
    getCachedSelector(key) {
      const cached = this.cache.get(key);
      if (cached && cached.timestamp > Date.now() - 300000) { // 5 minute cache
        return cached.selectors;
      }
      return null;
    }
    
    setCachedSelector(key, selectors) {
      if (this.cache.size >= this.maxCacheSize) {
        // Remove oldest entries
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
      
      this.cache.set(key, {
        selectors,
        timestamp: Date.now()
      });
    }
    
    getSiteKey() {
      return `${window.location.hostname}_${window.location.pathname.split('/')[1] || 'root'}`;
    }
  }
  
  const selectorCacheInstance = new SelectorCache();
  
  // Ensure scraper module is loaded using content-script-context import
  async function ensureScraperLoaded() {
    if (window.runScrape) {
      return; // Already loaded
    }
    
    try {
      // Use content-script-context import to avoid isolated world issues
      const scraperModule = await import(chrome.runtime.getURL('content/scraper.js'));
      
      // Set window.runScrape from the imported module
      if (scraperModule.runScrape) {
        window.runScrape = scraperModule.runScrape;
      }
      
      // Also expose other key functions from scraper module if they exist
      if (scraperModule.extractImagesFromPage) {
        window.extractImagesFromPage = scraperModule.extractImagesFromPage;
      }
      if (scraperModule.handlePagination) {
        window.handlePagination = scraperModule.handlePagination;
      }
      
      if (!window.runScrape) {
        throw new Error('runScrape function not available after importing scraper module');
      }
      
      console.log('✅ Core scraper module loaded successfully via content-script import');
    } catch (error) {
      console.error('❌ Failed to load core scraper module via import:', error);
      throw error;
    }
  }
  
  // Load enhanced modules only when gallery is detected or explicitly requested
  async function loadEnhancedModules(force = false) {
    if (enhancedModulesLoaded) {return;}
    
    // Only load on gallery pages unless forced
    if (!force && !detectGalleryPage()) {
      console.log('⏭️ Skipping enhanced module loading - not a gallery page');
      return;
    }
    
    try {
      console.log('🚀 Loading enhanced modules for gallery page...');
      
      // Load modules with priority order (most critical first)
      const moduleLoaders = [
        // Phase 1 modules - Core enhanced functionality
        {
          name: 'Adaptive Selector System', 
          url: 'content/adaptive-selector-system.js',
          init: initializeEnhancedSelectorSystem,
          priority: 1
        },
        {
          name: 'Advanced Extractor',
          url: 'content/advanced-extractor.js',
          init: null,
          priority: 1
        },
        {
          name: 'Dynamic Content Observer',
          url: 'content/dynamic-content-observer.js',
          init: null,
          priority: 1
        },
        {
          name: 'Adaptive Selector System',
          url: 'content/adaptive-selector-system.js',
          init: null,
          priority: 1
        },
        {
          name: 'Infinite Scroll Handler',
          url: 'content/infinite-scroll-handler.js',
          init: null,
          priority: 1
        },
        {
          name: 'Comprehensive Validation',
          url: 'content/comprehensive-validation.js',
          init: null,
          priority: 1
        },
        {
          name: 'Network Interceptor',
          url: 'content/network-interceptor.js',
          init: null,
          priority: 1
        },
        {
          name: 'CSS Background Extractor',
          url: 'content/css-background-extractor.js',
          init: null,
          priority: 1
        },
        {
          name: 'Enhanced Integration Manager',
          url: 'content/enhanced-integration-manager.js',
          init: null,
          priority: 1
        },
        
        {
          name: 'Production Monitor',
          url: 'content/production-monitor.js',
          init: initializeProductionMonitor,
          priority: 1
        },
        {
          name: 'Enhanced Scraper Utils',
          url: 'content/enhanced-scraper-utils.js',
          init: null,
          priority: 1
        },
        {
          name: 'Enhanced Pagination Handler',
          url: 'content/enhanced-pagination-handler.js',
          init: initializeEnhancedPaginationHandler,
          priority: 1
        },
        {
          name: 'Scraper Integration',
          url: 'content/scraper-integration.js',
          init: initializeScraperIntegration,
          priority: 1
        },
        
        },
        {
          name: 'Advanced Export System',
          url: 'content/advanced-export-system.js',
          init: null,
          priority: 2
        },
        {
          name: 'Enterprise Integration Core (Phases 2-4)',
          url: 'content/enterprise-integration-core.js',
          init: initializeEnterpriseIntegration,
          priority: 2
        },
        
        },
        {
          name: 'Intelligent Caching System',
          url: 'content/intelligent-caching-system.js',
          init: null,
          priority: 2
        },
        {
          name: 'Adaptive Resource Manager',
          url: 'content/adaptive-resource-manager.js',
          init: null,
          priority: 2
        },
        
        // Lower priority modules
